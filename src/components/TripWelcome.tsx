import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowUpRight, MapPin, Sun } from 'lucide-react'
import { trip } from '../data/trip'
import { travelEase } from './TravelMotion'
import { WavePhoto, WelcomeWaves } from './WelcomeWaves'
import './TripWelcome.css'

const welcomeKey = `novigi-welcome-${trip.year}`

export function shouldShowWelcome() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  // Shared links should take people straight to their room or trip details.
  if (window.location.hash && window.location.hash !== '#home') return false
  try { return sessionStorage.getItem(welcomeKey) !== 'seen' }
  catch { return true }
}

export function rememberWelcome() {
  try { sessionStorage.setItem(welcomeKey, 'seen') }
  catch { /* The welcome still works when browser storage is unavailable. */ }
}

export function TripWelcome({ onComplete }: { onComplete: () => void }) {
  const skipButton = useRef<HTMLButtonElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) { onComplete(); return }

    let cancelled = false
    let minimumTimer: ReturnType<typeof setTimeout>
    const finish = () => { if (!cancelled) onComplete() }
    const minimum = new Promise<void>(resolve => { minimumTimer = setTimeout(resolve, 2600) })
    const image = new Image()
    image.src = trip.heroImage
    // Prepare the actual hero while the welcome plays; failed assets never trap visitors.
    const imageReady = image.decode().catch(() => undefined)
    const fontReady = document.fonts.ready
    void Promise.allSettled([minimum, imageReady, fontReady]).then(finish)
    const fallbackTimer = setTimeout(finish, 4500)
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') finish()
      if (event.key === 'Tab') { event.preventDefault(); skipButton.current?.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    skipButton.current?.focus({ preventScroll: true })

    return () => {
      cancelled = true
      clearTimeout(minimumTimer)
      clearTimeout(fallbackTimer)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onComplete, reducedMotion])

  const arrive = (delay: number) => ({ duration: 0.85, delay, ease: travelEase })

  return <motion.div
    className="trip-welcome"
    role="dialog"
    aria-modal="true"
    aria-labelledby="welcome-title"
    aria-describedby="welcome-description"
    initial={{ opacity: 1 }}
    exit={{ opacity: 0, y: reducedMotion ? 0 : '-4%' }}
    transition={{ duration: reducedMotion ? 0 : 0.65, ease: travelEase }}
  >
    <div className="welcome-glow" aria-hidden="true" />
    <div className="welcome-orbit welcome-orbit-one" aria-hidden="true" />
    <div className="welcome-orbit welcome-orbit-two" aria-hidden="true" />

    <div className="welcome-topline">
      <img src="/images/novigi-logo.png" alt="Novigi" width="436" height="164" />
      <span>OUR ANNUAL ESCAPE <span className="welcome-year">{trip.year}</span></span>
    </div>

    <div className="welcome-center">
      <motion.div className="welcome-postcard" initial={{ opacity: 0, y: 24, rotate: -3, scale: 0.94 }} animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }} transition={arrive(0.08)} aria-hidden="true">
        <WavePhoto />
        <span className="welcome-sun"><Sun size={30} strokeWidth={1.2} /></span>
        <svg className="welcome-spark" viewBox="0 0 48 48" fill="none"><path d="M24 2v12m0 20v12M2 24h12m20 0h12M8 8l8 8m16 16 8 8M8 40l8-8M32 16l8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </motion.div>

      <motion.p className="welcome-eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={arrive(0.2)}>GOOD COMPANY. A NEW HORIZON.</motion.p>
      <h2 id="welcome-title" className="welcome-title">
        <span><motion.span initial={{ y: '110%' }} animate={{ y: 0 }} transition={arrive(0.28)}>Off the clock.</motion.span></span>
        <span><motion.span initial={{ y: '110%' }} animate={{ y: 0 }} transition={arrive(0.42)}>On island time.</motion.span></span>
      </h2>
      <motion.p id="welcome-description" className="welcome-description" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={arrive(0.6)}>A little ocean air. A beautiful escape. Together.</motion.p>

      <motion.div className="welcome-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={arrive(0.7)}>
        <div className="welcome-loading-track" aria-hidden="true"><motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 2.6, ease: [0.2, 0.65, 0.3, 1] }} /></div>
        <span>SWITCHING TO ISLAND TIME</span>
      </motion.div>
    </div>

    <WelcomeWaves />

    <div className="welcome-bottomline">
      <div className="welcome-destination"><MapPin size={17} strokeWidth={1.5} aria-hidden="true" /><span>NEXT STOP<strong>{trip.destination}, {trip.country}</strong></span></div>
      <span className="welcome-dates">{trip.shortDateLabel}<span>{trip.duration}</span></span>
      <button ref={skipButton} type="button" className="welcome-skip" onClick={onComplete}>Skip intro <ArrowUpRight size={16} aria-hidden="true" /></button>
    </div>
  </motion.div>
}
