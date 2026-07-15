import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-border-light' : 'bg-white'
      }`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div
            whileHover={{scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400 }}
            className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M6 9l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
          <span className="font-heading font-bold text-lg text-text-dark">
            MockPrep<span className="text-primary">.ai</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'Features', href: '#features' },
            { label: 'Pricing', href: '#pricing' },
            { label: 'How It Works', href: '#how-it-works' },
          ].map((item, i) => (
            <motion.a
              key={item.label}
              href={item.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="relative text-text-mid hover:text-primary text-sm font-body font-medium transition-colors duration-200 group">
              {item.label}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300 rounded-full" />
            </motion.a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}>
            <Link to="/login"
              className="text-sm font-body font-medium text-text-mid hover:text-primary transition-colors px-4 py-2">
              Login
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}>
            <Link to="/signup"
              className="text-sm font-body font-semibold bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white px-5 py-2.5 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-primary/30">
              Get Started →
            </Link>
          </motion.div>
        </div>

        <button className="md:hidden text-text-mid" onClick={() => setMenuOpen(!menuOpen)}>
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            {menuOpen
              ? <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              : <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            }
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden bg-white border-t border-border-light px-6 py-4 flex flex-col gap-4 overflow-hidden">
            {['Features', 'Pricing', 'How It Works'].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="text-text-mid text-sm font-medium hover:text-primary transition-colors"
                onClick={() => setMenuOpen(false)}>
                {item}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-border-light">
              <Link to="/login" className="text-center text-sm text-text-mid py-2">Login</Link>
              <Link to="/signup" className="text-center bg-gradient-to-b from-[#5358F3] to-[#9F3BDF] text-white py-2.5 rounded-lg text-sm font-semibold">Get Started</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}