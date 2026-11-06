import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react'
import { ArrowDownToLine, ArrowRight, ArrowUp, ArrowUpRight, BedDouble, Bus, CalendarDays, Camera, Check, CheckCheck, ChevronDown, Clock3, Coffee, Copy, Heart, Info, KeyRound, Mail, MapPin, Menu, MessageCircle, Minus, Phone, Search, Sparkles, Sun, Sunset, TreePalm, Users, Utensils, Waves, X } from 'lucide-react'
import { rooms, trip } from './data/trip'
import type { Room, RoomType } from './data/trip'
import { calendarEvent, countdownTo, filterRooms } from './lib/trip'
import { Hero, ScrollProgress, travelEase } from './components/TravelMotion'
import { rememberWelcome, shouldShowWelcome, TripWelcome } from './components/TripWelcome'

const totalGuests = rooms.reduce((sum, room) => sum + room.guests.length, 0)
const iconMap = { bus: Bus, palm: TreePalm, utensils: Utensils, sunset: Sunset, coffee: Coffee, sun: Sun, sparkles: Sparkles, camera: Camera, key: KeyRound }

function TripIcon({ name, size = 21 }: { name: string; size?: number }) {
  const Icon = iconMap[name as keyof typeof iconMap] ?? Sun
  return <Icon size={size} strokeWidth={1.6} aria-hidden="true" />
}

function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <p className={`section-label ${light ? 'section-label-light' : ''}`}><span />{children}</p>
}

