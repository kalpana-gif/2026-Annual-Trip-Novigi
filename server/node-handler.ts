import type { IncomingMessage, ServerResponse } from 'node:http'
import { ChatError, handleChatRequest, jsonResponse, MAX_REQUEST_BYTES } from './chat.ts'
import type { ChatStore } from './chat.ts'

export async function handleNodeChat(req: IncomingMessage & { body?: unknown }, res: ServerResponse, getStore: () => Promise<ChatStore>) {
  let response: Response
  try {
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
    }
    let body: string | undefined
    if (req.method === 'POST' || req.method === 'DELETE') {
      if (Number(req.headers['content-length']) > MAX_REQUEST_BYTES) throw new ChatError('That message is too large.', 413)
      // Vercel may parse JSON before invoking a function; Vite passes a raw stream.
      if (req.body !== undefined) body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
      else {
        const chunks: Buffer[] = []
        let size = 0
        for await (const chunk of req) {
          size += Buffer.byteLength(chunk)
          if (size > MAX_REQUEST_BYTES) throw new ChatError('That message is too large.', 413)
          chunks.push(Buffer.from(chunk))
        }
        body = Buffer.concat(chunks).toString('utf8')
      }
      if (Buffer.byteLength(body ?? '') > MAX_REQUEST_BYTES) throw new ChatError('That message is too large.', 413)
    }
    const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'
    const request = new Request(`${protocol}://${req.headers.host}${req.url}`, { method: req.method, headers, body })
    response = await handleChatRequest(request, getStore)
  } catch (error) {
    response = jsonResponse({ error: error instanceof ChatError ? error.message : 'The chat couldn’t read that request. Please try again.' }, error instanceof ChatError ? error.status : 400)
  }
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  res.end(await response.text())
}
