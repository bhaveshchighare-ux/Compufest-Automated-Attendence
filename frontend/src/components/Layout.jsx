import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authAPI } from '../lib/api'
import { clearUser, getUser } from '../lib/auth'
import { Users, LayoutDashboard, CalendarDays, History, LogOut, Menu, X, CheckSquare } from 'lucide-react'

export default function Layout({ children }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [user, setUser] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setUser(getUser())
  }, [])

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      clearUser()
      navigate('/login')
    }
  }

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Volunteers', path: '/members', icon: Users },
    { name: 'Mark Attendance', path: '/sessions', icon: CheckSquare },
    { name: 'Attendance History', path: '/history', icon: History },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-blue-900 text-white shrink-0 border-r border-blue-800 shadow-xl">
        <div className="h-16 flex items-center px-6 bg-blue-950 border-b border-blue-800">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-blue-900 font-bold text-xl">C</div>
            <span className="font-bold text-lg tracking-wider">CompuFest '26</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path || (item.path === '/sessions' && location.pathname.startsWith('/session/'))
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {user && (
          <div className="p-4 border-t border-blue-800 bg-blue-950/50 flex flex-col gap-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white uppercase shadow-inner">
                {user.name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate text-white">{user.name}</p>
                <p className="text-xs text-blue-300 truncate capitalize">{user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-blue-700 hover:bg-blue-800 text-xs font-semibold text-blue-100 hover:text-white transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsMobileOpen(false)} />
          <aside className="relative flex flex-col w-72 max-w-xs bg-blue-900 text-white h-full shadow-2xl animate-slide-in">
            <div className="h-16 flex items-center justify-between px-6 bg-blue-950 border-b border-blue-800">
              <span className="font-bold text-lg tracking-wider">CompuFest '26</span>
              <button onClick={() => setIsMobileOpen(false)} className="text-blue-100 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path || (item.path === '/sessions' && location.pathname.startsWith('/session/'))
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            {user && (
              <div className="p-4 border-t border-blue-800 bg-blue-950/50 flex flex-col gap-3">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white uppercase shadow-inner">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold truncate text-white">{user.name}</p>
                    <p className="text-xs text-blue-300 truncate capitalize">{user.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-blue-700 hover:bg-blue-800 text-xs font-semibold text-blue-100 hover:text-white transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-xs shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg hover:text-slate-800 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-slate-800 hidden sm:block">Attendance Management System</h1>
            <h1 className="text-base font-bold text-slate-800 sm:hidden">CompuFest '26</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-blue-50 text-blue-700 font-semibold px-3 py-1 rounded-full text-xs border border-blue-100 uppercase tracking-wide">
              CompuFest 2026
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