function App() {
  const [welcomeVisible, setWelcomeVisible] = useState(shouldShowWelcome)
  const [pageReady, setPageReady] = useState(!welcomeVisible)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const [toast, setToast] = useState('')
  const siteContent = useRef<HTMLDivElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reducedMotion = useReducedMotion()

  const dismissWelcome = useCallback(() => {
    rememberWelcome()
    setWelcomeVisible(false)
  }, [])

  useEffect(() => {
    if (pageReady) return
    const originalOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => { document.documentElement.style.overflow = originalOverflow }
  }, [pageReady])

  function completeWelcome() {
    setPageReady(true)
    // Move focus off the departing dialog without scrolling or skipping navigation.
    requestAnimationFrame(() => siteContent.current?.focus({ preventScroll: true }))
  }

  useEffect(() => {
    document.querySelectorAll<HTMLElement>('.destination-facts .trip-fact, .essentials-grid .essential').forEach((element, index) => {
      element.classList.add('reveal')
      element.style.transitionDelay = `${(index % 5) * 70}ms`
    })
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('revealed'); revealObserver.unobserve(entry.target) }
      })
    }, { threshold: 0.08 })
    document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element))
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setActiveSection(entry.target.id) })
    }, { rootMargin: '-15% 0px -65% 0px' })
    document.querySelectorAll('main section[id]').forEach(element => sectionObserver.observe(element))
    return () => { revealObserver.disconnect(); sectionObserver.disconnect(); if (toastTimer.current) clearTimeout(toastTimer.current) }
  }, [])

  useEffect(() => {
    const close = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && menuOpen) { setMenuOpen(false); menuButton.current?.focus() }
    }
    const desktop = window.matchMedia('(min-width: 768px)')
    const onResize = () => { if (desktop.matches) setMenuOpen(false) }
    document.addEventListener('keydown', close)
    desktop.addEventListener('change', onResize)
    return () => { document.removeEventListener('keydown', close); desktop.removeEventListener('change', onResize) }
  }, [menuOpen])

  function notify(message: string) {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 5000)
  }

  function downloadCalendar() {
    const calendar = calendarEvent(trip)
    if (!calendar) { notify('Dates will be shared soon. Your calendar can wait a little longer.'); return }
    const url = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'novigi-annual-trip-2026.ics'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    notify('Calendar file downloaded. Open it to add our getaway to your calendar.')
  }

  async function copySummary() {
    const summary = `${trip.name}\n${trip.dateLabel} · ${trip.duration}\n${trip.hotel}, ${trip.country}\nGathering: ${trip.meetingPoint}, ${trip.gatheringTime} on ${trip.gatheringDateLabel} (${trip.timeZoneLabel}).\n${trip.transportNote}. ${trip.departureNote}\n${trip.mapUrl}`
    try { await navigator.clipboard.writeText(summary); notify('Trip details copied. A little excitement, ready to share.') }
    catch { notify('Copy is unavailable in this browser. You can select and copy the trip details on this page.') }
  }

  const navigation = [{ id: 'trip-details', label: 'The getaway' }, { id: 'itinerary', label: 'Itinerary' }, { id: 'rooms', label: 'Our rooms' }, { id: 'good-to-know', label: 'Good to know' }]

  return <>
    <AnimatePresence onExitComplete={completeWelcome}>
      {welcomeVisible && <TripWelcome key="trip-welcome" onComplete={dismissWelcome} />}
    </AnimatePresence>
    <div ref={siteContent} className="site-content" tabIndex={-1} inert={!pageReady}>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <header className="site-header">
      <ScrollProgress />
      <div className="nav-container">
        <a className="wordmark" href="#home" aria-label="Novigi annual trip home"><img className="brand-logo" src="/images/novigi-logo.png" alt="Novigi" width="436" height="164" /><span className="brand-divider" /><span className="brand-edition">OFF THE CLOCK<span>ANNUAL TRIP · {trip.year}</span></span></a>
        <nav className="desktop-nav" aria-label="Main navigation">
          {navigation.map(item => <a key={item.id} href={`#${item.id}`} className={activeSection === item.id ? 'active' : ''} aria-current={activeSection === item.id ? 'location' : undefined}>{item.label}{activeSection === item.id && <motion.span className="nav-indicator" layoutId="navigation-indicator" transition={{ duration: reducedMotion ? 0 : 0.35, ease: travelEase }} />}</a>)}
        </nav>
        <a className="button button-ocean nav-cta" href="#rooms"><span>Find my room</span><span className="nav-cta-icon" aria-hidden="true"><Search size={16} strokeWidth={1.8} /></span></a>
        <button ref={menuButton} className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="mobile-navigation">{menuOpen ? <X /> : <Menu />}</button>
      </div>
      {menuOpen && <motion.nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation" initial={reducedMotion ? false : { opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.25, ease: travelEase }}>{navigation.map(item => <a key={item.id} href={`#${item.id}`} onClick={() => setMenuOpen(false)}>{item.label}<ArrowUpRight size={18} /></a>)}</motion.nav>}
    </header>

    <main id="main-content">
      <Hero ready={pageReady} />

      <Countdown />

      <section id="trip-details" className="destination section-space" aria-labelledby="destination-title">
        <div className="container destination-grid">
          <div className="destination-visual reveal">
            <img src={trip.destinationImage} alt={trip.destinationImageDescription} loading="lazy" width={trip.destinationImageWidth} height={trip.destinationImageHeight} />
            <div className="photo-location"><MapPin size={14} /> THE COAST IS CALLING</div>
            <div className="destination-photo-copy">Less routine.<br /><span className="text-accent">More ocean.</span></div>
            <div className="photo-stamp"><Waves size={26} strokeWidth={1.4} /><span>ISLAND<br />STATE OF MIND</span></div>
          </div>
          <div className="destination-content reveal">
            <SectionLabel>THE GETAWAY</SectionLabel>
            <h2 id="destination-title">Next stop,<br /> <span className="text-accent">{trip.destination}.</span></h2>
            <p className="section-description">{trip.destinationDescription}</p>
            <div className="destination-facts">
              <div className="trip-fact"><span className="fact-icon"><MapPin /></span><div><span>THE DESTINATION</span><strong>{trip.destination}, {trip.country}</strong></div></div>
              <div className="trip-fact"><span className="fact-icon"><CalendarDays /></span><div><span>THE DATES</span><strong>{trip.shortDateLabel}</strong><small>{trip.duration}</small></div></div>
              <div className="trip-fact"><span className="fact-icon"><Clock3 /></span><div><span>GATHERING TIME</span><strong>{trip.gatheringTime}</strong><small>{trip.gatheringDateLabel} · {trip.timeZoneLabel}</small></div></div>
              <div className="trip-fact"><span className="fact-icon"><Bus /></span><div><span>MEETING POINT</span><strong>{trip.meetingPoint}</strong><small>{trip.transportNote}</small></div></div>
              <div className="trip-fact hotel-fact"><span className="fact-icon"><BedDouble /></span><div><span>YOUR HOME AWAY FROM HOME</span><strong>{trip.hotel}</strong><small>{trip.hotelNote}</small></div><a href={trip.mapUrl} target="_blank" rel="noreferrer" className="round-link" aria-label="View Pullman Bentota Resort and Spa on Google Maps (opens in a new tab)"><ArrowUpRight size={20} /></a></div>
            </div>
            <a href={trip.mapUrl} target="_blank" rel="noreferrer" className="text-link">A little look at where we’re headed <ArrowUpRight size={17} /><span className="sr-only">on Google Maps, opens in a new tab</span></a>
          </div>
        </div>
      </section>

      <Itinerary onDownload={downloadCalendar} />
      <RoomAllocations />
      <HelpfulInformation onCopy={copySummary} />

      <section className="closing-section" aria-labelledby="closing-title">
        <div className="closing-contours" aria-hidden="true" />
        <TreePalm className="closing-palm" size={170} strokeWidth={0.65} aria-hidden="true" />
        <div className="container closing-content reveal">
          <SectionLabel light>BETTER WHEN WE’RE TOGETHER</SectionLabel>
          <h2 id="closing-title">Here’s to the stories<br /><span className="text-accent">we’ll bring back.</span></h2>
          <p>{totalGuests} people. One beautiful getaway. Plenty of memories to make.</p>
          <button className="button button-white" onClick={downloadCalendar}><CalendarDays size={17} /> Save the dates <ArrowUpRight size={16} /></button>
        </div>
      </section>
    </main>

    <footer className="site-footer container">
      <a href="#home" className="wordmark footer-wordmark" aria-label="Novigi home"><img className="brand-logo" src="/images/novigi-logo.png" alt="Novigi" width="436" height="164" loading="lazy" /></a>
      <p>A little escape, for the people who make it all happen.</p>
      <a href="#home" className="back-top">Back to the sunshine <ArrowUp size={16} /></a>
      <div className="footer-bottom"><span>© {trip.year} Novigi · Made for our people <Heart size={11} /></span><span>{trip.imageNote}</span></div>
    </footer>
    <div className={`toast ${toast ? 'toast-visible' : ''}`} role="status" aria-live="polite">{toast && <><CheckCheck size={20} /><span>{toast}</span><button onClick={() => setToast('')} aria-label="Dismiss notification"><X size={17} /></button></>}</div>
    </div>
  </>
}

