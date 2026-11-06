import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowDown, CornerUpLeft, MessageCircle, RefreshCw, Send, Sparkles, Trash2, Waves, X } from 'lucide-react'
import { CHAT_MESSAGE_LIMIT, CHAT_NAME_LIMIT, deleteChatMessage, initials, sendChatMessage, validateChatText } from '../lib/chat'
import type { ChatMessage, ChatSubmission } from '../lib/chat'
import { useTripChat } from '../hooks/useTripChat'
import { trip } from '../data/trip'

const prompts = ["Who’s on playlist duty? 🎶", 'Beach or pool? 🌊', 'Any bus snack requests? 🍿']
const emojis = [{ value: '🌴', label: 'Palm tree' }, { value: '🌊', label: 'Wave' }, { value: '😂', label: 'Laughing' }, { value: '🙌', label: 'Celebration' }, { value: '❤️', label: 'Heart' }]
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: trip.timeZone })

function readName() {
  try { return localStorage.getItem('novigi-chat-name')?.slice(0, CHAT_NAME_LIMIT) ?? '' } catch { return '' }
}

function visitorId() {
  try {
    const saved = localStorage.getItem('novigi-chat-visitor')
    if (saved && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved)) return saved
    const id = crypto.randomUUID()
    localStorage.setItem('novigi-chat-visitor', id)
    return id
  } catch { return crypto.randomUUID() }
}

