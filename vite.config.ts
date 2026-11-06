import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tripChatPlugin } from './server/dev-plugin'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.DATABASE_URL) process.env.DATABASE_URL = env.DATABASE_URL
  if (env.CHAT_DEV_DB_PATH) process.env.CHAT_DEV_DB_PATH = env.CHAT_DEV_DB_PATH
  return { plugins: [react(), tailwindcss(), tripChatPlugin()] }
})
