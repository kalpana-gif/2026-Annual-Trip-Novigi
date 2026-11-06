import { handleChatRequest } from '../../server/chat.ts'
import { getHostedChatStore } from '../../server/postgres.ts'

export default async function handler(request: Request) {
  return handleChatRequest(request, getHostedChatStore)
}

export const config = { path: '/api/chat' }
