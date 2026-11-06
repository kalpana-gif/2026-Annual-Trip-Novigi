import { test } from 'node:test'
import type { TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CHAT_PAGE_SIZE, DELETED_MESSAGE, mergeMessages } from '../src/lib/chat.ts'
import type { ChatSubmission } from '../src/lib/chat.ts'
import { handleChatRequest, RATE_LIMIT } from '../server/chat.ts'
import { createSqliteStore } from '../server/sqlite.ts'
import { createServer } from 'node:http'
import { handleNodeChat } from '../server/node-handler.ts'
import { DatabaseSync } from 'node:sqlite'

function submission(overrides: Partial<ChatSubmission> = {}): ChatSubmission {
  return { requestId: randomUUID(), visitorId: randomUUID(), name: 'Kalpana', body: 'Who’s bringing snacks? 🍿', replyTo: null, ...overrides }
}

function fixture(t: TestContext) {
  const store = createSqliteStore(':memory:')
  t.after(() => store.close())
  const get = async (query = '', visitorId?: string) => handleChatRequest(new Request(`https://trip.example/api/chat${query}`, { headers: visitorId ? { 'X-Chat-Visitor': visitorId } : {} }), async () => store)
  const post = async (data: unknown, headers = {}) => handleChatRequest(new Request('https://trip.example/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://trip.example', ...headers }, body: JSON.stringify(data),
  }), async () => store)
  const remove = async (data: unknown, headers = {}) => handleChatRequest(new Request('https://trip.example/api/chat', {
    method: 'DELETE', headers: { 'Content-Type': 'application/json', Origin: 'https://trip.example', ...headers }, body: JSON.stringify(data),
  }), async () => store)
  return { store, get, post, remove }
}

test('messages are shared across visitors, normalized, and include server timestamps and named reply previews', async t => {
  const { post, get } = fixture(t)
  const first = await post(submission({ name: '  Kalpana  ', body: '  Ready for the beach! 🌴  ' }))
  assert.equal(first.status, 201)
  const parent = await first.json()
  assert.equal(parent.name, 'Kalpana')
  assert.equal(parent.body, 'Ready for the beach! 🌴')
  assert.ok(Number.isFinite(Date.parse(parent.createdAt)))
  const reply = await post(submission({ name: 'Lahiru', body: 'Count me in!', replyTo: parent.id }))
  assert.equal(reply.status, 201)
  const page = await (await get()).json()
  assert.equal(page.messages.length, 2)
  assert.deepEqual(page.messages[1].replyTo, { id: parent.id, name: 'Kalpana', body: parent.body, deleted: false })
  assert.equal('visitorId' in page.messages[0], false)
  assert.equal('requestId' in page.messages[0], false)
})

test('server rejects blank or oversized names and messages, malformed IDs and missing reply targets', async t => {
  const { post, get } = fixture(t)
  for (const bad of [{ name: '' }, { name: ' \n ' }, { name: 'a'.repeat(41) }, { name: 'A\nB' }, { body: '\n  ' }, { body: 'a'.repeat(501) }, { requestId: 'bad' }, { visitorId: 'bad' }, { replyTo: -1 }, { replyTo: 1.5 }, { replyTo: 2147483648 }]) {
    assert.equal((await post(submission(bad))).status, 400, JSON.stringify(bad))
  }
  assert.equal((await post(submission({ replyTo: 999 }))).status, 404)
  assert.deepEqual((await (await get()).json()).messages, [])
})

test('retries are idempotent, including concurrent retries, and cannot reuse another visitor’s key', async t => {
  const { post, get } = fixture(t)
  const message = submission()
  const results = await Promise.all([post(message), post(message), post(message)])
  const saved = await Promise.all(results.map(result => result.json()))
  assert.ok(saved.every(result => result.id === saved[0].id))
  assert.equal((await (await get()).json()).messages.length, 1)
  assert.equal((await post({ ...message, visitorId: randomUUID() })).status, 409)
})

test('server rate limit applies per visitor and retries do not consume extra messages', async t => {
  const { post } = fixture(t)
  const visitorId = randomUUID()
  const first = submission({ visitorId })
  assert.equal((await post(first)).status, 201)
  for (let i = 1; i < RATE_LIMIT; i++) assert.equal((await post(submission({ visitorId }))).status, 201)
  assert.equal((await post(first)).status, 201)
  const limited = await post(submission({ visitorId }))
  assert.equal(limited.status, 429)
  assert.equal(limited.headers.get('Retry-After'), '60')
  assert.equal((await post(submission())).status, 201)
})

