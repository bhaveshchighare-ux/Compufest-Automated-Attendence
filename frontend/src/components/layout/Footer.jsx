import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <footer className="bg-white border-t border-border-light px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4 group">
              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 400 }}
                className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#5358F3] to-[#9F3BDF] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                  <path d="M6 9l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.div>
              <span className="font-heading font-bold text-lg text-text-dark">
                MockPrep<span className="text-primary">.ai</span>
              </span>
            </Link>
            <p className="font-body text-text-mid text-sm leading-relaxed max-w-xs">
              AI-powered mock interview platform by SuPrazo Technologies. Practice smarter, get hired faster.
            </p>
          </div>

          <div>
            <p className="font-heading font-semibold text-text-dark text-sm mb-4">Product</p>
            <ul className="flex flex-col gap-2">
              {['Features', 'Pricing', 'How It Works'].map(item => (
                <li key={item}>
                  <a href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                    className="font-body text-text-mid hover:text-primary text-sm transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-heading font-semibold text-text-dark text-sm mb-4">Company</p>
            <ul className="flex flex-col gap-2">
              {['About', 'Privacy Policy', 'Terms of Service', 'Contact'].map(item => (
                <li key={item}>
                  {item === 'Contact' ? (
                    <Link to="/contact" className="font-body text-text-mid hover:text-primary text-sm transition-colors">
                      {item}
                    </Link>
                  ) : (
                    <a href="#" className="font-body text-text-mid hover:text-primary text-sm transition-colors">
                      {item}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        <div className="pt-6 border-t border-border-light flex flex-col md:flex-row items-center justify-center gap-4">
          <p className="font-body text-text-light text-xs">© {new Date().getFullYear()} MockPrep.ai · SuPrazo Technologies</p>
        </div>
      </div>
    </footer>
  )
}