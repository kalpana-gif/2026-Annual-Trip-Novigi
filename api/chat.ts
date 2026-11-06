import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleNodeChat } from '../server/node-handler.ts'
import { getHostedChatStore } from '../server/postgres.ts'

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  await handleNodeChat(request, response, getHostedChatStore)
}