test('older history and forward polling retain all messages without duplicating or skipping boundaries', async t => {
  const { post, get } = fixture(t)
  for (let i = 0; i < CHAT_PAGE_SIZE * 2 + 3; i++) await post(submission({ body: `Message ${i}` }))
  const latest = await (await get()).json()
  assert.equal(latest.messages.length, CHAT_PAGE_SIZE)
  assert.equal(latest.hasMore, true)
  const older = await (await get(`?before=${latest.messages[0].id}`)).json()
  const oldest = await (await get(`?before=${older.messages[0].id}`)).json()
  assert.equal(oldest.hasMore, false)
  const combined = mergeMessages(mergeMessages(latest.messages, older.messages), oldest.messages)
  assert.equal(combined.length, CHAT_PAGE_SIZE * 2 + 3)
  const catchup = await (await get(`?after=${combined[0].id}`)).json()
  assert.equal(catchup.hasMore, true)
  assert.equal(catchup.messages[0].id, combined[1].id)
  assert.equal(mergeMessages(combined, catchup.messages).length, combined.length)
  const empty = await (await get(`?after=${combined.at(-1)!.id}`)).json()
  assert.deepEqual(empty, { messages: [], hasMore: false, deletedIds: [], deletionCursor: 0, hasMoreDeletions: false })
})

