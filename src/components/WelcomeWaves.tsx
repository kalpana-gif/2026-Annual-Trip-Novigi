import { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { trip } from '../data/trip'
import { travelEase } from './TravelMotion'

// Matching curve segments let the photo's silhouette swell like a breaking wave.
const waveShape = 'M14 197 C54 179 57 75 140 30 C196 0 280 8 307 69 C271 48 230 58 220 92 C206 142 259 169 310 168 C354 166 388 151 412 139 C382 183 320 208 256 214 C155 226 89 181 14 197 Z'
const waveSwell = 'M14 197 C55 180 65 83 145 35 C208 0 286 15 310 75 C274 52 233 65 225 99 C215 145 264 164 315 163 C360 160 390 148 412 139 C380 186 318 214 252 216 C150 220 85 177 14 197 Z'

export function WavePhoto() {
  const id = useId()
  const clipId = `welcome-wave-clip-${id}`
  const shadeId = `welcome-wave-shade-${id}`
  const reducedMotion = useReducedMotion()
  const swell = reducedMotion ? undefined : { d: [waveShape, waveSwell, waveShape] }
  const swellTiming = { duration: 4.4, repeat: Infinity, ease: 'easeInOut' as const }

  return <svg className="welcome-wave-photo" viewBox="0 0 420 240" fill="none" aria-hidden="true">
    <defs>
      <clipPath id={clipId}><motion.path d={waveShape} animate={swell} transition={swellTiming} /></clipPath>
      <linearGradient id={shadeId} x1="210" y1="80" x2="210" y2="225" gradientUnits="userSpaceOnUse">
        <stop stopColor="#063b50" stopOpacity="0" /><stop offset="1" stopColor="#063b50" stopOpacity="0.7" />
      </linearGradient>
    </defs>
    <g clipPath={`url(#${clipId})`}>
      <motion.image href={trip.heroImage} width="420" height="240" preserveAspectRatio="xMidYMid slice" initial={reducedMotion ? false : { scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: 3.4, ease: travelEase }} style={{ transformOrigin: '50% 50%' }} />
      <path d="M0 0H420V240H0Z" fill={`url(#${shadeId})`} />
    </g>
    <motion.path className="welcome-wave-rim" d={waveShape} animate={swell} transition={swellTiming} />
    <text className="welcome-photo-caption" x="217" y="184" textAnchor="middle">THE COAST IS CALLING</text>
  </svg>
}

export function WelcomeWaves() {
  return <div className="welcome-ocean" aria-hidden="true">
    <svg className="welcome-tides" viewBox="0 0 1440 180" preserveAspectRatio="none" fill="none">
      <path className="welcome-tide-back" d="M-160 114C100 156 318 146 528 100C700 63 788 29 874 44C842 50 826 67 824 84C948 151 1190 64 1600 100V220H-160Z" />
      <path className="welcome-tide-front" d="M-160 158C18 161 176 148 295 117C387 93 438 77 505 87C485 92 469 103 467 117C649 179 1070 95 1600 144V220H-160Z" />
    </svg>
  </div>
}