function Countdown() {
  const [countdown, setCountdown] = useState(() => countdownTo(trip.startsAt, trip.endsAt))
  useEffect(() => {
    const timer = setInterval(() => setCountdown(countdownTo(trip.startsAt, trip.endsAt)), 1000)
    return () => clearInterval(timer)
  }, [])
  const messages = { pending: 'Dates coming soon', started: 'Our getaway is here!', complete: 'Same time, next adventure?' }
  return <div className="countdown-strip container">
    <div className="countdown-heading"><span className="countdown-icon"><Sun size={27} strokeWidth={1.4} /></span><div><span className="overline">A LITTLE CLOSER TO THE COAST</span><p>The good times are on their way.</p></div></div>
    <div className="countdown" role="timer" aria-label={`Time until our gathering on ${trip.gatheringDateLabel}, ${trip.gatheringTime}, ${trip.timeZoneLabel}`}>
      {countdown.status === 'counting' ? countdown.values.map((value, index) => <div className="countdown-unit" key={index}><strong>{String(value).padStart(2, '0')}</strong><span>{['DAYS', 'HOURS', 'MINUTES', 'SECONDS'][index]}</span></div>) : <p className="countdown-message">{messages[countdown.status]}</p>}
    </div>
    <button className="countdown-date" onClick={() => document.getElementById('itinerary')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}><span className="status-dot" /> Let the anticipation begin <ArrowUpRight size={15} /></button>
  </div>
}

