import pg from 'pg'
import { CHAT_PAGE_SIZE, DELETED_MESSAGE } from '../src/lib/chat.ts'
import type { ChatMessage, ChatSubmission } from '../src/lib/chat.ts'
import { ChatError, pageOf, RATE_LIMIT } from './chat.ts'
import type { ChatQuery, ChatStore } from './chat.ts'

const select = `SELECT m.id, m.visitor_id, m.name, m.body, m.created_at, d.id AS deletion_id,
  r.id AS reply_id, r.name AS reply_name, LEFT(r.body, 160) AS reply_body, rd.id AS reply_deletion_id
  FROM chat_messages m LEFT JOIN chat_messages r ON r.id = m.reply_to
  LEFT JOIN chat_deletions d ON d.message_id = m.id LEFT JOIN chat_deletions rd ON rd.message_id = r.id`

function toMessage(row: pg.QueryResultRow, visitorId?: string): ChatMessage {
  return {
    id: row.id, name: row.name, body: row.deletion_id ? DELETED_MESSAGE : row.body, createdAt: new Date(row.created_at).toISOString(),
    deleted: !!row.deletion_id, canDelete: !row.deletion_id && row.visitor_id === visitorId,
    replyTo: !row.deletion_id && row.reply_id ? { id: row.reply_id, name: row.reply_name, body: row.reply_deletion_id ? DELETED_MESSAGE : row.reply_body, deleted: !!row.reply_deletion_id } : null,
  }
}

export function createPostgresStore(pool: pg.Pool): ChatStore {
  return {
    async list(query: ChatQuery, visitorId?: string) {
      const result = query.after
        ? await pool.query(`${select} WHERE m.id > $1 ORDER BY m.id ASC LIMIT $2`, [query.after, CHAT_PAGE_SIZE + 1])
        : await pool.query(`${select} WHERE m.id < $1 ORDER BY m.id DESC LIMIT $2`, [query.before ?? 2147483647, CHAT_PAGE_SIZE + 1])
      const deletions = await pool.query('SELECT id, message_id FROM chat_deletions WHERE id > $1 ORDER BY id ASC LIMIT $2', [query.deletionsAfter ?? 0, CHAT_PAGE_SIZE + 1])
      return pageOf(result.rows.map(row => toMessage(row, visitorId)), query, deletions.rows.map(row => ({ id: row.id, messageId: row.message_id })))
    },
    async create(message: ChatSubmission) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        // One small trip chat: serialize writes so IDs follow commit order and polling
        // cannot miss a slower concurrent insert. This also makes limits and retries atomic.
        await client.query('SELECT pg_advisory_xact_lock(20261113)')
        const existing = await client.query('SELECT id, visitor_id FROM chat_messages WHERE request_id = $1', [message.requestId])
        if (existing.rows[0] && existing.rows[0].visitor_id !== message.visitorId) throw new ChatError('Please refresh and try again.', 409)
        if (existing.rows[0]) {
          const saved = await client.query(`${select} WHERE m.id = $1`, [existing.rows[0].id])
          await client.query('COMMIT')
          return toMessage(saved.rows[0], message.visitorId)
        }
        const recent = await client.query("SELECT COUNT(*) FROM chat_messages WHERE visitor_id = $1 AND created_at > NOW() - INTERVAL '1 minute'", [message.visitorId])
        if (Number(recent.rows[0].count) >= RATE_LIMIT) throw new ChatError('A little breather! Please wait a minute before sending more messages.', 429)
        if (message.replyTo) {
          const parent = await client.query('SELECT id FROM chat_messages WHERE id = $1 AND id NOT IN (SELECT message_id FROM chat_deletions)', [message.replyTo])
          if (!parent.rowCount) throw new ChatError('That message is no longer available. Try a new message.', 404)
        }
        const inserted = await client.query('INSERT INTO chat_messages (request_id, visitor_id, name, body, reply_to) VALUES ($1, $2, $3, $4, $5) RETURNING id', [message.requestId, message.visitorId, message.name, message.body, message.replyTo])
        const result = await client.query(`${select} WHERE m.id = $1`, [inserted.rows[0].id])
        await client.query('COMMIT')
        return toMessage(result.rows[0], message.visitorId)
      } catch (error) { await client.query('ROLLBACK'); throw error }
      finally { client.release() }
    },
    async remove(id: number, visitorId: string) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        // Use the same lock as inserts so deletion cursors also follow commit order.
        await client.query('SELECT pg_advisory_xact_lock(20261113)')
        const existing = await client.query('SELECT visitor_id FROM chat_messages WHERE id = $1', [id])
        if (!existing.rows[0] || existing.rows[0].visitor_id !== visitorId) throw new ChatError('You can only delete messages sent from this browser.', 403)
        await client.query('UPDATE chat_messages SET body = $1, reply_to = NULL WHERE id = $2', [DELETED_MESSAGE, id])
        await client.query('INSERT INTO chat_deletions (message_id) VALUES ($1) ON CONFLICT (message_id) DO NOTHING', [id])
        const saved = await client.query(`${select} WHERE m.id = $1`, [id])
        await client.query('COMMIT')
        return toMessage(saved.rows[0], visitorId)
      } catch (error) { await client.query('ROLLBACK'); throw error }
      finally { client.release() }
    },
  }
}

let store: ChatStore | undefined
export async function getHostedChatStore() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured for trip chat.')
  store ??= createPostgresStore(new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000, allowExitOnIdle: true }))
  return store
}