export function TripChat() {
  const [identity] = useState(visitorId)
  const chat = useTripChat(identity)
  const [name, setName] = useState(readName)
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [showLatest, setShowLatest] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const deletingRef = useRef(false)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const feed = useRef<HTMLDivElement>(null)
  const isNearBottom = useRef(true)
  const previousLastId = useRef<number | undefined>(undefined)
  const historyAnchor = useRef<{ height: number; top: number } | null>(null)
  const pending = useRef<ChatSubmission | null>(null)
  const sendingRef = useRef(false)
  useEffect(() => {
    if (replyTo && chat.messages.some(message => message.id === replyTo.id && message.deleted)) {
      setReplyTo(null)
      setAnnouncement('The message you were replying to was deleted. Your draft is still here.')
    }
    if (confirmDelete && chat.messages.some(message => message.id === confirmDelete && message.deleted)) setConfirmDelete(null)
  }, [chat.messages, replyTo, confirmDelete])

  useLayoutEffect(() => {
    const element = feed.current
    if (!element) return
    const lastId = chat.messages.at(-1)?.id
    if (historyAnchor.current && !chat.loadingOlder) {
      element.scrollTop = historyAnchor.current.top + element.scrollHeight - historyAnchor.current.height
      historyAnchor.current = null
    } else if (!historyAnchor.current && lastId !== previousLastId.current) {
      if (isNearBottom.current) element.scrollTop = element.scrollHeight
      else setShowLatest(true)
      if (previousLastId.current !== undefined) setAnnouncement('New messages in the trip chat.')
    }
    previousLastId.current = lastId
  }, [chat.messages, chat.loadingOlder])

  function goToLatest() {
    if (feed.current) feed.current.scrollTop = feed.current.scrollHeight
    isNearBottom.current = true
    setShowLatest(false)
  }

  function addToDraft(value: string, replace = false) {
    setBody(current => (replace ? value : `${current}${value}`).slice(0, CHAT_MESSAGE_LIMIT))
    setError('')
    textarea.current?.focus()
  }

  function cancelDelete(id: number) {
    if (deletingRef.current) return
    setConfirmDelete(null)
    setDeleteError('')
    requestAnimationFrame(() => document.getElementById(`chat-delete-${id}`)?.focus())
  }

  async function removeMessage(id: number) {
    if (deletingRef.current) return
    deletingRef.current = true
    setDeleting(id)
    setDeleteError('')
    try {
      const message = await deleteChatMessage(id, identity)
      chat.addMessage(message)
      chat.refresh()
      setConfirmDelete(null)
      setAnnouncement('Your message has been deleted for everyone.')
      feed.current?.focus({ preventScroll: true })
    } catch (cause) {
      setDeleteError(cause instanceof Error && cause.name !== 'TimeoutError' && cause.name !== 'TypeError' ? cause.message : 'Your message couldn’t be deleted. Please try again.')
    } finally { deletingRef.current = false; setDeleting(null) }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (sendingRef.current) return
    const validation = validateChatText(name, body)
    if (validation) { setError(validation); (!name.trim() ? nameInput : textarea).current?.focus(); return }
    const content = { name: name.trim(), body: body.trim(), replyTo: replyTo?.id ?? null }
    // Reuse the key on retries, including when a response was lost after the server saved it.
    if (!pending.current || pending.current.name !== content.name || pending.current.body !== content.body || pending.current.replyTo !== content.replyTo) {
      pending.current = { ...content, requestId: crypto.randomUUID(), visitorId: identity }
    }
    sendingRef.current = true
    setSending(true)
    setError('')
    setAnnouncement('')
    try {
      const message = await sendChatMessage(pending.current)
      isNearBottom.current = true
      chat.addMessage(message)
      chat.refresh()
      try { localStorage.setItem('novigi-chat-name', content.name) } catch { /* Chat also works without browser storage. */ }
      pending.current = null
      setBody('')
      setReplyTo(null)
      setShowLatest(false)
      setAnnouncement('Your message has been sent.')
      requestAnimationFrame(() => textarea.current?.focus())
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== 'TimeoutError' && cause.name !== 'TypeError' ? cause.message : 'Your message couldn’t be sent. It’s still here — try again.')
    } finally { sendingRef.current = false; setSending(false) }
  }

  return <section id="trip-chat" className="chat-section section-space" aria-labelledby="chat-title">
    <div className="container">
      <div className="chat-heading reveal">
        <p className="section-label"><span />GOOD COMPANY, GREAT CONVERSATIONS</p>
        <h2 id="chat-title">The trip starts <span className="text-accent">in the chat.</span></h2>
        <p className="section-description">Make a plan. Drop a joke. Find your beach crew. This little corner is for all of us.</p>
      </div>
      <div className="chat-layout reveal">
        <aside className="chat-invitation" aria-label="Conversation starters">
          <span className="chat-doodle" aria-hidden="true"><MessageCircle size={33} strokeWidth={1.4} /><Sparkles size={19} /></span>
          <p className="overline">OFF THE CLOCK. ON THE CHAT.</p>
          <h3>Good times start<br />with a little hello.</h3>
          <p>Got a song for the bus? A very important snack opinion? You’re in the right place.</p>
          <div className="chat-prompts"><span>BREAK THE ICE</span>{prompts.map(prompt => <button key={prompt} type="button" disabled={sending} onClick={() => addToDraft(prompt, !body.trim())}>{prompt}<CornerUpLeft size={14} aria-hidden="true" /></button>)}</div>
          <div className="chat-kind-note"><Waves size={22} strokeWidth={1.5} aria-hidden="true" /><p>Keep it kind. Keep it fun.<br />Save a little banter for the bus.</p></div>
        </aside>
        <div id="trip-chat-board" className="chat-board" role="region" aria-labelledby="chat-board-title" tabIndex={-1}>
          <div className="chat-board-header">
            <div className="chat-board-title"><span className="chat-board-icon"><MessageCircle size={20} aria-hidden="true" /></span><div><h3 id="chat-board-title">The trip chat</h3><span>Everyone’s invited.</span></div></div>
            <div className={`chat-connection chat-connection-${chat.connection}`} role="status"><span aria-hidden="true" />{chat.connection === 'connected' ? 'Updates every 5s' : chat.connection === 'loading' ? 'Connecting…' : 'Reconnecting…'}</div>
          </div>
          <div className="chat-feed-wrap">
            <div ref={feed} className="chat-feed" role="region" aria-label="Trip messages, oldest first" tabIndex={0} onScroll={() => {
              const element = feed.current!
              isNearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 70
              if (isNearBottom.current) setShowLatest(false)
            }}>
              {chat.hasOlder && <button className="chat-load-older" type="button" disabled={chat.loadingOlder} onClick={() => {
                if (feed.current) historyAnchor.current = { height: feed.current.scrollHeight, top: feed.current.scrollTop }
                void chat.loadOlder()
              }}>{chat.loadingOlder ? 'Loading earlier messages…' : 'Load earlier messages'}</button>}
              {chat.historyError && <p className="chat-history-error" role="alert">{chat.historyError}</p>}
              {!chat.messages.length && <div className="chat-empty">
                <span aria-hidden="true">🌴</span>
                <h4>{chat.connection === 'loading' ? 'Finding the beach crew…' : chat.connection === 'offline' ? 'The chat is taking a little break.' : 'First one here? Make some waves.'}</h4>
                <p>{chat.connection === 'offline' ? 'We’ll reconnect automatically. Your next hello can wait right here.' : chat.connection === 'loading' ? 'Getting the conversation ready.' : 'Say hello, share your excitement, or ask the all-important question: who’s bringing snacks?'}</p>
              </div>}
              <ol className="chat-messages">{chat.messages.map(message => <li key={message.id} id={`chat-message-${message.id}`}>
                <article className="chat-message" aria-label={`Message from ${message.name}`}>
                  <span className={`chat-avatar chat-avatar-${message.name.codePointAt(0)! % 4}`} aria-hidden="true">{initials(message.name)}</span>
                  <div className="chat-message-content">
                    <div className="chat-message-meta"><strong>{message.name}</strong><time dateTime={message.createdAt} title={`${dateFormat.format(new Date(message.createdAt))} · Sri Lanka time`}>{dateFormat.format(new Date(message.createdAt))}</time></div>
                    {message.replyTo && <blockquote className="chat-quote"><CornerUpLeft size={13} aria-hidden="true" /><div><strong>{message.replyTo.name}</strong><p>{message.replyTo.body}</p></div></blockquote>}
                    <p className={`chat-message-body${message.deleted ? ' chat-message-deleted' : ''}`}>{message.deleted && <Trash2 size={13} aria-hidden="true" />}{message.body}</p>
                    {!message.deleted && (confirmDelete === message.id ? <div className="chat-delete-confirm" role="group" aria-label="Delete your message" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); cancelDelete(message.id) } }}>
                      <p>Delete this message for everyone?</p>
                      <div><button id={`chat-delete-cancel-${message.id}`} type="button" disabled={deleting !== null} onClick={() => cancelDelete(message.id)}>Keep message</button><button className="chat-delete-confirm-button" type="button" disabled={deleting !== null} onClick={() => { void removeMessage(message.id) }}><Trash2 size={13} aria-hidden="true" />{deleting === message.id ? 'Deleting…' : 'Delete message'}</button></div>
                      {deleteError && <p className="chat-error" role="alert">{deleteError}</p>}
                    </div> : <div className="chat-message-actions">
                      <button className="chat-reply-button" type="button" disabled={sending} aria-label={`Reply to ${message.name}`} onClick={() => { setReplyTo(message); textarea.current?.focus() }}><CornerUpLeft size={13} aria-hidden="true" />Reply</button>
                      {message.canDelete && <button id={`chat-delete-${message.id}`} className="chat-delete-button" type="button" disabled={deleting !== null} aria-label="Delete your message" onClick={() => { setConfirmDelete(message.id); setDeleteError(''); requestAnimationFrame(() => document.getElementById(`chat-delete-cancel-${message.id}`)?.focus()) }}><Trash2 size={13} aria-hidden="true" />Delete</button>}
                    </div>)}
                  </div>
                </article>
              </li>)}</ol>
            </div>
            {showLatest && <button className="chat-jump-latest" type="button" onClick={goToLatest}>New messages<ArrowDown size={14} aria-hidden="true" /></button>}
          </div>
          {chat.connection === 'offline' && <div className="chat-offline"><span>Chat is temporarily unavailable.</span><button type="button" onClick={chat.refresh}><RefreshCw size={13} aria-hidden="true" />Try again</button></div>}
          <form className="chat-composer" onSubmit={submit}>
            <div className="chat-name-row"><label htmlFor="chat-name">Your name <span>(required)</span></label><input ref={nameInput} id="chat-name" name="name" autoComplete="given-name" placeholder="What should we call you?" value={name} onChange={event => setName(event.target.value)} maxLength={CHAT_NAME_LIMIT} required disabled={sending} /></div>
            {replyTo && <div className="chat-reply-draft"><CornerUpLeft size={15} aria-hidden="true" /><div><strong>Replying to {replyTo.name}</strong><p>{replyTo.body}</p></div><button type="button" disabled={sending} onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X size={17} /></button></div>}
            <label className="sr-only" htmlFor="chat-message">Your message</label>
            <textarea ref={textarea} id="chat-message" name="message" placeholder="Bring a little holiday energy…" rows={3} value={body} onChange={event => { setBody(event.target.value); setError('') }} maxLength={CHAT_MESSAGE_LIMIT} required disabled={sending} aria-describedby={`chat-message-limit${error ? ' chat-error' : ''}`} onKeyDown={event => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit() }
            }} />
            <div className="chat-composer-actions"><div className="chat-emojis" aria-label="Add an emoji">{emojis.map(emoji => <button key={emoji.label} type="button" disabled={sending || body.length + emoji.value.length > CHAT_MESSAGE_LIMIT} aria-label={`Add ${emoji.label.toLowerCase()} emoji`} onClick={() => addToDraft(emoji.value)}>{emoji.value}</button>)}</div><span id="chat-message-limit" className="chat-character-count">{body.length}/{CHAT_MESSAGE_LIMIT}</span><button className="button button-ocean chat-send" type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send'}<Send size={15} aria-hidden="true" /></button></div>
            {error && <p id="chat-error" className="chat-error" role="alert">{error}</p>}
            <p className="chat-composer-note">Your name and message are visible to everyone visiting this site. You can delete your messages from this browser.</p>
          </form>
          <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
        </div>
      </div>
    </div>
  </section>
}
