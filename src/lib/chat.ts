export const CHAT_NAME_LIMIT = 40
export const CHAT_MESSAGE_LIMIT = 500
export const CHAT_PAGE_SIZE = 40
export const DELETED_MESSAGE = 'Message deleted'

export interface ChatMessage {
  id: number
  name: string
  body: string
  createdAt: string
  deleted: boolean
  canDelete: boolean
  replyTo: { id: number; name: string; body: string; deleted: boolean } | null
}

export interface ChatPage {
  messages: ChatMessage[]
  hasMore: boolean
  deletedIds: number[]
  deletionCursor: number
  hasMoreDeletions: boolean
}

export interface ChatSubmission {
  requestId: string
  visitorId: string
  name: string
  body: string
  replyTo: number | null
}

export function validateChatText(name: string, body: string) {
  if (!name.trim()) return 'Add your name so everyone knows who’s chatting.'
  if (name.trim().length > CHAT_NAME_LIMIT) return `Keep your name within ${CHAT_NAME_LIMIT} characters.`
  if (!body.trim()) return 'Write a little something before sending.'
  if (body.trim().length > CHAT_MESSAGE_LIMIT) return `Keep your message within ${CHAT_MESSAGE_LIMIT} characters.`
  return null
}

export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[], deletedIds: Iterable<number> = []) {
  // A delayed poll or history response must never restore deleted text or quotes.
  const deleted = new Set(deletedIds)
  for (const message of [...current, ...incoming]) {
    if (message.deleted) deleted.add(message.id)
    if (message.replyTo?.deleted) deleted.add(message.replyTo.id)
  }
  return [...new Map([...current, ...incoming].map(message => [message.id, message])).values()]
    .map(message => deleted.has(message.id)
      ? { ...message, body: DELETED_MESSAGE, deleted: true, canDelete: false, replyTo: null }
      : message.replyTo && deleted.has(message.replyTo.id)
        ? { ...message, replyTo: { ...message.replyTo, body: DELETED_MESSAGE, deleted: true } }
        : message)
    .sort((a, b) => a.id - b.id)
}

export function initials(name: string) {
  return name.trim().split(/\s+/u).slice(0, 2).map(word => Array.from(word)[0]).join('').toLocaleUpperCase()
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...options, signal: options.signal ?? AbortSignal.timeout(12000) })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data) throw new Error(data?.error || 'The chat couldn’t connect. Please try again in a moment.')
  return data as T
}

export function fetchChatPage(query: { before?: number; after?: number; deletionsAfter?: number }, visitorId: string, signal?: AbortSignal) {
  const params = new URLSearchParams()
  if (query.before) params.set('before', String(query.before))
  if (query.after) params.set('after', String(query.after))
  if (query.deletionsAfter) params.set('deletionsAfter', String(query.deletionsAfter))
  return request<ChatPage>(`/api/chat?${params}`, { signal, headers: { 'X-Chat-Visitor': visitorId } })
}

export function deleteChatMessage(id: number, visitorId: string) {
  return request<ChatMessage>('/api/chat', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, visitorId }),
  })
}

export function sendChatMessage(submission: ChatSubmission) {
  return request<ChatMessage>('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission),
  })
}
