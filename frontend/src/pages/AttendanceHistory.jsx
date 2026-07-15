import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { sessionAPI, memberAPI } from '../lib/api'
import * as XLSX from 'xlsx'
import { History, Search, Calendar, FileSpreadsheet, ChevronRight, Loader2, ArrowUpDown } from 'lucide-react'

export default function AttendanceHistory() {
  const [sessions, setSessions] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Date filter state
  const [selectedDate, setSelectedDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [sessionsRes, membersRes] = await Promise.all([
        sessionAPI.getAll(),
        memberAPI.getAll()
      ])
      setSessions(sessionsRes.data || [])
      setMembers(membersRes.data || [])
    } catch (err) {
      console.error(err)
      setError('Failed to load session history archives.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleDownloadExcel = (session) => {
    if (!session || members.length === 0) return

    const attendanceMap = session.attendance || {}
    const reportRows = members.map(m => {
      const record = attendanceMap[m.registrationNumber] || {}
      return {
        'Registration Number': m.registrationNumber,
        'Name': m.name,
        'Department': m.department,
        'Committee': m.committee,
        'Role': m.role,
        'Attendance Status': record.status || 'Absent',
        'Timestamp': record.timestamp ? new Date(record.timestamp).toLocaleString() : 'Not Marked'
      }
    })

    const ws = XLSX.utils.json_to_sheet(reportRows)
    
    // Auto-fit column widths
    const maxLengths = {}
    reportRows.forEach(row => {
      Object.keys(row).forEach(key => {
        const val = row[key] ? row[key].toString() : ''
        maxLengths[key] = Math.max(maxLengths[key] || 10, val.length)
      })
    })
    ws['!cols'] = Object.keys(maxLengths).map(key => ({ wch: maxLengths[key] + 3 }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance History')
    
    const safeName = session.name.replace(/[^a-z0-9]/gi, '_')
    XLSX.writeFile(wb, `${safeName}_Attendance_History_Report.xlsx`)
  }

  // Filter sessions by date and text search
  const filteredSessions = sessions.filter(session => {
    const matchDate = !selectedDate || session.date === selectedDate
    const matchText = !searchQuery || session.name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchDate && matchText
  })

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <History className="w-6 h-6 text-blue-900" />
              Attendance History
            </h2>
            <p className="text-slate-500 text-sm">Review, filter, and download Excel logs from previous attendance sessions.</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search session by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none text-slate-700 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm"
            />
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Calendar className="w-4 h-4" />
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none text-slate-700 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm cursor-pointer"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* History Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-900 animate-spin mb-3" />
              <p className="text-slate-500 text-sm">Loading historical archives...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                    <th className="px-6 py-4">Session Name</th>
                    <th className="px-6 py-4">Event Date</th>
                    <th className="px-6 py-4">Attendance Stats</th>
                    <th className="px-6 py-4">Percentage</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                  {filteredSessions.length > 0 ? (
                    filteredSessions.map((session) => {
                      const totalVolunteers = members.length
                      let presentCount = 0
                      
                      Object.values(session.attendance || {}).forEach(rec => {
                        if (rec.status === 'Present') presentCount++
                      })
                      
                      const attendancePercent = totalVolunteers > 0 ? Math.round((presentCount / totalVolunteers) * 100) : 0
                      const absentCount = totalVolunteers - presentCount

                      return (
                        <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-800">{session.name}</td>
                          <td className="px-6 py-4 font-mono text-xs">{session.date}</td>
                          <td className="px-6 py-4">
                            <span className="text-slate-600 font-medium">
                              {presentCount} Present
                            </span>
                            <span className="text-slate-400 mx-1.5">•</span>
                            <span className="text-slate-400">
                              {absentCount} Absent
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-blue-900">{attendancePercent}%</td>
                          <td className="px-6 py-4 text-center space-x-3">
                            <Link
                              to={`/session/${session.id}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                            >
                              Open Sheet
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => handleDownloadExcel(session)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                              title="Download Excel Report"
                            >
                              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                              Excel Report
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400 text-sm">
                        No previous sessions match the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
