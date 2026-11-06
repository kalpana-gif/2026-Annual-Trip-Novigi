import { CHAT_PAGE_SIZE, validateChatText } from '../src/lib/chat.ts'
import type { ChatMessage, ChatPage, ChatSubmission } from '../src/lib/chat.ts'

export const MAX_REQUEST_BYTES = 4096
export const RATE_LIMIT = 12
export interface ChatQuery { before?: number; after?: number; deletionsAfter?: number }
export interface ChatStore {
  list(query: ChatQuery, visitorId?: string): Promise<ChatPage>
  create(message: ChatSubmission): Promise<ChatMessage>
  remove(id: number, visitorId: string): Promise<ChatMessage>
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parseVisitorId(value: unknown): string {
  if (typeof value !== 'string' || !uuid.test(value)) throw new ChatError('Use the browser you sent this message from.', 403)
  return value.toLowerCase()
}

function parseDeletion(input: unknown) {
  if (!input || typeof input !== 'object') throw new ChatError('Choose a message to delete.')
  const value = input as Record<string, unknown>
  if (typeof value.id !== 'number' || !Number.isSafeInteger(value.id) || value.id <= 0 || value.id > 2147483647) throw new ChatError('Choose a valid message to delete.')
  return { id: value.id, visitorId: parseVisitorId(value.visitorId) }
}

export class ChatError extends Error {
  status: number
  constructor(message: string, status = 400) { super(message); this.status = status }
}

export function parseSubmission(input: unknown): ChatSubmission {
  if (!input || typeof input !== 'object') throw new ChatError('Please send a name and a message.')
  const value = input as Record<string, unknown>
  if (typeof value.name !== 'string' || typeof value.body !== 'string') throw new ChatError('Please send a name and a message.')
  const name = value.name.trim()
  const body = value.body.trim()
  const error = validateChatText(name, body)
  if (error) throw new ChatError(error)
  if (/[\p{Cc}\p{Cf}]/u.test(name) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(body)) throw new ChatError('Please remove special control characters from your message or name.')
  if (typeof value.requestId !== 'string' || !uuid.test(value.requestId) || typeof value.visitorId !== 'string' || !uuid.test(value.visitorId)) throw new ChatError('Please refresh the page and try sending again.')
  if (value.replyTo !== null && value.replyTo !== undefined && (typeof value.replyTo !== 'number' || !Number.isSafeInteger(value.replyTo) || value.replyTo <= 0 || value.replyTo > 2147483647)) throw new ChatError('That reply isn’t valid. Try a new message.')
  return { name, body, requestId: value.requestId.toLowerCase(), visitorId: value.visitorId.toLowerCase(), replyTo: (value.replyTo as number | null) ?? null }
}

export function parseQuery(url: URL): ChatQuery {
  const query: ChatQuery = {}
  for (const key of ['before', 'after', 'deletionsAfter'] as const) {
    const value = url.searchParams.get(key)
    if (value !== null) {
      if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0 || Number(value) > 2147483647) throw new ChatError('That message page isn’t valid.')
      query[key] = Number(value)
    }
  }
  if (query.before && query.after) throw new ChatError('Choose earlier or newer messages, not both.')
  return query
}

export function pageOf(rows: ChatMessage[], query: ChatQuery, deletions: { id: number; messageId: number }[] = []): ChatPage {
  const messages = rows.slice(0, CHAT_PAGE_SIZE)
  const changes = deletions.slice(0, CHAT_PAGE_SIZE)
  if (!query.after) messages.reverse()
  return { messages, hasMore: rows.length > CHAT_PAGE_SIZE, deletedIds: changes.map(change => change.messageId), deletionCursor: changes.at(-1)?.id ?? query.deletionsAfter ?? 0, hasMoreDeletions: deletions.length > CHAT_PAGE_SIZE }
}

export function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(status === 429 ? { 'Retry-After': '60' } : {}) } })
}

async function readJson(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new ChatError('Please send your message as JSON.', 415)
  if (Number(request.headers.get('content-length')) > MAX_REQUEST_BYTES) throw new ChatError('That message is too large.', 413)
  const reader = request.body?.getReader()
  if (!reader) throw new ChatError('Your message is empty.')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_REQUEST_BYTES) { await reader.cancel(); throw new ChatError('That message is too large.', 413) }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const data = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength }
  try { return JSON.parse(new TextDecoder().decode(data)) as unknown }
  catch { throw new ChatError('We couldn’t read that message. Please try again.') }
}

export async function handleChatRequest(request: Request, getStore: () => Promise<ChatStore>): Promise<Response> {
  try {
    const url = new URL(request.url)
    if (request.method === 'GET') {
      const visitor = request.headers.get('x-chat-visitor')
      return jsonResponse(await (await getStore()).list(parseQuery(url), visitor ? parseVisitorId(visitor) : undefined))
    }
    if (request.method !== 'POST' && request.method !== 'DELETE') return new Response(null, { status: 405, headers: { Allow: 'GET, POST, DELETE', 'Cache-Control': 'no-store' } })
    const origin = request.headers.get('origin')
    if ((origin && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') throw new ChatError('Please send messages from the trip website.', 403)
    if (request.method === 'DELETE') {
      const deletion = parseDeletion(await readJson(request))
      return jsonResponse(await (await getStore()).remove(deletion.id, deletion.visitorId))
    }
    const submission = parseSubmission(await readJson(request))
    return jsonResponse(await (await getStore()).create(submission), 201)
  } catch (error) {
    if (error instanceof ChatError) return jsonResponse({ error: error.message }, error.status)
    console.error('Trip chat request failed:', error instanceof Error ? error.message : 'Unknown storage error')
    return jsonResponse({ error: 'The chat is temporarily unavailable. Your message is still here — please try again shortly.' }, 503)
  }
}
