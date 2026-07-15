import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { memberAPI, sessionAPI } from '../lib/api'
import { Users, CheckCircle, XCircle, Percent, Calendar, Plus, ChevronRight, Loader2 } from 'lucide-react'

export default function Dashboard() {
  const [members, setMembers] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [membersRes, sessionsRes] = await Promise.all([
          memberAPI.getAll(),
          sessionAPI.getAll(),
        ])
        setMembers(membersRes.data || [])
        setSessions(sessionsRes.data || [])
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError('Failed to load dashboard data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Calculate statistics based on the most recent session
  const totalMembers = members.length
  const latestSession = sessions.length > 0 ? sessions[0] : null

  let presentCount = 0
  let absentCount = 0
  let attendancePercentage = 0

  if (latestSession && latestSession.attendance) {
    const attendanceMap = latestSession.attendance
    
    // Count present volunteers
    Object.values(attendanceMap).forEach((rec) => {
      if (rec.status === 'Present') presentCount++
      else if (rec.status === 'Absent') absentCount++
    })

    // Unmarked volunteers are considered absent for statistical purposes
    const markedCount = Object.keys(attendanceMap).length
    const unmarkedCount = totalMembers - markedCount
    absentCount += Math.max(0, unmarkedCount)

    attendancePercentage = totalMembers > 0 ? Math.round((presentCount / totalMembers) * 100) : 0
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-900 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Loading dashboard overview...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Welcome header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-800">CompuFest 2026</h2>
            <p className="text-slate-500 text-sm">Welcome back to the attendance console. Here is the latest overview.</p>
          </div>
          <Link
            to="/sessions"
            className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md hover:-translate-y-[1px] transition-all cursor-pointer select-none"
          >
            <Plus className="w-4 h-4" />
            New Session
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Members */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Volunteers</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalMembers}</h3>
            </div>
          </div>

          {/* Card 2: Present (Latest Session) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Present (Latest)</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">
                {latestSession ? presentCount : '--'}
              </h3>
            </div>
          </div>

          {/* Card 3: Absent (Latest Session) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Absent (Latest)</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">
                {latestSession ? absentCount : '--'}
              </h3>
            </div>
          </div>

          {/* Card 4: Attendance Percentage (Latest Session) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Attendance %</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">
                {latestSession ? `${attendancePercentage}%` : '--'}
              </h3>
            </div>
          </div>
        </div>

        {/* Latest Session Banner */}
        {latestSession ? (
          <div className="bg-blue-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-[10px] bg-blue-800 text-blue-200 border border-blue-700 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Latest Active Session
              </span>
              <h3 className="text-lg font-bold mt-2">{latestSession.name}</h3>
              <p className="text-blue-200 text-xs flex items-center gap-1.5 mt-1">
                <Calendar className="w-3.5 h-3.5" />
                Scheduled on {latestSession.date}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-blue-300 font-medium">Session Attendance</p>
                <p className="text-xl font-bold mt-0.5">{attendancePercentage}% Present</p>
              </div>
              <Link
                to={`/session/${latestSession.id}`}
                className="bg-white hover:bg-slate-100 text-blue-900 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                Go to Attendance Sheet
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 border border-slate-200 p-8 rounded-2xl text-center space-y-4">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto" />
            <div>
              <h3 className="text-slate-700 font-bold text-lg">No Attendance Sessions Yet</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
                You need to create an attendance session to start tracking present and absent members.
              </p>
            </div>
            <Link
              to="/sessions"
              className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:-translate-y-[1px] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create First Session
            </Link>
          </div>
        )}

        {/* Recent Sessions Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Recent Sessions</h3>
            <Link to="/history" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
              View History
            </Link>
          </div>
          <div className="overflow-x-auto">
            {sessions.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                    <th className="px-6 py-4">Session Name</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Marked Count</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                  {sessions.slice(0, 5).map((session) => {
                    const markedCount = Object.keys(session.attendance || {}).length
                    return (
                      <tr key={session.id} className="hover:bg-slate-50/55 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">{session.name}</td>
                        <td className="px-6 py-4">{session.date}</td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full text-xs border border-blue-100">
                            {markedCount} / {totalMembers} Volunteers
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/session/${session.id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                          >
                            Open
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm">
                No recent sessions found.
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
