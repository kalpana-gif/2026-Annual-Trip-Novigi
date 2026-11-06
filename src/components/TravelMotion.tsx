import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { ArrowDown, BedDouble, CalendarDays, MapPin, Sun, TreePalm } from 'lucide-react'
import { trip } from '../data/trip'

export const travelEase = [0.22, 1, 0.36, 1] as const

export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 180, damping: 32, restDelta: 0.001 })
  const reducedMotion = useReducedMotion()
  return reducedMotion ? null : <motion.div className="scroll-progress" style={{ scaleX: progress }} aria-hidden="true" />
}

export function Hero({ ready = true }: { ready?: boolean }) {
  const heroRef = useRef<HTMLElement>(null)
  const reducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, 70])
  const entrance = (delay: number) => ({ duration: reducedMotion ? 0 : 0.9, delay: reducedMotion ? 0 : delay, ease: travelEase })
  const rise = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }
  const line = { hidden: { y: '110%', opacity: 0 }, visible: { y: 0, opacity: 1 } }

  return <motion.section ref={heroRef} id="home" className="hero" aria-labelledby="hero-title" initial={reducedMotion ? false : 'hidden'} animate={ready ? 'visible' : 'hidden'}>
    <motion.img
      src={trip.heroImage}
      alt={trip.imageDescription}
      className="hero-image"
      width={trip.heroImageWidth}
      height={trip.heroImageHeight}
      fetchPriority="high"
      style={{ y: reducedMotion ? 0 : backgroundY }}
      variants={{ hidden: { scale: 1.08 }, visible: { scale: 1 } }}
      transition={{ duration: reducedMotion ? 0 : 2.2, ease: travelEase }}
    />
    <div className="hero-shade" />
    <div className="hero-content">
      <motion.div className="hero-eyebrow" variants={rise} transition={entrance(0.12)}>
        <span className="tiny-sun"><Sun size={15} /></span>{trip.name}<span className="eyebrow-line" />
      </motion.div>
      <h1 id="hero-title" aria-label="Good company. Great escapes.">
        <span className="hero-line" aria-hidden="true"><motion.span className="hero-line-sans" variants={line} transition={entrance(0.2)}>Good company.</motion.span></span>
        <span className="hero-line" aria-hidden="true"><motion.span className="hero-line-accent" variants={line} transition={entrance(0.34)}>Great escapes.</motion.span></span>
      </h1>
      <motion.p className="hero-copy" variants={rise} transition={entrance(0.48)}>A little ocean air. A lot of good memories.<br />Let’s step away from the everyday, together.</motion.p>
      <motion.div className="hero-actions" variants={rise} transition={entrance(0.6)}>
        <a href="#trip-details" className="button button-white">Explore Trip Details <ArrowDown size={17} /></a>
        <a href="#rooms" className="button button-glass"><BedDouble size={18} /> Find My Room</a>
      </motion.div>
    </div>
    <motion.div className="escape-seal" aria-hidden="true" variants={{ hidden: { opacity: 0, rotate: -8, scale: 0.9 }, visible: { opacity: 1, rotate: 12, scale: 1 } }} transition={entrance(0.65)}><span>LESS ROUTINE</span><TreePalm size={37} strokeWidth={1.2} /><span>MORE MEMORIES</span></motion.div>
    <motion.div className="hero-bottom" variants={rise} transition={entrance(0.75)}>
      <div><MapPin size={21} strokeWidth={1.6} /><span><span className="hero-meta-label">OUR LITTLE CORNER OF PARADISE</span><strong>{trip.hotel}</strong></span></div>
      <div><CalendarDays size={21} strokeWidth={1.6} /><span><span className="hero-meta-label">SAVE THE DATES</span><strong>{trip.dateLabel}<span className="meta-separator"> / </span><span className="hero-duration">2 nights</span></strong></span></div>
      <a href="#trip-details" className="hero-scroll" aria-label="Scroll to trip details"><ArrowDown size={21} /></a>
    </motion.div>
    <span className="hero-photo-caption">{trip.hotel} · {trip.country}</span>
  </motion.section>
}
