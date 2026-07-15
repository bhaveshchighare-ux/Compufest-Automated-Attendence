import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { memberAPI } from '../lib/api'
import * as XLSX from 'xlsx'
import { 
  Plus, Search, Edit2, Trash2, FileSpreadsheet, Download, 
  X, Loader2, Upload, AlertCircle, RefreshCw, UserCheck 
} from 'lucide-react'

export default function MemberManagement() {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [commFilter, setCommFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  
  // Active member for edit/delete
  const [activeMember, setActiveMember] = useState(null)
  
  // Form states
  const [regNo, setRegNo] = useState('')
  const [name, setName] = useState('')
  const [year, setYear] = useState('3rd Year')
  const [branch, setBranch] = useState('C.tech')
  const [committee, setCommittee] = useState('')
  const [role, setRole] = useState('Member')
  const [mobile, setMobile] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  // Excel file import state
  const [excelFile, setExcelFile] = useState(null)
  const [importStatus, setImportStatus] = useState('')

  const fetchMembers = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const data = await memberAPI.getAll()
      setMembers(data.data || [])
    } catch (err) {
      console.error(err)
      setError('Failed to fetch volunteers list.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  const handleOpenAdd = () => {
    setRegNo('')
    setName('')
    setYear('3rd Year')
    setBranch('C.tech')
    setCommittee('')
    setRole('Member')
    setMobile('')
    setActionError('')
    setIsAddOpen(true)
  }

  const handleOpenEdit = (m) => {
    setActiveMember(m)
    setRegNo(m.registrationNumber)
    setName(m.name)
    setYear(m.year)
    setBranch(m.branch || 'C.tech')
    setCommittee(m.committee)
    setRole(m.role)
    setMobile(m.mobileNumber)
    setActionError('')
    setIsEditOpen(true)
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setActionError('')
    setActionLoading(true)
    try {
      await memberAPI.add({
        registrationNumber: regNo,
        name,
        department: 'C.tech',
        branch,
        year,
        committee,
        role,
        mobileNumber: mobile
      })
      setIsAddOpen(false)
      fetchMembers()
    } catch (err) {
      setActionError(err.message || 'Failed to add volunteer')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setActionError('')
    setActionLoading(true)
    try {
      await memberAPI.edit(activeMember.registrationNumber, {
        name,
        department: 'C.tech',
        branch,
        year,
        committee,
        role,
        mobileNumber: mobile
      })
      setIsEditOpen(false)
      fetchMembers()
    } catch (err) {
      setActionError(err.message || 'Failed to update volunteer')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (m) => {
    if (!window.confirm(`Are you sure you want to delete volunteer ${m.name} (${m.registrationNumber})?`)) {
      return
    }
    try {
      await memberAPI.delete(m.registrationNumber)
      fetchMembers()
    } catch (err) {
      alert(err.message || 'Failed to delete member')
    }
  }

  const handleExcelImport = async (e) => {
    e.preventDefault()
    if (!excelFile) {
      setImportStatus('Please select an Excel file first.')
      return
    }

    setImportStatus('Reading file...')
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)

        if (data.length === 0) {
          setImportStatus('No data rows found in Excel.')
          return
        }

        setImportStatus('Processing and uploading rows...')
        const membersList = data.map(row => {
          const regNoStr = row['Registration Number'] || row['RegistrationNo'] || row['RegNo'] || row['registrationNumber'] || '';
          const nameStr = row['Full Name'] || row['Name'] || row['fullName'] || row['name'] || '';
          const branchStr = row['Branch'] || row['branch'] || 'C.tech';
          const yearStr = row['Year'] || row['year'] || '';
          const committeeStr = row['Committee'] || row['committee'] || '';
          const roleStr = row['Role'] || row['role'] || 'Member';
          const mobileStr = row['Mobile Number'] || row['Mobile'] || row['Phone'] || row['mobileNumber'] || row['mobile'] || '';

          return {
            registrationNumber: regNoStr.toString().trim(),
            name: nameStr.toString().trim(),
            department: 'C.tech',
            branch: ['AIDS', 'C.tech', 'IoT'].includes(branchStr.toString().trim()) ? branchStr.toString().trim() : 'C.tech',
            year: yearStr.toString().trim(),
            committee: committeeStr.toString().trim(),
            role: roleStr.toString().trim(),
            mobileNumber: mobileStr.toString().trim()
          }
        }).filter(m => m.registrationNumber && m.name)

        if (membersList.length === 0) {
          setImportStatus('No valid volunteer rows matched. Verify the Excel columns.')
          return
        }

        setImportStatus(`Importing ${membersList.length} volunteers...`)
        const result = await memberAPI.import(membersList)
        setImportStatus(result.message)
        fetchMembers()
        setTimeout(() => {
          setIsImportOpen(false)
          setExcelFile(null)
          setImportStatus('')
        }, 2000)

      } catch (error) {
        console.error(error)
        setImportStatus('Error reading file contents. Make sure it is a valid spreadsheet.')
      }
    }
    
    reader.onerror = () => {
      setImportStatus('Failed to read file.')
    }
    reader.readAsBinaryString(excelFile)
  }

  const downloadSampleExcel = () => {
    const sampleData = [
      {
        'Registration Number': 'CF2026001',
        'Full Name': 'Yash Sharma',
        'Branch': 'AIDS',
        'Year': '3rd Year',
        'Committee': 'Technical',
        'Role': 'Member',
        'Mobile Number': '9876543210'
      },
      {
        'Registration Number': 'CF2026002',
        'Full Name': 'Neha Patil',
        'Branch': 'C.tech',
        'Year': '4th Year',
        'Committee': 'Web',
        'Role': 'Co-Head',
        'Mobile Number': '8765432109'
      }
    ]
    const ws = XLSX.utils.json_to_sheet(sampleData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Volunteers')
    XLSX.writeFile(wb, 'CompuFest_Volunteers_Sample.xlsx')
  }

  // Get unique branches and committees for filters
  const uniqueBranches = ['AIDS', 'C.tech', 'IoT']
  const uniqueComms = [...new Set(members.map(m => m.committee).filter(Boolean))].sort()

  // Filtered members list
  const filteredMembers = members.filter(m => {
    const matchSearch = 
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.registrationNumber?.toLowerCase().includes(search.toLowerCase()) ||
      m.committee?.toLowerCase().includes(search.toLowerCase())
    const matchBranch = !branchFilter || m.branch === branchFilter
    const matchComm = !commFilter || m.committee === commFilter
    return matchSearch && matchBranch && matchComm
  })

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Header Console */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-blue-900" />
              Volunteer Roster
            </h2>
            <p className="text-slate-500 text-sm">Add, remove, search, and manage CompuFest 2026 volunteer accounts.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-blue-900 border border-blue-200 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer select-none"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Import Excel
            </button>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md hover:-translate-y-[1px] transition-all cursor-pointer select-none"
            >
              <Plus className="w-4 h-4" />
              Add Volunteer
            </button>
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

          <div className="flex items-center gap-2">
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
            <button
              onClick={() => fetchMembers(true)}
              disabled={refreshing}
              className="p-2.5 text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-xl hover:text-slate-800 transition-all cursor-pointer shrink-0 disabled:opacity-50"
              title="Refresh volunteers list"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Volunteers Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {error && (
            <div className="p-4 m-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-900 animate-spin mb-3" />
              <p className="text-slate-500 text-sm">Fetching roster data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                    <th className="px-6 py-4">Reg. Number</th>
                    <th className="px-6 py-4">Full Name</th>
                    <th className="px-6 py-4">Department & Branch</th>
                    <th className="px-6 py-4">Year</th>
                    <th className="px-6 py-4">Committee</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Mobile</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((member) => (
                      <tr key={member.registrationNumber} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-800 text-xs">{member.registrationNumber}</td>
                        <td className="px-6 py-4 font-semibold text-slate-800">{member.name}</td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-700">{member.department || 'C.tech'}</p>
                          <p className="text-slate-400 text-xs mt-0.5">Branch: {member.branch || 'C.tech'}</p>
                        </td>
                        <td className="px-6 py-4">{member.year}</td>
                        <td className="px-6 py-4">{member.committee}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            member.role === 'Head'
                              ? 'bg-blue-50 text-blue-700 border-blue-100'
                              : member.role === 'Co-Head'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {member.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">{member.mobileNumber}</td>
                        <td className="px-6 py-4 text-center space-x-2">
                          <button
                            onClick={() => handleOpenEdit(member)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Volunteer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(member)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Volunteer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400 text-sm">
                        No volunteers found matching current criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs select-none">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-zoom-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Add New Volunteer</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 flex-1">
              {actionError && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-medium">
                  {actionError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Reg. Number</label>
                  <input
                    type="text"
                    required
                    placeholder="CF2026100"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Department</label>
                  <input
                    type="text"
                    disabled
                    value="C.tech"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-400 text-sm outline-none cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Branch</label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 bg-white text-sm focus:border-blue-600"
                  >
                    <option value="AIDS">AIDS</option>
                    <option value="C.tech">C.tech</option>
                    <option value="IoT">IoT</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Academic Year</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 bg-white text-sm focus:border-blue-600"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Committee</label>
                  <input
                    type="text"
                    required
                    placeholder="Graphics"
                    value={committee}
                    onChange={(e) => setCommittee(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 bg-white text-sm focus:border-blue-600"
                  >
                    <option value="Head">Head</option>
                    <option value="Co-Head">Co-Head</option>
                    <option value="Member">Member</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Mobile Number</label>
                <input
                  type="tel"
                  required
                  placeholder="9999888877"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                />
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Volunteer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs select-none">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-zoom-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Edit Volunteer Details</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 flex-1">
              {actionError && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-medium">
                  {actionError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Reg. Number</label>
                  <input
                    type="text"
                    disabled
                    value={regNo}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-400 text-sm outline-none cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Department</label>
                  <input
                    type="text"
                    disabled
                    value="C.tech"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-400 text-sm outline-none cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Branch</label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 bg-white text-sm focus:border-blue-600"
                  >
                    <option value="AIDS">AIDS</option>
                    <option value="C.tech">C.tech</option>
                    <option value="IoT">IoT</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Academic Year</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 bg-white text-sm focus:border-blue-600"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Committee</label>
                  <input
                    type="text"
                    required
                    placeholder="Graphics"
                    value={committee}
                    onChange={(e) => setCommittee(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 bg-white text-sm focus:border-blue-600"
                  >
                    <option value="Head">Head</option>
                    <option value="Co-Head">Co-Head</option>
                    <option value="Member">Member</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Mobile Number</label>
                <input
                  type="tel"
                  required
                  placeholder="9999888877"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-700 text-sm focus:border-blue-600"
                />
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Volunteer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs select-none">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-zoom-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Import Volunteers
              </h3>
              <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  Excel Format Instructions
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your Excel sheet's first row must contain columns that map to:
                </p>
                <ul className="text-xs text-slate-500 list-disc pl-4 space-y-0.5">
                  <li><strong>Registration Number</strong> (Unique ID)</li>
                  <li><strong>Full Name</strong></li>
                  <li><strong>Branch</strong> (AIDS, C.tech, IoT)</li>
                  <li><strong>Year</strong> (e.g. 3rd Year)</li>
                  <li><strong>Committee</strong></li>
                  <li><strong>Role</strong> (Head, Co-Head, Member)</li>
                  <li><strong>Mobile Number</strong></li>
                </ul>
                <button
                  type="button"
                  onClick={downloadSampleExcel}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Sample Template
                </button>
              </div>

              <form onSubmit={handleExcelImport} className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center transition-colors relative flex flex-col items-center">
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-600">Select Volunteer Spreadsheet</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Supports .xlsx and .xls formats</p>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    required
                    onChange={(e) => setExcelFile(e.target.files[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {excelFile && (
                    <div className="mt-3 bg-blue-50 text-blue-800 border border-blue-100 rounded-lg px-3 py-1.5 text-xs font-semibold truncate max-w-full">
                      {excelFile.name}
                    </div>
                  )}
                </div>

                {importStatus && (
                  <p className="text-xs font-medium text-center text-blue-700 bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                    {importStatus}
                  </p>
                )}

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={
                      () => {
                        setIsImportOpen(false)
                        setExcelFile(null)
                        setImportStatus('')
                      }
                    }
                    className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!excelFile || importStatus.includes('Importing')}
                    className="bg-blue-900 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    Upload and Import
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