function Itinerary({ onDownload }: { onDownload: () => void }) {
  const [activeDay, setActiveDay] = useState(0)
  const reducedMotion = useReducedMotion()
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const day = trip.itinerary[activeDay]
  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number
    if (event.key === 'ArrowRight') next = (index + 1) % trip.itinerary.length
    else if (event.key === 'ArrowLeft') next = (index + trip.itinerary.length - 1) % trip.itinerary.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = trip.itinerary.length - 1
    else return
    event.preventDefault(); setActiveDay(next); tabs.current[next]?.focus()
  }
  return <section id="itinerary" className="itinerary-section section-space" aria-labelledby="itinerary-title">
    <div className="container">
      <div className="section-heading reveal"><div><SectionLabel>A LITTLE PLAN, A LOT TO LOOK FORWARD TO</SectionLabel><h2 id="itinerary-title">Make every moment <span className="text-accent">count.</span></h2></div><button className="button button-outline calendar-button" onClick={onDownload}><ArrowDownToLine size={16} /> Add to calendar</button></div>
      <div className="itinerary-layout reveal">
        <div className="itinerary-sidebar">
          <div role="tablist" aria-label="Trip itinerary by day" className="day-tabs">
            {trip.itinerary.map((item, index) => <button key={item.day} role="tab" ref={el => { tabs.current[index] = el }} id={`day-tab-${item.day}`} aria-controls={`day-panel-${item.day}`} aria-selected={index === activeDay} tabIndex={index === activeDay ? 0 : -1} onClick={() => setActiveDay(index)} onKeyDown={event => navigateTabs(event, index)} className={`day-tab ${index === activeDay ? 'selected' : ''}`}><span className="day-number">0{item.day}</span><span><span className="day-date">{item.date}</span><strong>{item.label}</strong></span><ArrowUpRight size={19} /></button>)}
          </div>
          <div className="itinerary-note"><Sparkles size={19} /><p>A little structure.<br />Plenty of room for spontaneity.</p></div>
          {trip.itineraryIsSample && <p className="suggested-note"><Info size={14} /> Suggested itinerary. Activities and timings are subject to confirmation.</p>}
        </div>
        <motion.div key={day.day} id={`day-panel-${day.day}`} role="tabpanel" aria-labelledby={`day-tab-${day.day}`} tabIndex={0} className="timeline-panel" initial={reducedMotion ? false : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reducedMotion ? 0 : 0.45, ease: travelEase }}>
          <div className="timeline-title"><div><span className="overline">DAY 0{day.day}</span><h3>{day.label}</h3><p>{day.description}</p></div><TripIcon name={day.day === 1 ? 'palm' : day.day === 2 ? 'sun' : 'coffee'} size={35} /></div>
          <ol className="timeline">{day.events.map((event, index) => <motion.li key={event.title} initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : index * 0.07, ease: travelEase }}><div className="timeline-time">{event.time}</div><div className="timeline-marker"><TripIcon name={event.icon} size={18} /></div><div className="timeline-event"><h4>{event.title}{activeDay === 0 && index === 0 && <span className="confirmed-tag">Confirmed</span>}</h4><p>{event.description}</p></div></motion.li>)}</ol>
        </motion.div>
      </div>
    </div>
  </section>
}

function Highlight({ text, query }: { text: string; query: string }) {
  const term = query.trim().toLocaleLowerCase()
  const start = term ? text.toLocaleLowerCase().indexOf(term) : -1
  if (start < 0) return <>{text}</>
  return <>{text.slice(0, start)}<mark>{text.slice(start, start + term.length)}</mark>{text.slice(start + term.length)}</>
}

