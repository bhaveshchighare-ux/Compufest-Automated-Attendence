import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Upload, Mic, Bot, ClipboardList } from 'lucide-react'

const steps = [
  { num: '01', icon: Upload, title: 'Upload Your Resume', desc: 'Share your resume and let AI understand your background, skills, and target role.' },
  { num: '02', icon: Mic, title: 'Choose Interview Mode', desc: 'Pick Technical, HR, or General round. AI customizes the session for you.' },
  { num: '03', icon: Bot, title: 'Practice with AI', desc: 'Answer adaptive questions in a realistic interview environment. Speak naturally.' },
  { num: '04', icon: ClipboardList, title: 'Get Instant Feedback', desc: 'Receive scores, summaries, strengths, and actionable improvement tips instantly.' },
]

export default function HowItWorks() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const stepsRef = useRef(null)
  const stepsInView = useInView(stepsRef, { once: true, margin: '-80px' })

  return (
    <section id="how-it-works" className="bg-bg-light py-28 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">

        {/* Heading */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-24">
          <p className="font-body text-primary text-sm font-semibold tracking-wide uppercase mb-3">
            How It Works
          </p>
          <h2 className="font-heading font-bold text-4xl md:text-5xl text-text-dark mb-4">
            Four Steps to Your <span className="text-primary">Dream Job</span>
          </h2>
          <p className="font-body text-text-mid text-lg max-w-xl mx-auto">
            Simple, fast, and designed to get you interview-ready in days.
          </p>
        </motion.div>

      
        {/* Steps */}
        <div ref={stepsRef} className="relative">

          {/* LINE SEGMENTS */}
          <div className="hidden lg:flex absolute top-[52px] left-[calc(12.5%+40px)] right-[calc(12.5%+40px)] justify-between pointer-events-none">
            {[0, 1, 2].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scaleX: 0 }}
                animate={stepsInView ? { scaleX: 1 } : {}}
                transition={{
                  duration: 0.6,
                  delay: 1.2 + i * 1.8, // AFTER text appears
                  ease: 'easeInOut',
                }}
                style={{ originX: 0 }}
                className="flex-1 mx-4 h-px border-t-2 border-dashed border-primary/40"
              />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => {
              const Icon = step.icon

              const baseDelay = i * 1.8 // MASTER CONTROL

              return (
                <div key={i} className="flex flex-col items-center text-center">

                  {/* ICON */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={stepsInView ? { opacity: 1, scale: 1, y: 0 } : {}}
                    transition={{
                      duration: 0.6,
                      delay: 0.3 + baseDelay,
                      type: 'spring',
                      stiffness: 120,
                    }}
                    className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex flex-col items-center justify-center mb-6 z-10 shadow-md shadow-primary/10"
                  >
                    <Icon className="w-8 h-8 text-primary mb-1" strokeWidth={1.8} />
                    <span className="font-heading font-bold text-xs text-primary">{step.num}</span>
                  </motion.div>

                  {/* TITLE */}
                  <motion.h3
                    initial={{ opacity: 0, y: 15 }}
                    animate={stepsInView ? { opacity: 1, y: 0 } : {}}
                    transition={{
                      duration: 0.5,
                      delay: 0.7 + baseDelay, // AFTER icon
                    }}
                    className="font-heading font-semibold text-base text-text-dark mb-2"
                  >
                    {step.title}
                  </motion.h3>

                  {/* DESC */}
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={stepsInView ? { opacity: 1, y: 0 } : {}}
                    transition={{
                      duration: 0.5,
                      delay: 1.0 + baseDelay, // AFTER title
                    }}
                    className="font-body text-text-mid text-sm leading-relaxed"
                  >
                    {step.desc}
                  </motion.p>

                </div>
              )
            })}
          </div>
        </div>

        {/* Trusted By */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-28">
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-text-dark mb-14">
            Trusted By Job Seekers{' '}
            <span className="text-primary">Who've Applied At</span>
          </h2>

          <div className="overflow-hidden w-full">
            <motion.div
              animate={{ x: ['0%', '-50%'] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="flex w-max">
              {[...Array(2)].map((_, setIdx) => (
                <div key={setIdx} className="flex items-center gap-24 px-12">
                  {['microsoft', 'amazon', 'openai', 'spacex', 'netflix', 'google', 'meta'].map(logo => (
                    <img
                      key={logo}
                      src={`/logos/${logo}.png`}
                      className="h-10 object-contain transition-all duration-300"
                      alt={logo}
                    />
                  ))}
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>

      </div>
    </section>
  )
}