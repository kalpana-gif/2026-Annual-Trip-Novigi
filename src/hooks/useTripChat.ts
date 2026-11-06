import { useEffect, useRef, useState } from 'react'
import { fetchChatPage, mergeMessages } from '../lib/chat'
import type { ChatMessage, ChatPage } from '../lib/chat'

export function useTripChat(visitorId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [connection, setConnection] = useState<'loading' | 'connected' | 'offline'>('loading')
  const [hasOlder, setHasOlder] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const newest = useRef(0)
  const deletionCursor = useRef(0)
  const deletedIds = useRef(new Set<number>())
  const refresh = useRef<() => void>(() => {})
  const loadingHistory = useRef(false)

  function receive(page: ChatPage) {
    for (const id of page.deletedIds) deletedIds.current.add(id)
    deletionCursor.current = Math.max(deletionCursor.current, page.deletionCursor)
    setMessages(current => mergeMessages(current, page.messages, deletedIds.current))
  }

  useEffect(() => {
    let active = true
    let fetching = false
    const controller = new AbortController()
    async function sync() {
      if (fetching || document.hidden) return
      fetching = true
      try {
        let hasMore = true
        while (active && hasMore) {
          const after = newest.current
          const page = await fetchChatPage({ after, deletionsAfter: deletionCursor.current }, visitorId, AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]))
          if (!active) return
          receive(page)
          newest.current = Math.max(newest.current, ...page.messages.map(message => message.id))
          if (!after) setHasOlder(page.hasMore)
          // Initial history is paged backwards; subsequent updates catch up forwards.
          hasMore = (after > 0 && page.hasMore && page.messages.length > 0) || page.hasMoreDeletions
        }
        if (active) setConnection('connected')
      } catch {
        if (active) setConnection('offline')
      } finally { fetching = false }
    }
    refresh.current = () => { void sync() }
    void sync()
    const timer = window.setInterval(() => { void sync() }, 5000)
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('online', sync)
    return () => {
      active = false
      controller.abort()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('online', sync)
    }
  }, [visitorId])

  async function loadOlder() {
    if (loadingHistory.current || !messages.length) return
    loadingHistory.current = true
    setLoadingOlder(true)
    setHistoryError('')
    try {
      const page = await fetchChatPage({ before: messages[0].id, deletionsAfter: deletionCursor.current }, visitorId)
      receive(page)
      setHasOlder(page.hasMore)
    } catch { setHistoryError('Earlier messages couldn’t load. Please try again.') }
    finally { loadingHistory.current = false; setLoadingOlder(false) }
  }

  function addMessage(message: ChatMessage) {
    // Leave the polling cursor alone so another visitor’s intervening messages are fetched.
    if (message.deleted) deletedIds.current.add(message.id)
    setMessages(current => mergeMessages(current, [message], deletedIds.current))
  }

  return { messages, connection, hasOlder, loadingOlder, historyError, loadOlder, addMessage, refresh: () => refresh.current() }
}