const RoomCard = forwardRef<HTMLElement, { room: Room; query: string; index: number }>(function RoomCard({ room, query, index }, ref) {
  const reducedMotion = useReducedMotion()
  const isPresent = useIsPresent()
  return <motion.article ref={ref} className="room-card" aria-label={`${room.type} room for ${room.guests.join(", ")}`} aria-hidden={!isPresent || undefined}
    layout={reducedMotion ? false : 'position'}
    initial={reducedMotion ? false : { opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.05 }}
    exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.97, transition: { duration: reducedMotion ? 0 : 0.16 } }}
    whileHover={reducedMotion ? undefined : { y: -5, transition: { duration: 0.22 } }}
    transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : Math.min(index, 5) * 0.055, ease: travelEase, layout: { duration: reducedMotion ? 0 : 0.4, ease: travelEase } }}>
    <div className="room-card-header"><div className="room-category"><span className="room-key" aria-hidden="true"><BedDouble size={23} strokeWidth={1.5} /></span><div><span>YOUR STAY</span><h3>{room.type} room</h3></div></div><Waves className="room-wave" size={25} strokeWidth={1.2} aria-hidden="true" /></div>
    <ul className="guest-list">{room.guests.map((guest, index) => <li key={guest}><span className={`guest-avatar avatar-${index}`}>{guest.split(' ').map(word => word[0]).join('').slice(0, 2)}</span><span><Highlight text={guest} query={query} /></span></li>)}</ul>
    <div className="room-card-footer"><span><Users size={14} />{room.guests.length} of {room.capacity} guests</span><span><span className="assigned-dot" />{room.guests.length === room.capacity ? 'Fully assigned' : `${room.capacity - room.guests.length} spaces available`}</span></div>
  </motion.article>
})

function RoomAllocations() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<RoomType | 'All'>('All')
  const [showAll, setShowAll] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const results = filterRooms(rooms, query, type)
  const visibleRooms = showAll || query.trim() || type !== 'All' ? results : results.slice(0, 6)
  const filtered = query.trim() || type !== 'All'
  function reset() { setQuery(''); setType('All'); setShowAll(false); searchRef.current?.focus() }
  return <section id="rooms" className="rooms-section section-space" aria-labelledby="rooms-title">
    <div className="container">
      <div className="section-heading room-section-heading reveal"><div><SectionLabel>YOUR SPACE. YOUR PEOPLE.</SectionLabel><h2 id="rooms-title">Find your room.<br className="mobile-break" /> <span className="text-accent">Meet your crew.</span></h2><p className="section-description">A good getaway starts with good company. Here’s yours.</p></div><div className="room-stats"><div><BedDouble size={19} /><strong>{rooms.length}</strong><span>ROOMS</span></div><span className="stats-divider" /><div><Users size={19} /><strong>{totalGuests}</strong><span>GUESTS</span></div></div></div>
      <div className="room-search-area">
        <div className="search-field"><Search size={21} strokeWidth={1.8} /><label htmlFor="room-search" className="sr-only">Search by guest name</label><input ref={searchRef} id="room-search" type="search" value={query} onChange={event => { setQuery(event.target.value); setShowAll(false) }} placeholder="Search your name…" autoComplete="off" aria-describedby="room-results" />{query ? <button onClick={() => { setQuery(''); searchRef.current?.focus() }} aria-label="Clear search"><X size={18} /></button> : <span className="search-hint">Find your people</span>}</div>
        <div className="room-filters" role="group" aria-label="Filter by room type">{(['All', 'Triple', 'Twin'] as const).map(filter => <button key={filter} aria-pressed={type === filter} className={type === filter ? 'selected' : ''} onClick={() => { setType(filter); setShowAll(false) }}>{filter === 'All' ? 'All rooms' : `${filter} rooms`}<span>{filter === 'All' ? rooms.length : rooms.filter(room => room.type === filter).length}</span></button>)}</div>
      </div>
      <div className="room-results-meta"><p id="room-results" role="status" aria-live="polite">{results.length ? <>Showing <strong>{visibleRooms.length}{visibleRooms.length !== results.length ? ` of ${results.length}` : ''}</strong> {results.length === 1 ? 'room' : 'rooms'}{query.trim() ? <> matching <strong>“{query.trim()}”</strong></> : type !== 'All' ? ` · ${type.toLowerCase()} rooms` : <><span className="results-dot">·</span> Find a familiar name, feel right at home.</>}</> : 'No matching rooms found.'}</p>{filtered && <button onClick={reset} className="reset-filters">Reset filters <X size={13} /></button>}<span className="provisional-label"><Info size={13} /> Room types to be confirmed</span></div>
      {results.length ? <div className="room-grid"><AnimatePresence mode="popLayout">{visibleRooms.map((room, index) => <RoomCard key={room.id} room={room} query={query} index={index} />)}</AnimatePresence></div> : <div className="empty-state"><span><Search size={30} strokeWidth={1.4} /></span><h3>Let’s find your people.</h3><p>No matching guests yet. Try another name, or clear your filters to see everyone.</p><button className="button button-ocean" onClick={reset}>Show all rooms <ArrowRight size={16} /></button></div>}
      {!filtered && results.length > 6 && <div className="show-rooms"><button className="button button-outline" onClick={() => { setShowAll(!showAll); if (showAll) document.getElementById('room-search')?.focus() }}>{showAll ? 'Show fewer rooms' : `View all ${rooms.length} rooms`}{showAll ? <Minus size={16} /> : <ChevronDown size={16} />}</button></div>}
      <p className="room-data-note"><Info size={14} /><span>{trip.roomNote} Need a change? <a href="#organizers">Reach out to the organizing team <ArrowUpRight size={12} /></a></span></p>
    </div>
  </section>
}

