import { resolve } from 'node:path'
import type { Plugin, PreviewServer, ViteDevServer } from 'vite'
import { handleNodeChat } from './node-handler.ts'
import { getHostedChatStore } from './postgres.ts'
import type { ChatStore } from './chat.ts'

export function tripChatPlugin(): Plugin {
  let local: (ChatStore & { close(): void }) | undefined
  let storePromise: Promise<ChatStore> | undefined
  function getStore() {
    if (process.env.DATABASE_URL) return getHostedChatStore()
    storePromise ??= import('./sqlite.ts').then(({ createSqliteStore }) => {
      local = createSqliteStore(resolve(process.env.CHAT_DEV_DB_PATH || '.data/trip-chat.sqlite'))
      return local
    })
    return storePromise
  }
  const configure = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use((req, res, next) => {
      if (req.url?.split('?')[0] !== '/api/chat') return next()
      void handleNodeChat(req, res, getStore)
    })
    server.httpServer?.once('close', () => { local?.close() })
  }
  return { name: 'trip-chat-api', configureServer: configure, configurePreviewServer: configure }
}
