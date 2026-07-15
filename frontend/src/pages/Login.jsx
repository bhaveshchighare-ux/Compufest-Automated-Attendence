import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../lib/api'
import { saveUser } from '../lib/auth'
import { Lock, Mail, Loader2, Sparkles } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await authAPI.login({ email, password })
      saveUser(data.token, data.user)
      // Redirect using location replace to refresh auth state fully
      window.location.replace('/dashboard')
    } catch (err) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-6 select-none">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        {/* Header banner */}
        <div className="bg-blue-900 px-8 py-10 text-white text-center flex flex-col items-center gap-2 relative">
          <div className="absolute top-4 right-4 bg-blue-800 text-blue-100 text-xs px-2.5 py-1 rounded-full font-semibold border border-blue-700 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            2026 Edition
          </div>
          
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-white text-2xl shadow-lg mb-2">
            CF
          </div>
          
          <h2 className="text-xl font-bold tracking-tight">CompuFest 2026</h2>
          <p className="text-sm text-blue-200">Attendance Management System</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6 flex-1">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@compufest.com"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 outline-none text-slate-700 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 outline-none text-slate-700 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed hover:-translate-y-[1px]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>

          <div className="text-center pt-2 border-t border-slate-100 flex flex-col gap-2">
            <span className="text-xs text-slate-400">
              Need access as a Head or Co-Head?
            </span>
            <Link to="/signup" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
              Create Head/Co-Head Account
            </Link>
          </div>
          
          <div className="text-center pt-1">
            <span className="text-[10px] text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 font-mono">
              Default Head Creds: admin@compufest.com / adminpassword
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}
