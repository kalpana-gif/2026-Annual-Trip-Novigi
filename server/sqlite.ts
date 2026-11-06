import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { CHAT_PAGE_SIZE, DELETED_MESSAGE } from '../src/lib/chat.ts'
import type { ChatMessage, ChatSubmission } from '../src/lib/chat.ts'
import { ChatError, pageOf, RATE_LIMIT } from './chat.ts'
import type { ChatQuery, ChatStore } from './chat.ts'

export function createSqliteStore(filename: string): ChatStore & { close(): void } {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true })
  const db = new DatabaseSync(filename)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL UNIQUE,
      visitor_id TEXT NOT NULL,
      name TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      reply_to INTEGER REFERENCES chat_messages(id)
    );
    CREATE INDEX IF NOT EXISTS chat_messages_visitor_time ON chat_messages(visitor_id, created_at);
    CREATE TABLE IF NOT EXISTS chat_deletions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL UNIQUE REFERENCES chat_messages(id)
    );
  `)
  const select = `SELECT m.id, m.visitor_id AS visitorId, m.name, m.body, m.created_at AS createdAt,
    d.id AS deletionId, r.id AS replyId, r.name AS replyName, substr(r.body, 1, 160) AS replyBody, rd.id AS replyDeletionId
    FROM chat_messages m LEFT JOIN chat_messages r ON r.id = m.reply_to
    LEFT JOIN chat_deletions d ON d.message_id = m.id LEFT JOIN chat_deletions rd ON rd.message_id = r.id`
  const toMessage = (row: Record<string, unknown>, visitorId?: string): ChatMessage => ({
    id: Number(row.id), name: String(row.name), body: row.deletionId ? DELETED_MESSAGE : String(row.body), createdAt: String(row.createdAt),
    deleted: !!row.deletionId, canDelete: !row.deletionId && row.visitorId === visitorId,
    replyTo: !row.deletionId && row.replyId ? { id: Number(row.replyId), name: String(row.replyName), body: row.replyDeletionId ? DELETED_MESSAGE : String(row.replyBody), deleted: !!row.replyDeletionId } : null,
  })
  return {
    async list(query: ChatQuery, visitorId?: string) {
      const rows = query.after
        ? db.prepare(`${select} WHERE m.id > ? ORDER BY m.id ASC LIMIT ?`).all(query.after, CHAT_PAGE_SIZE + 1)
        : db.prepare(`${select} WHERE m.id < ? ORDER BY m.id DESC LIMIT ?`).all(query.before ?? Number.MAX_SAFE_INTEGER, CHAT_PAGE_SIZE + 1)
      const deletions = db.prepare('SELECT id, message_id AS messageId FROM chat_deletions WHERE id > ? ORDER BY id ASC LIMIT ?').all(query.deletionsAfter ?? 0, CHAT_PAGE_SIZE + 1)
      return pageOf(rows.map(row => toMessage(row, visitorId)), query, deletions.map(row => ({ id: Number(row.id), messageId: Number(row.messageId) })))
    },
    async create(message: ChatSubmission) {
      db.exec('BEGIN IMMEDIATE')
      try {
        const existing = db.prepare('SELECT id, visitor_id FROM chat_messages WHERE request_id = ?').get(message.requestId)
        if (existing && existing.visitor_id !== message.visitorId) throw new ChatError('Please refresh and try again.', 409)
        if (existing) {
          const saved = toMessage(db.prepare(`${select} WHERE m.id = ?`).get(existing.id)!, message.visitorId)
          db.exec('COMMIT')
          return saved
        }
        const recent = db.prepare('SELECT COUNT(*) AS count FROM chat_messages WHERE visitor_id = ? AND created_at > ?').get(message.visitorId, new Date(Date.now() - 60000).toISOString())!
        if (Number(recent.count) >= RATE_LIMIT) throw new ChatError('A little breather! Please wait a minute before sending more messages.', 429)
        if (message.replyTo && !db.prepare('SELECT id FROM chat_messages WHERE id = ? AND id NOT IN (SELECT message_id FROM chat_deletions)').get(message.replyTo)) throw new ChatError('That message is no longer available. Try a new message.', 404)
        const result = db.prepare('INSERT INTO chat_messages (request_id, visitor_id, name, body, created_at, reply_to) VALUES (?, ?, ?, ?, ?, ?)').run(message.requestId, message.visitorId, message.name, message.body, new Date().toISOString(), message.replyTo)
        const saved = toMessage(db.prepare(`${select} WHERE m.id = ?`).get(result.lastInsertRowid)!, message.visitorId)
        db.exec('COMMIT')
        return saved
      } catch (error) { db.exec('ROLLBACK'); throw error }
    },
    async remove(id: number, visitorId: string) {
      db.exec('BEGIN IMMEDIATE')
      try {
        const existing = db.prepare('SELECT visitor_id FROM chat_messages WHERE id = ?').get(id)
        if (!existing || existing.visitor_id !== visitorId) throw new ChatError('You can only delete messages sent from this browser.', 403)
        // Keep the row and request key for replies and safe retries, but erase its text.
        db.prepare('UPDATE chat_messages SET body = ?, reply_to = NULL WHERE id = ?').run(DELETED_MESSAGE, id)
        db.prepare('INSERT OR IGNORE INTO chat_deletions (message_id) VALUES (?)').run(id)
        const saved = toMessage(db.prepare(`${select} WHERE m.id = ?`).get(id)!, visitorId)
        db.exec('COMMIT')
        return saved
      } catch (error) { db.exec('ROLLBACK'); throw error }
    },
    close() { db.close() },
  }
}
