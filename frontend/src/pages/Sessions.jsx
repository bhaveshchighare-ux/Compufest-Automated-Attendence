import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { sessionAPI, memberAPI } from '../lib/api'
import { CalendarDays, Plus, Trash2, ChevronRight, Loader2, Calendar, X } from 'lucide-react'

export default function Sessions() {
  const [sessions, setSessions] = useState([])
  const [membersCount, setMembersCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Create Session Form State
  const [name, setName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const navigate = useNavigate()

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [sessionsRes, membersRes] = await Promise.all([
        sessionAPI.getAll(),
        memberAPI.getAll()
      ])
      setSessions(sessionsRes.data || [])
      setMembersCount(membersRes.data?.length || 0)
    } catch (err) {
      console.error(err)
      setError('Failed to load sessions data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    
    setCreateError('')
    setCreateLoading(true)
    try {
      const res = await sessionAPI.create({ name, date })
      setIsCreateOpen(false)
      // Redirect to mark attendance for the new session immediately
      navigate(`/session/${res.data.id}`)
    } catch (err) {
      setCreateError(err.message || 'Failed to create session')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete session "${name}"? All recorded attendance for this session will be permanently lost.`)) {
      return
    }

    try {
      await sessionAPI.delete(id)
      fetchData()
    } catch (err) {
      alert(err.message || 'Failed to delete session')
    }
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Header banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-blue-900" />
              Attendance Sessions
            </h2>
            <p className="text-slate-500 text-sm">Create and launch attendance sheets for CompuFest events.</p>
          </div>
          <button
            onClick={() => {
              setName('')
              setDate(new Date().toISOString().split('T')[0])
              setCreateError('')
              setIsCreateOpen(true)
            }}
            className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md hover:-translate-y-[1px] transition-all cursor-pointer select-none"
          >
            <Plus className="w-4 h-4" />
            Create Session
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium animate-shake">
            {error}
          </div>
        )}

        {/* Sessions list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-900 animate-spin mb-3" />
            <p className="text-slate-500 text-sm">Loading sessions list...</p>
          </div>
        ) : sessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => {
              const markedCount = Object.keys(session.attendance || {}).length
              return (
                <div key={session.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-slate-800 text-base leading-snug line-clamp-2">{session.name}</h3>
                      <button
                        onClick={() => handleDelete(session.id, session.name)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shrink-0"
                        title="Delete Session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>Event Date: {session.date}</span>
                    </div>

                    <div className="pt-2">
                      <span className="bg-blue-50 text-blue-800 border border-blue-100 px-3 py-1 rounded-full text-xs font-semibold">
                        {markedCount} / {membersCount} Marked
                      </span>
                    </div>
                  </div>

                  <Link
                    to={`/session/${session.id}`}
                    className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700 hover:text-blue-900 hover:bg-slate-100/70 transition-all"
                  >
                    Open Attendance Sheet
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 p-12 rounded-2xl text-center space-y-4 shadow-sm">
            <CalendarDays className="w-14 h-14 text-slate-300 mx-auto" />
            <div>
              <h3 className="text-slate-700 font-bold text-lg">No Sessions Found</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
                Establish an attendance session for the volunteers by clicking the button above.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs select-none">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-zoom-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Create Attendance Session</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-medium">
                  {createError}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Session Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Day 1 Afternoon Session"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Session Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                />
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
                >
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Launch Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
