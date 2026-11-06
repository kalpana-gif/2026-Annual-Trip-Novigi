import pg from 'pg'
import { chatSchema } from './schema.ts'

if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env.local before running npm run chat:setup.')
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 })
try {
  await pool.query(chatSchema)
  console.log('Trip chat database is ready.')
} finally { await pool.end() }
