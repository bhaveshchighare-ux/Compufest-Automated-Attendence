import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../lib/api'
import { saveUser } from '../lib/auth'
import { Lock, Mail, User, Shield, Loader2 } from 'lucide-react'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('Co-Head')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await authAPI.signup({ name, email, password, role })
      saveUser(data.token, data.user)
      window.location.replace('/dashboard')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-6 select-none">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        {/* Header banner */}
        <div className="bg-blue-900 px-8 py-8 text-white text-center flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-white text-xl shadow-lg mb-1">
            CF
          </div>
          <h2 className="text-xl font-bold tracking-tight">Create Account</h2>
          <p className="text-sm text-blue-200">CompuFest 2026 Admin Portal</p>
        </div>

        {/* Signup form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5 flex-1">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Full Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <User className="w-5 h-5" />
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-700 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm"
              />
            </div>
          </div>

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
                placeholder="john@compufest.com"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-700 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm"
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
                placeholder="Min. 6 characters"
                minLength={6}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-700 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">System Role</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Shield className="w-5 h-5" />
              </span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-700 bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm appearance-none cursor-pointer"
              >
                <option value="Head">Head (Full Access)</option>
                <option value="Co-Head">Co-Head (Full Access)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed hover:-translate-y-[1px]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Create Account'
            )}
          </button>

          <div className="text-center pt-2 border-t border-slate-100 flex flex-col gap-2">
            <span className="text-xs text-slate-400">
              Already have an account?
            </span>
            <Link to="/login" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
              Sign In Here
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