function HelpfulInformation({ onCopy }: { onCopy: () => void }) {
  const [packed, setPacked] = useState<string[]>(() => {
    try { const value: unknown = JSON.parse(localStorage.getItem('novigi-trip-packing-2026') ?? '[]'); return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && trip.packing.includes(item)) : [] } catch { return [] }
  })
  function togglePacked(item: string) {
    const next = packed.includes(item) ? packed.filter(value => value !== item) : [...packed, item]
    setPacked(next)
    try { localStorage.setItem('novigi-trip-packing-2026', JSON.stringify(next)) } catch { /* The checklist still works when browser storage is unavailable. */ }
  }
  return <section id="good-to-know" className="helpful-section section-space" aria-labelledby="helpful-title"><div className="container">
    <div className="centered-heading reveal"><SectionLabel>THE LITTLE THINGS, TAKEN CARE OF</SectionLabel><h2 id="helpful-title">A smoother trip starts <span className="text-accent">here.</span></h2><p className="section-description">A few handy details, so you can focus on the good part.</p></div>
    <div className="essentials-grid reveal">{trip.essentials.map(item => <article className="essential" key={item.title}><span className="essential-icon"><TripIcon name={item.icon} size={24} /></span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
    <div className="helpful-grid reveal">
      <div className="packing-card"><div className="packing-heading"><div><span className="overline">PACK LIGHT. COME READY.</span><h3>A little packing list</h3></div><span className="packing-progress" aria-live="polite">{packed.length}/{trip.packing.length}</span></div><p>The essentials for your island state of mind.</p><div className="packing-list">{trip.packing.map(item => <label key={item} className={packed.includes(item) ? 'is-packed' : ''}><input type="checkbox" checked={packed.includes(item)} onChange={() => togglePacked(item)} /><span className="custom-checkbox" aria-hidden="true">{packed.includes(item) && <Check size={13} />}</span><span>{item}</span></label>)}</div><span className="packing-footnote">{packed.length === trip.packing.length ? <><CheckCheck size={15} /> All set. Your next stop is the coast.</> : <><Check size={14} /> Check things off as you pack.</>}</span></div>
      <div className="reminders"><span className="overline">BEFORE YOU GO</span><h3>Good questions. Handy answers.</h3><div className="faq-list">{trip.reminders.map(item => <details key={item.question}><summary>{item.question}<ChevronDown size={17} /></summary><p>{item.answer}</p></details>)}</div></div>
    </div>
    <div id="organizers" className="organizer-card reveal"><div className="organizer-icon"><MessageCircle size={26} strokeWidth={1.4} /></div><div className="organizer-copy"><span className="overline">WE’RE HERE TO HELP</span><h3>{trip.organizer.name}</h3><p>{trip.organizer.description}</p>{trip.organizer.email || trip.organizer.phone ? <div className="organizer-links">{trip.organizer.email && <a href={`mailto:${trip.organizer.email}`}><Mail size={14} />{trip.organizer.email}</a>}{trip.organizer.phone && <a href={`tel:${trip.organizer.phone.replace(/[^+\d]/g, '')}`}><Phone size={14} />{trip.organizer.phone}</a>}</div> : <span className="contact-pending"><span className="status-dot" />{trip.organizer.contactNote}</span>}</div><button className="button button-outline" onClick={onCopy}><Copy size={16} /> Copy trip details</button></div>
  </div></section>
}

export default App
