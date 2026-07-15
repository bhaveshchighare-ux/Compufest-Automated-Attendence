import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Bot, FileText, Star, BarChart3, TrendingUp, Target } from 'lucide-react'

const features = [
  { icon: Bot, title: 'AI Powered Interviews', desc: 'Real two-way conversations with adaptive AI that follows up based on your answers.' },
  { icon: FileText, title: 'Resume-Based Personalization', desc: 'AI reads your resume and tailors questions to your experience and target role.' },
  { icon: Star, title: 'Voice Based Reviews', desc: 'Speak your answers naturally — AI evaluates tone, clarity, and content in real time.' },
  { icon: BarChart3, title: 'Instant Feedback Reports', desc: 'Get structured scores, strengths, and improvement areas immediately after each session.' },
  { icon: TrendingUp, title: 'Progress Tracking', desc: 'Track your improvement across sessions and see which areas need more practice.' },
  { icon: Target, title: 'Multiple Interview Rounds', desc: 'Technical, HR, and General Aptitude — all in a single 25-minute AI-driven session.' },
]

function FeatureCard({ f, i }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const Icon = f.icon

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
      whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(83,88,243,0.10)' }}
      className="group bg-white border border-border-light rounded-2xl p-6 transition-colors duration-300 hover:border-primary/20 cursor-default">
      <motion.div
        whileHover={{ scale: 1.1}}
        transition={{ type: 'spring', stiffness: 300 }}
        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center mb-5">
        <Icon className="w-6 h-6 text-primary" strokeWidth={2} />
      </motion.div>
      <h3 className="font-heading font-semibold text-lg text-text-dark mb-2">{f.title}</h3>
      <p className="font-body text-text-mid text-sm leading-relaxed">{f.desc}</p>
    </motion.div>
  )
}

export default function Features() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="features" className="bg-white py-28 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20">
          <p className="text-primary text-sm font-semibold uppercase mb-3 tracking-wide">Features</p>
          <h2 className="font-heading font-bold text-4xl md:text-5xl text-text-dark mb-4">
            Everything You Need to{' '}
            <span className="text-primary">Ace Your Interview</span>
          </h2>
          <p className="font-body text-text-mid text-lg max-w-2xl mx-auto">
            From resume parsing to AI feedback — everything in one place.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => <FeatureCard key={i} f={f} i={i} />)}
        </div>
      </div>
    </section>
  )
}