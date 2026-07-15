import { useState, useEffect, useRef, useCallback } from 'react'

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'SDE-2 at Flipkart',
    text: 'MockPrep.ai helped me crack my FAANG interview. The adaptive AI questions were way harder than what I expected in the real thing — and that was exactly what I needed.',
    stars: 5,
    avatar: 'P',
  },
  {
    name: 'Rahul Mehta',
    role: 'Product Manager at Zepto',
    text: 'The HR round practice was incredibly realistic. I went into my actual interview calm and confident because I had already answered similar questions 10 times with AI feedback.',
    stars: 5,
    avatar: 'R',
  },
  {
    name: 'Ananya Iyer',
    role: 'Data Analyst at Swiggy',
    text: 'I loved how instant the feedback was. After every session I knew exactly what to improve. Traditional mock interviews never gave me this level of detail.',
    stars: 5,
    avatar: 'A',
  },
  {
    name: 'Karan Joshi',
    role: 'Backend Engineer at Paytm',
    text: 'The technical domain questions were exactly at the right difficulty. I practiced DSA and system design in one session — something no other platform offered in a conversational format.',
    stars: 5,
    avatar: 'K',
  },
  {
    name: 'Sneha Reddy',
    role: 'Software Engineer at TCS Digital',
    text: 'As a fresher with no prior interview experience, this was a game changer. I did 8 mock sessions before my campus placement and landed my first offer with confidence.',
    stars: 5,
    avatar: 'S',
  },
  {
    name: 'Vikram Nair',
    role: 'ML Engineer at PhonePe',
    text: "The AI actually follows up on your answers — not just reading off a script. When I gave a vague answer, it pushed back and asked me to elaborate. That's what real interviews feel like.",
    stars: 5,
    avatar: 'V',
  },
  {
    name: 'Nisha Kulkarni',
    role: 'Business Analyst at Deloitte',
    text: 'Scored my dream role in consulting after just two weeks of practice. The general aptitude and communication sections were spot on — I walked in knowing I was prepared.',
    stars: 5,
    avatar: 'N',
  },
]

const GAP = 20
const TRANSITION_MS = 550
const AUTO_INTERVAL = 3000
const VISIBLE = 3

// Triple the array: [copy1, copy2, copy3]
// We start in the middle copy (copy2) so we can scroll in both directions freely.
// When we drift too far into copy1 or copy3, we silently snap back to copy2.
const N = testimonials.length
const tripled = [...testimonials, ...testimonials, ...testimonials]

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#5358F3">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function ChevronIcon({ dir }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'left' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
    </svg>
  )
}

function Card({ t, width }) {
  return (
    <div style={{
      flexShrink: 0,
      width: `${width}px`,
      background: '#fff',
      border: '1px solid #e8e8f0',
      borderRadius: '16px',
      padding: '24px',
      boxSizing: 'border-box',
    }}>
      <div style={{ fontSize: '36px', fontWeight: 700, color: '#5358F3', opacity: 0.15, lineHeight: 1, marginBottom: '8px', fontFamily: 'Georgia, serif' }}>"</div>
      <div style={{ display: 'flex', gap: '3px', marginBottom: '12px' }}>
        {Array.from({ length: t.stars }).map((_, i) => <StarIcon key={i} />)}
      </div>
      <p style={{ fontSize: '13.5px', color: '#6b6b80', lineHeight: 1.75, margin: '0 0 20px 0' }}>{t.text}</p>
      <hr style={{ border: 'none', borderTop: '1px solid #f0f0f5', margin: '0 0 14px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, #5358F3, #9F3BDF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0,
        }}>{t.avatar}</div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', margin: 0 }}>{t.name}</p>
          <p style={{ fontSize: 12, color: '#9898b0', margin: 0 }}>{t.role}</p>
        </div>
      </div>
    </div>
  )
}

