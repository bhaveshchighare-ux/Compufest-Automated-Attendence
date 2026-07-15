import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import heroImg from '../../assets/hero.png'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: 'easeOut' },
})

export default function Hero() {
  return (
    <section className="min-h-screen bg-white pt-20 overflow-hidden relative">
      {/* Subtle bg blobs */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-16 flex flex-col lg:flex-row items-center gap-12">
        {/* Left */}
        <div className="flex-1 flex flex-col gap-6">
          <motion.div {...fadeUp(0.1)}
            className="inline-flex items-center gap-2 bg-primary-50 border border-primary/20 rounded-full px-4 py-1.5 w-fit">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-xs font-body font-semibold tracking-wide">
              AI-Powered Mock Interviews
            </span>
          </motion.div>

          <motion.h1 {...fadeUp(0.2)}
            className="font-heading font-bold text-5xl md:text-6xl text-text-dark leading-[1.1]">
            Practice Real <br />
            Interviews with{' '}
            <span className="relative inline-block text-primary">
              AI
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 0.5, ease: 'easeOut' }}
                style={{ originX: 0 }}
                className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-[#5358F3] to-[#9F3BDF] rounded-full"
              />
            </span>
          </motion.h1>

          <motion.p {...fadeUp(0.3)}
            className="font-body text-text-mid text-lg leading-relaxed max-w-lg">
            Upload your resume, practice role-specific interview questions and get AI feedback to land your dream job faster.
          </motion.p>

          <motion.div {...fadeUp(0.35)} className="flex items-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <motion.svg
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.07 }}
                  width="16" height="16" viewBox="0 0 24 24" fill="#5358F3">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </motion.svg>
              ))}
            </div>
            <span className="font-body text-sm text-text-mid">4.9/5 from 2,000+ reviews</span>
          </motion.div>

          <motion.div {...fadeUp(0.45)} className="flex flex-col sm:flex-row gap-3 mt-2">
            <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link to="/signup"
                className="group inline-flex items-center justify-center gap-2 bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white font-body font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-primary/30">
                Start Free — No Credit Card
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                </svg>
              </Link>
            </motion.div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center justify-center gap-2 border border-border-light hover:border-primary/30 text-text-mid hover:text-primary font-body font-medium px-7 py-3.5 rounded-xl transition-all duration-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Watch Demo
            </motion.button>
          </motion.div>

          <motion.div {...fadeUp(0.55)} className="flex items-center gap-3 mt-2">
            <div className="flex -space-x-2">
              {[
              'https://randomuser.me/api/portraits/women/26.jpg',
              'https://randomuser.me/api/portraits/men/22.jpg',
              'https://randomuser.me/api/portraits/women/17.jpg',
              'https://randomuser.me/api/portraits/men/18.jpg',
              ].map((src, i) => (
                <motion.img
                  key={i}
                  src={src}
                  alt={`User ${i + 1}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.08 }}
                  className="w-8 h-8 rounded-full border-2 border-white object-cover"
                  style={{ zIndex: 4 - i }}
                />
              ))}
            </div>
            <span className="font-body text-sm text-text-light">10,000+ students practicing daily</span>
          </motion.div>
        </div>

        {/* Right — Image */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
          className="flex-1 flex items-center justify-center">
          <motion.img
            src={heroImg}
            alt="Hero"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-full max-w-sm md:max-w-md lg:max-w-lg object-contain drop-shadow-xl"
          />
        </motion.div>
      </div>
    </section>
  )
}