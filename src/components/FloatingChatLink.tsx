import { useEffect, useState } from 'react'
import { MessageCircleMore, Sparkles } from 'lucide-react'

export function FloatingChatLink({ hidden = false }: { hidden?: boolean }) {
  const [chatVisible, setChatVisible] = useState(false)

  useEffect(() => {
    const chat = document.getElementById('trip-chat-board')
    if (!chat) return
    const observer = new IntersectionObserver(([entry]) => {
      setChatVisible(entry.isIntersecting)
    }, { rootMargin: '-88px 0px 0px 0px', threshold: 0 })
    observer.observe(chat)
    return () => observer.disconnect()
  }, [])

  if (hidden || chatVisible) return null

  return <a className="floating-chat" href="#trip-chat-board" aria-label="Open trip chat" onClick={() => {
    // Focus the conversation, without opening the mobile keyboard automatically.
    document.getElementById('trip-chat-board')?.focus({ preventScroll: true })
  }}>
    <span className="floating-chat-icon" aria-hidden="true"><MessageCircleMore size={27} strokeWidth={1.8} /><Sparkles className="floating-chat-sparkle" size={13} strokeWidth={1.8} /></span>
    <span className="floating-chat-label">Trip chat<span>Join the fun</span></span>
  </a>
}