test('HTTP boundary rejects cross-site writes, invalid cursors, malformed or oversized bodies and unsupported methods', async t => {
  const { store, post, get } = fixture(t)
  assert.equal((await post(submission(), { Origin: 'https://other.example' })).status, 403)
  assert.equal((await post(submission(), { 'Sec-Fetch-Site': 'cross-site' })).status, 403)
  for (const query of ['?before=-1', '?after=NaN', '?before=1&after=2', '?after=999999999999']) assert.equal((await get(query)).status, 400)
  assert.equal((await post(submission(), { 'Content-Type': 'text/plain' })).status, 415)
  assert.equal((await post(submission({ body: 'x'.repeat(5000) }))).status, 413)
  const malformed = new Request('https://trip.example/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })
  assert.equal((await handleChatRequest(malformed, async () => store)).status, 400)
  const unsupported = await handleChatRequest(new Request('https://trip.example/api/chat', { method: 'PATCH' }), async () => store)
  assert.equal(unsupported.status, 405)
  assert.equal(unsupported.headers.get('Allow'), 'GET, POST, DELETE')
  assert.equal((await get()).headers.get('Cache-Control'), 'no-store')
})

test('development messages persist when the store is reopened', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'novigi-chat-'))
  const filename = join(directory, 'chat.sqlite')
  try {
    let store = createSqliteStore(filename)
    const input = submission()
    const message = await store.create(input)
    store.close()
    store = createSqliteStore(filename)
    assert.deepEqual((await store.list({}, input.visitorId)).messages, [message])
    store.close()
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

test('only the sending browser can delete, even when another visitor uses the same name', async t => {
  const { post, get, remove } = fixture(t)
  const owner = submission()
  const other = submission({ name: owner.name })
  const message = await (await post(owner)).json()
  await post(other)
  assert.equal((await (await get('', owner.visitorId)).json()).messages[0].canDelete, true)
  assert.equal((await (await get('', other.visitorId)).json()).messages[0].canDelete, false)
  assert.equal((await (await get()).json()).messages[0].canDelete, false)
  assert.equal((await remove({ id: message.id, visitorId: other.visitorId })).status, 403)
  assert.equal((await remove({ id: message.id, visitorId: owner.requestId })).status, 403)
  assert.equal((await (await get()).json()).messages[0].body, owner.body)
  const result = await remove({ id: message.id, visitorId: owner.visitorId })
  assert.equal(result.status, 200)
  const deleted = await result.json()
  assert.equal(deleted.deleted, true)
  assert.equal(deleted.canDelete, false)
  assert.equal(deleted.body, DELETED_MESSAGE)
  assert.equal('visitorId' in deleted, false)
})

test('deletion clears quotes, prevents new replies, and survives both delete and send retries', async t => {
  const { post, get, remove } = fixture(t)
  const input = submission()
  const parent = await (await post(input)).json()
  const reply = await (await post(submission({ replyTo: parent.id }))).json()
  const deletion = { id: parent.id, visitorId: input.visitorId }
  for (const result of await Promise.all([remove(deletion), remove(deletion)])) assert.equal(result.status, 200)
  const page = await (await get()).json()
  assert.equal(page.messages[0].body, DELETED_MESSAGE)
  assert.equal(page.messages[1].replyTo.body, DELETED_MESSAGE)
  assert.equal(page.messages[1].replyTo.deleted, true)
  assert.equal(page.messages[1].body, reply.body)
  assert.deepEqual(page.deletedIds, [parent.id])
  assert.equal((await post(submission({ replyTo: parent.id }))).status, 404)
  assert.equal((await (await post(input)).json()).deleted, true)
  assert.equal((await (await get()).json()).messages.length, 2)
  const noChanges = await (await get(`?after=${reply.id}&deletionsAfter=${page.deletionCursor}`)).json()
  assert.deepEqual(noChanges.deletedIds, [])
})

test('forward polls receive older deletions with bounded catch-up independent of message order', async t => {
  const { store } = fixture(t)
  const saved = []
  for (let i = 0; i < CHAT_PAGE_SIZE + 2; i++) {
    const input = submission()
    saved.push({ input, message: await store.create(input) })
  }
  const after = saved.at(-1)!.message.id
  for (const { input, message } of [...saved].reverse()) await store.remove(message.id, input.visitorId)
  const first = await store.list({ after })
  assert.deepEqual(first.messages, [])
  assert.equal(first.deletedIds.length, CHAT_PAGE_SIZE)
  assert.equal(first.hasMoreDeletions, true)
  const second = await store.list({ after, deletionsAfter: first.deletionCursor })
  assert.equal(second.hasMoreDeletions, false)
  assert.deepEqual([...first.deletedIds, ...second.deletedIds], saved.map(item => item.message.id).reverse())
})

test('stale polls and history never restore a deleted message or its quoted text', async t => {
  const { store } = fixture(t)
  const input = submission()
  const parent = await store.create(input)
  const reply = await store.create(submission({ replyTo: parent.id }))
  const deleted = await store.remove(parent.id, input.visitorId)
  const current = mergeMessages([parent, reply], [deleted])
  const lateHistory = mergeMessages(current, [parent, reply])
  assert.equal(lateHistory[0].body, DELETED_MESSAGE)
  assert.equal(lateHistory[0].canDelete, false)
  assert.equal(lateHistory[1].replyTo?.body, DELETED_MESSAGE)
  assert.equal(mergeMessages([], [reply], [parent.id])[0].replyTo?.deleted, true)
})

test('DELETE validates ownership, identifiers, origins and request bodies before modifying data', async t => {
  const { post, get, remove } = fixture(t)
  const input = submission()
  const message = await (await post(input)).json()
  const valid = { id: message.id, visitorId: input.visitorId }
  for (const id of [null, '1', -1, 0, 1.5, 2147483648]) assert.equal((await remove({ ...valid, id })).status, 400)
  for (const visitorId of [null, '', 'bad']) assert.equal((await remove({ ...valid, visitorId })).status, 403)
  assert.equal((await remove(valid, { Origin: 'https://other.example' })).status, 403)
  assert.equal((await remove(valid, { 'Sec-Fetch-Site': 'cross-site' })).status, 403)
  assert.equal((await remove(valid, { 'Content-Type': 'text/plain' })).status, 415)
  assert.equal((await remove({ ...valid, extra: 'x'.repeat(5000) })).status, 413)
  assert.equal((await get('?deletionsAfter=-1')).status, 400)
  assert.equal((await get('', 'bad')).status, 403)
  assert.equal((await (await get()).json()).messages[0].deleted, false)
})

test('existing development databases gain deletion support and retain ownership across restarts', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'novigi-chat-migration-'))
  const filename = join(directory, 'chat.sqlite')
  const input = submission()
  const old = new DatabaseSync(filename)
  old.exec('CREATE TABLE chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL UNIQUE, visitor_id TEXT NOT NULL, name TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL, reply_to INTEGER REFERENCES chat_messages(id))')
  old.prepare('INSERT INTO chat_messages (request_id, visitor_id, name, body, created_at) VALUES (?, ?, ?, ?, ?)').run(input.requestId, input.visitorId, input.name, input.body, new Date().toISOString())
  old.close()
  try {
    let store = createSqliteStore(filename)
    const message = (await store.list({}, input.visitorId)).messages[0]
    assert.equal(message.canDelete, true)
    assert.equal(message.body, input.body)
    await store.remove(message.id, input.visitorId)
    store.close()
    store = createSqliteStore(filename)
    assert.equal((await store.list({})).messages[0].body, DELETED_MESSAGE)
    assert.deepEqual((await store.list({})).deletedIds, [message.id])
    store.close()
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

test('Node adapter accepts real streamed requests and returns shared data to another client', async t => {
  const { store } = fixture(t)
  const server = createServer((req, res) => { void handleNodeChat(req, res, async () => store) })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections() }))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const url = `http://127.0.0.1:${address.port}/api/chat`
  const input = submission()
  const headers = { 'Content-Type': 'application/json', Origin: `http://127.0.0.1:${address.port}` }
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(input) })
  assert.equal(response.status, 201)
  const list = await (await fetch(url)).json()
  assert.equal(list.messages.length, 1)
  assert.equal(list.messages[0].name, 'Kalpana')
  const deleted = await fetch(url, { method: 'DELETE', headers, body: JSON.stringify({ id: list.messages[0].id, visitorId: input.visitorId }) })
  assert.equal(deleted.status, 200)
  assert.equal((await deleted.json()).deleted, true)
  assert.deepEqual((await (await fetch(`${url}?after=${list.messages[0].id}`)).json()).deletedIds, [list.messages[0].id])
})
