export const chatSchema = `
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  request_id UUID NOT NULL UNIQUE,
  visitor_id UUID NOT NULL,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 40),
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reply_to INTEGER REFERENCES chat_messages(id)
);
CREATE INDEX IF NOT EXISTS chat_messages_visitor_time ON chat_messages(visitor_id, created_at);
CREATE TABLE IF NOT EXISTS chat_deletions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL UNIQUE REFERENCES chat_messages(id)
);
`
