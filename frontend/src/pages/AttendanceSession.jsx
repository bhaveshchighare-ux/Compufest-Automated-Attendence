import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { sessionAPI, memberAPI } from '../lib/api'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import { 
  ArrowLeft, Search, Check, X, FileSpreadsheet, Loader2, 
  CloudLightning, CheckSquare, RefreshCw, AlertCircle, FileText
} from 'lucide-react'

export default function AttendanceSession() {
  const { id } = useParams()
  const [session, setSession] = useState(null)
  const [members, setMembers] = useState([])
  const [attendance, setAttendance] = useState({}) // registrationNumber -> { status, timestamp }
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [commFilter, setCommFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Auto-save notification state
  const [saveStatus, setSaveStatus] = useState('saved') // 'saving' | 'saved' | 'error'

  // YCCE PDF Details Form State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [pdfForm, setPdfForm] = useState({
    programme: 'B.Tech',
    semester: 'V Semester',
    section: 'A',
    date: '',
    inCampusName: 'CompuFest 2026',
    inCampusPurpose: 'Volunteer Attendance and Event Management Coordination',
    inCampusTime: '10:00 AM - 5:00 PM',
    outCampusName: '',
    outCampusPurpose: '',
    outCampusCollege: 'Yeshwantrao Chavan College of Engineering',
    outCampusCity: 'Nagpur',
    outCampusTime: ''
  })

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [sessionRes, membersRes] = await Promise.all([
        sessionAPI.getById(id),
        memberAPI.getAll()
      ])
      setSession(sessionRes.data)
      setAttendance(sessionRes.data?.attendance || {})
      setMembers(membersRes.data || [])
      
      if (sessionRes.data) {
        setPdfForm(prev => ({
          ...prev,
          date: sessionRes.data.date || new Date().toISOString().split('T')[0]
        }))
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load attendance session roster.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const markAttendance = async (regNo, status) => {
    // 1. Optimistic Update (Immediate UI response for that specific member only)
    const prevAttendance = { ...attendance }
    const tempRecord = {
      status,
      timestamp: new Date().toISOString()
    }
    
    setAttendance(prev => ({
      ...prev,
      [regNo]: tempRecord
    }))
    setSaveStatus('saving')

    // 2. Network Request in Background
    try {
      const res = await sessionAPI.updateAttendance(id, regNo, status)
      
      // Update ONLY the marked member's record from the server response
      if (res.data?.attendance && res.data.attendance[regNo]) {
        setAttendance(prev => ({
          ...prev,
          [regNo]: res.data.attendance[regNo]
        }))
      }
      setSaveStatus('saved')
    } catch (err) {
      console.error(err)
      setSaveStatus('error')
      // Rollback ONLY this member's state on failure
      setAttendance(prev => {
        const copy = { ...prev }
        if (prevAttendance[regNo]) {
          copy[regNo] = prevAttendance[regNo]
        } else {
          delete copy[regNo]
        }
        return copy
      })
      alert(`Auto-save failed for ${regNo}. Please check your connection.`)
    }
  }

  const handleDownloadExcel = () => {
    if (!session || members.length === 0) return

    const reportRows = members.map(m => {
      const record = attendance[m.registrationNumber] || {}
      return {
        'Registration Number': m.registrationNumber,
        'Name': m.name,
        'Department': m.department || 'C.tech',
        'Branch': m.branch || 'C.tech',
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
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Sheet')
    
    const safeName = session.name.replace(/[^a-z0-9]/gi, '_')
    XLSX.writeFile(wb, `${safeName}_Attendance_Excel_Report.xlsx`)
  }

  const handleGeneratePdf = () => {
    if (!session || members.length === 0) return

    // Filter to only present students
    const presentStudents = members.filter(m => attendance[m.registrationNumber]?.status === 'Present')

    // Initialize jsPDF (A4 page format: 210mm x 297mm)
    const doc = new jsPDF()
    doc.setFont("times", "normal")

    // YCCE Header
    doc.setFontSize(14)
    doc.setFont("times", "bold")
    doc.text("Yeshwantrao Chavan College of Engineering", 105, 15, { align: "center" })
    doc.setFontSize(9)
    doc.setFont("times", "normal")
    doc.text("(An Autonomous Institution affiliated to Rashtrasant Tukadoji Maharaj Nagpur University)", 105, 20, { align: "center" })
    doc.setFontSize(11)
    doc.setFont("times", "bold")
    doc.text("Department of Computer Technology", 105, 26, { align: "center" })

    // Border line
    doc.line(15, 29, 195, 29)

    // Title
    doc.setFontSize(13)
    doc.text("Attendance Application", 105, 36, { align: "center" })
    doc.line(80, 38, 130, 38) // underline title

    // Programme / Sem / Section / Date
    doc.setFontSize(10)
    doc.setFont("times", "normal")
    doc.text(`Programme: ${pdfForm.programme}`, 15, 46)
    doc.text(`Semester: ${pdfForm.semester}`, 75, 46)
    doc.text(`Section: ${pdfForm.section}`, 125, 46)
    doc.text(`Date: ${pdfForm.date}`, 165, 46)

    doc.line(15, 49, 195, 49)

    // In Campus Details
    doc.setFont("times", "bold")
    doc.text("In Campus Details:", 15, 55)
    doc.setFont("times", "normal")
    doc.text(`Name of Program/Event :  ${pdfForm.inCampusName || 'N/A'}`, 15, 61)
    doc.text(`Purpose                       :  ${pdfForm.inCampusPurpose || 'N/A'}`, 15, 67)
    doc.text(`Time                            :  ${pdfForm.inCampusTime || 'N/A'}`, 15, 73)

    doc.line(15, 76, 195, 76)

    // Out of Campus Details
    doc.setFont("times", "bold")
    doc.text("Out of Campus Details:", 15, 82)
    doc.setFont("times", "normal")
    doc.text(`Name of Program/Event :  ${pdfForm.outCampusName || 'N/A'}`, 15, 88)
    doc.text(`Purpose                       :  ${pdfForm.outCampusPurpose || 'N/A'}`, 15, 94)
    doc.text(`Name of College            :  ${pdfForm.outCampusCollege || 'N/A'}`, 15, 100)
    doc.text(`City / Location             :  ${pdfForm.outCampusCity || 'N/A'}`, 15, 106)
    doc.text(`Time                            :  ${pdfForm.outCampusTime || 'N/A'}`, 15, 112)

    doc.line(15, 115, 195, 115)

    // Student Table Header
    doc.setFont("times", "bold")
    doc.text("Student Details (Present Volunteers only):", 15, 122)

    let startY = 126
    
    // Draw table headers
    doc.rect(15, startY, 180, 8)
    doc.text("Sr No", 17, startY + 5.5)
    doc.line(30, startY, 30, startY + 8)
    doc.text("Name of Students", 33, startY + 5.5)
    doc.line(135, startY, 135, startY + 8)
    doc.text("Roll No / Reg. Number", 138, startY + 5.5)

    startY += 8
    doc.setFont("times", "normal")

    // Draw students
    if (presentStudents.length > 0) {
      presentStudents.forEach((student, index) => {
        // Page break check (max safe height on page is ~275)
        if (startY > 265) {
          doc.addPage()
          startY = 20
          
          // Re-draw table headers on new page
          doc.setFont("times", "bold")
          doc.rect(15, startY, 180, 8)
          doc.text("Sr No", 17, startY + 5.5)
          doc.line(30, startY, 30, startY + 8)
          doc.text("Name of Students", 33, startY + 5.5)
          doc.line(135, startY, 135, startY + 8)
          doc.text("Roll No / Reg. Number", 138, startY + 5.5)
          startY += 8
          doc.setFont("times", "normal")
        }

        doc.rect(15, startY, 180, 8)
        doc.text((index + 1).toString(), 17, startY + 5.5)
        doc.line(30, startY, 30, startY + 8)
        doc.text(student.name, 33, startY + 5.5)
        doc.line(135, startY, 135, startY + 8)
        doc.text(student.registrationNumber, 138, startY + 5.5)
        
        startY += 8
      })
    } else {
      doc.rect(15, startY, 180, 8)
      doc.text("No volunteers marked present for this session.", 33, startY + 5.5)
      startY += 8
    }

    // Signatures / Footer check
    if (startY > 240) {
      doc.addPage()
      startY = 20
    }

    startY += 10
    doc.line(15, startY, 195, startY)
    
    startY += 8
    doc.setFont("times", "bold")
    doc.text("Forwarded By:", 15, startY)

    startY += 16
    doc.setFont("times", "normal")
    doc.text("Signature of Coordinator", 15, startY)
    doc.text("HOD Signature Placeholder", 130, startY)

    startY += 6
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, startY)
    doc.text("Date: __________________", 130, startY)

    // Save and download PDF
    const safeName = session.name.replace(/[^a-z0-9]/gi, '_')
    doc.save(`YCCE_Attendance_Application_${safeName}.pdf`)
    setIsPdfModalOpen(false)
  }

  // Filters
  const uniqueBranches = ['AIDS', 'C.tech', 'IoT']
  const uniqueComms = [...new Set(members.map(m => m.committee).filter(Boolean))].sort()

  const filteredMembers = members.filter(m => {
    const matchSearch = 
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.registrationNumber?.toLowerCase().includes(search.toLowerCase()) ||
      m.committee?.toLowerCase().includes(search.toLowerCase())
    const matchBranch = !branchFilter || m.branch === branchFilter
    const matchComm = !commFilter || m.committee === commFilter
    return matchSearch && matchBranch && matchComm
  })

  // Counting stats
  const totalCount = members.length
  let presentCount = 0
  let absentCount = 0

  members.forEach(m => {
    const rec = attendance[m.registrationNumber]
    if (rec?.status === 'Present') presentCount++
    else absentCount++ // Unmarked defaults to absent
  })

  const attendancePercent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-900 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Fetching attendance roster...</p>
        </div>
      </Layout>
    )
  }

  if (error || !session) {
    return (
      <Layout>
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center space-y-4 max-w-lg mx-auto">
          <AlertCircle className="w-12 h-12 text-rose-600 mx-auto" />
          <h3 className="text-rose-800 font-bold text-lg">Error Loading Session</h3>
          <p className="text-rose-700 text-sm">{error || 'Session not found.'}</p>
          <Link to="/sessions" className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:text-blue-900">
            <ArrowLeft className="w-4 h-4" /> Back to Sessions
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Navigation / Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative">
          <div className="flex items-start gap-4">
            <Link
              to="/sessions"
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h2 className="text-lg font-bold text-slate-800 leading-snug">{session.name}</h2>
              <p className="text-slate-500 text-xs mt-1">Date: {session.date} • Volunteers Sheet</p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            {/* Auto-Save Badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold select-none border">
              {saveStatus === 'saving' && (
                <span className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border">
                  <CloudLightning className="w-3.5 h-3.5 animate-bounce" /> Auto-Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border">
                  <Check className="w-3.5 h-3.5" /> All Changes Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border">
                  <AlertCircle className="w-3.5 h-3.5" /> Save Failed
                </span>
              )}
            </div>

            {/* Generate Excel Report Button */}
            <button
              onClick={handleDownloadExcel}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-blue-900 border border-blue-200 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer select-none"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Download Excel
            </button>

            {/* Generate PDF Report Button */}
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md hover:-translate-y-[1px] transition-all cursor-pointer select-none"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              Generate Report (PDF)
            </button>
          </div>
        </div>

        {/* Stats card Row */}
        <div className="grid grid-cols-3 gap-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="space-y-1">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Present</p>
            <p className="text-2xl font-bold text-emerald-600">{presentCount}</p>
          </div>
          <div className="space-y-1 border-x border-slate-100">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Absent</p>
            <p className="text-2xl font-bold text-rose-600">{absentCount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Attendance %</p>
            <p className="text-2xl font-bold text-blue-900">{attendancePercent}%</p>
          </div>
        </div>

        {/* Filters and search */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by name, reg, or committee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none text-slate-700 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm"
            />
          </div>

          <div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none text-slate-700 bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm cursor-pointer"
            >
              <option value="">All Branches</option>
              {uniqueBranches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={commFilter}
              onChange={(e) => setCommFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none text-slate-700 bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-sm cursor-pointer"
            >
              <option value="">All Committees</option>
              {uniqueComms.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Attendance Marking Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                  <th className="px-6 py-4">Reg. Number</th>
                  <th className="px-6 py-4">Full Name</th>
                  <th className="px-6 py-4">Department & Branch</th>
                  <th className="px-6 py-4">Committee & Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Marked Time</th>
                  <th className="px-6 py-4 text-center">Attendance Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => {
                    const record = attendance[member.registrationNumber] || {}
                    const isPresent = record.status === 'Present'
                    const isAbsent = record.status === 'Absent'
                    const hasStatus = !!record.status
                    
                    return (
                      <tr key={member.registrationNumber} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-800 text-xs">{member.registrationNumber}</td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800">{member.name}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{member.year}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-700">{member.department || 'C.tech'}</p>
                          <p className="text-slate-400 text-xs mt-0.5">Branch: {member.branch || 'C.tech'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p>{member.committee}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{member.role}</p>
                        </td>
                        <td className="px-6 py-4">
                          {hasStatus ? (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              isPresent
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              {record.status}
                            </span>
                          ) : (
                            <span className="bg-slate-50 text-slate-400 border border-slate-200 px-2.5 py-1 rounded-full text-xs font-medium">
                              Unmarked
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                          {record.timestamp ? new Date(record.timestamp).toLocaleTimeString() : '--'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
                            <button
                              onClick={() => markAttendance(member.registrationNumber, 'Present')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                isPresent
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              Present
                            </button>
                            <button
                              onClick={() => markAttendance(member.registrationNumber, 'Absent')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                isAbsent
                                  ? 'bg-rose-600 text-white shadow-sm'
                                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400 text-sm">
                      No volunteers found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* YCCE PDF Details Modal */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs select-none">
          <div className="bg-white rounded-2xl w-full max-w-xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-zoom-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-900" />
                YCCE Attendance Report Details
              </h3>
              <button onClick={() => setIsPdfModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5">
              <p className="text-xs text-slate-500 leading-relaxed">
                Confirm or update the program details below to autofill the official YCCE Attendance Application PDF report sheet.
              </p>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Programme</label>
                  <input
                    type="text"
                    value={pdfForm.programme}
                    onChange={(e) => setPdfForm(prev => ({ ...prev, programme: e.target.value }))}
                    placeholder="B.Tech"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Semester</label>
                  <input
                    type="text"
                    value={pdfForm.semester}
                    onChange={(e) => setPdfForm(prev => ({ ...prev, semester: e.target.value }))}
                    placeholder="V Semester"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Section / Branch</label>
                  <input
                    type="text"
                    value={pdfForm.section}
                    onChange={(e) => setPdfForm(prev => ({ ...prev, section: e.target.value }))}
                    placeholder="A"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Event Date</label>
                <input
                  type="date"
                  value={pdfForm.date}
                  onChange={(e) => setPdfForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                />
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide text-blue-900">In Campus Details</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Program Name</label>
                      <input
                        type="text"
                        value={pdfForm.inCampusName}
                        onChange={(e) => setPdfForm(prev => ({ ...prev, inCampusName: e.target.value }))}
                        placeholder="e.g. CompuFest 2026"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Time Range</label>
                      <input
                        type="text"
                        value={pdfForm.inCampusTime}
                        onChange={(e) => setPdfForm(prev => ({ ...prev, inCampusTime: e.target.value }))}
                        placeholder="10:00 AM - 5:00 PM"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Purpose</label>
                    <input
                      type="text"
                      value={pdfForm.inCampusPurpose}
                      onChange={(e) => setPdfForm(prev => ({ ...prev, inCampusPurpose: e.target.value }))}
                      placeholder="e.g. Volunteer coordination"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide text-blue-900">Out of Campus Details (Optional)</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Program Name</label>
                      <input
                        type="text"
                        value={pdfForm.outCampusName}
                        onChange={(e) => setPdfForm(prev => ({ ...prev, outCampusName: e.target.value }))}
                        placeholder="e.g. Intercollegiate coding"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">College Name</label>
                      <input
                        type="text"
                        value={pdfForm.outCampusCollege}
                        onChange={(e) => setPdfForm(prev => ({ ...prev, outCampusCollege: e.target.value }))}
                        placeholder="Yeshwantrao Chavan College of Engineering"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">City / Location</label>
                      <input
                        type="text"
                        value={pdfForm.outCampusCity}
                        onChange={(e) => setPdfForm(prev => ({ ...prev, outCampusCity: e.target.value }))}
                        placeholder="Nagpur"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Time Range</label>
                      <input
                        type="text"
                        value={pdfForm.outCampusTime}
                        onChange={(e) => setPdfForm(prev => ({ ...prev, outCampusTime: e.target.value }))}
                        placeholder="10:00 AM - 5:00 PM"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Purpose</label>
                    <input
                      type="text"
                      value={pdfForm.outCampusPurpose}
                      onChange={(e) => setPdfForm(prev => ({ ...prev, outCampusPurpose: e.target.value }))}
                      placeholder="e.g. Technical hackathon event"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGeneratePdf}
                className="bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                Generate & Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
