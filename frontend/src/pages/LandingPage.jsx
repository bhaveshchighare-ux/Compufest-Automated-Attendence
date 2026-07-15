import Navbar from '../components/layout/Navbar'
import Hero from '../components/sections/Hero'
import Features from '../components/sections/Features'
import HowItWorks from '../components/sections/HowItWorks'
import Testimonials from '../components/sections/Testimonials'
import Pricing from '../components/sections/Pricing'
import Footer from '../components/layout/Footer'

export default function LandingPage() {
  return (
    <main className="bg-white min-h-screen font-body">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <Footer />
    </main>
  )
}