export default function Testimonials() {
  const containerRef = useRef(null)
  const [cardWidth, setCardWidth] = useState(0)
  // trackIndex: position in the tripled array. Start at N (first card of middle copy).
  const [trackIndex, setTrackIndex] = useState(N)
  const [animated, setAnimated] = useState(false)
  const timerRef = useRef(null)
  const busy = useRef(false)

  // slotWidth = cardWidth + GAP (each card occupies this much horizontal space)
  const slotWidth = cardWidth + GAP

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const total = containerRef.current.offsetWidth
        // 3 cards visible with 2 gaps between them
        setCardWidth((total - GAP * (VISIBLE - 1)) / VISIBLE)
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const moveTo = useCallback((idx, withAnim) => {
    setAnimated(withAnim)
    setTrackIndex(idx)
  }, [])

  // After animation, if we've drifted outside the middle copy, snap back silently
  const onTransitionEnd = useCallback(() => {
    busy.current = false
    setTrackIndex(prev => {
      const middle = ((prev % N) + N) % N + N  // equivalent index in middle copy
      if (prev !== middle) {
        // silent teleport: disable animation then set index
        setAnimated(false)
        return middle
      }
      return prev
    })
  }, [])

  const slide = useCallback((delta) => {
    if (busy.current) return
    busy.current = true
    setTrackIndex(prev => {
      const next = prev + delta
      setAnimated(true)
      return next
    })
  }, [])

  const next = useCallback(() => slide(1), [slide])
  const prev = useCallback(() => slide(-1), [slide])

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(next, AUTO_INTERVAL)
  }, [next])

  useEffect(() => {
    if (cardWidth === 0) return
    startTimer()
    return () => clearInterval(timerRef.current)
  }, [startTimer, cardWidth])

  const handlePrev = () => { prev(); startTimer() }
  const handleNext = () => { next(); startTimer() }
  const handleDot = (dotIdx) => {
    if (busy.current) return
    // Jump to that dotIdx in the middle copy
    const target = N + dotIdx
    const delta = target - trackIndex
    // Take shortest path (could go +/-)
    moveTo(trackIndex + delta, true)
    startTimer()
  }

  const activeDot = ((trackIndex % N) + N) % N
  const translateX = trackIndex * slotWidth

  return (
    <section id="testimonials" style={{ background: '#fff', padding: '96px 24px', overflow: 'hidden' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#5358F3', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px 0' }}>
            Testimonials
          </p>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, color: '#1a1a2e', margin: '0 0 12px 0', lineHeight: 1.2 }}>
            Loved by <span style={{ color: '#5358F3' }}>students</span> everywhere
          </h2>
          <p style={{ fontSize: '17px', color: '#6b6b80', margin: 0 }}>Real results from real candidates.</p>
        </div>

        {/* Viewport */}
        <div ref={containerRef} style={{ overflow: 'hidden' }}>
          {cardWidth > 0 && (
            <div
              onTransitionEnd={onTransitionEnd}
              style={{
                display: 'flex',
                gap: `${GAP}px`,
                transform: `translateX(-${translateX}px)`,
                transition: animated ? `transform ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)` : 'none',
                willChange: 'transform',
              }}
            >
              {tripled.map((t, i) => (
                <Card key={i} t={t} width={cardWidth} />
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '36px' }}>
          <button
            onClick={handlePrev}
            aria-label="Previous"
            style={{
              width: 38, height: 38, borderRadius: '50%', border: '1px solid #e0e0ec',
              background: '#fff', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#1a1a2e',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f5f5fc'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            <ChevronIcon dir="left" />
          </button>

          <div style={{ display: 'flex', gap: '7px' }}>
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => handleDot(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                style={{
                  width: i === activeDot ? '22px' : '8px',
                  height: '8px', borderRadius: '4px', border: 'none',
                  background: i === activeDot ? '#5358F3' : '#d4d4e8',
                  cursor: 'pointer', padding: 0,
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            aria-label="Next"
            style={{
              width: 38, height: 38, borderRadius: '50%', border: '1px solid #e0e0ec',
              background: '#fff', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#1a1a2e',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f5f5fc'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            <ChevronIcon dir="right" />
          </button>
        </div>

      </div>
    </section>
  )
}