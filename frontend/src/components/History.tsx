import { useEffect, useState } from 'react'
import { Search, Filter, Download, Trash2, Eye, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { scanApi } from '../services/api'
import { Scan } from '../types'
import toast from 'react-hot-toast'

export default function History() {
  const [scans, setScans] = useState<Scan[]>([])
  const [filteredScans, setFilteredScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [selectedScans, setSelectedScans] = useState<Set<number>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  useEffect(() => {
    loadScans()
  }, [])

  useEffect(() => {
    filterScans()
  }, [scans, search, statusFilter, dateRange])

  const loadScans = async () => {
    try {
      setLoading(true)
      const data = await scanApi.getScans({ limit: 500 })
      setScans(data)
    } catch (error) {
      console.error('Failed to load scans:', error)
      toast.error('Failed to load scan history')
    } finally {
      setLoading(false)
    }
  }

  const filterScans = () => {
    let filtered = [...scans]

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(scan =>
        scan.plate_number.toLowerCase().includes(searchLower) ||
        scan.camera_id?.toLowerCase().includes(searchLower) ||
        scan.location?.toLowerCase().includes(searchLower)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(scan => scan.status === statusFilter)
    }

    // Date range filter
    if (dateRange.start) {
      const startDate = new Date(dateRange.start)
      filtered = filtered.filter(scan => new Date(scan.timestamp) >= startDate)
    }
    
    if (dateRange.end) {
      const endDate = new Date(dateRange.end)
      filtered = filtered.filter(scan => new Date(scan.timestamp) <= endDate)
    }

    setFilteredScans(filtered)
    setCurrentPage(1) // Reset to first page on filter change
  }

  // Pagination
  const totalPages = Math.ceil(filteredScans.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentScans = filteredScans.slice(startIndex, endIndex)

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this scan?')) return

    try {
      await scanApi.deleteScan(id)
      setScans(scans.filter(scan => scan.id !== id))
      toast.success('Scan deleted successfully')
    } catch (error) {
      toast.error('Failed to delete scan')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedScans.size === 0) return
    
    if (!confirm(`Delete ${selectedScans.size} selected scans?`)) return

    try {
      for (const id of selectedScans) {
        await scanApi.deleteScan(id)
      }
      
      setScans(scans.filter(scan => !selectedScans.has(scan.id)))
      setSelectedScans(new Set())
      toast.success(`${selectedScans.size} scans deleted`)
    } catch (error) {
      toast.error('Failed to delete scans')
    }
  }

  const exportData = () => {
    if (filteredScans.length === 0) {
      toast.error('No data to export')
      return
    }

    const data = filteredScans.map(scan => ({
      'Plate Number': scan.plate_number,
      'Status': scan.status,
      'Confidence': `${(scan.confidence * 100).toFixed(1)}%`,
      'Camera ID': scan.camera_id || 'N/A',
      'Location': scan.location || 'N/A',
      'Processing Time': `${scan.processing_time?.toFixed(3)}s` || 'N/A',
      'Timestamp': new Date(scan.timestamp).toLocaleString()
    }))

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `anpr_scans_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    
    toast.success('Data exported successfully')
  }

  const toggleSelectAll = () => {
    if (selectedScans.size === currentScans.length) {
      setSelectedScans(new Set())
    } else {
      setSelectedScans(new Set(currentScans.map(scan => scan.id)))
    }
  }

  const toggleSelectScan = (id: number) => {
    const newSelected = new Set(selectedScans)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedScans(newSelected)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-400">Loading scan history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Scan History</h1>
          <p className="text-gray-400">View and manage all scanned plates</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportData}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"
            disabled={filteredScans.length === 0}
          >
            <Download size={20} />
            Export CSV
          </button>
          {selectedScans.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Trash2 size={20} />
              Delete ({selectedScans.size})
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="text"
                placeholder="Search plates, camera ID, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
            >
              <option value="all">All Status</option>
              <option value="Success">Success</option>
              <option value="Review">Review</option>
              <option value="Alert">Alert</option>
              <option value="Processing">Processing</option>
            </select>
          </div>

          {/* Items per Page */}
          <div>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadScans}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Results Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-gray-400">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredScans.length)} of {filteredScans.length} scans
        </div>
        {selectedScans.size > 0 && (
          <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full">
            {selectedScans.size} selected
          </div>
        )}
      </div>

      {/* Scans Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="py-3 px-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedScans.size === currentScans.length && currentScans.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-700"
                  />
                </th>
                <th className="py-3 px-4 text-left text-gray-400 font-medium">Plate Number</th>
                <th className="py-3 px-4 text-left text-gray-400 font-medium">Status</th>
                <th className="py-3 px-4 text-left text-gray-400 font-medium">Confidence</th>
                <th className="py-3 px-4 text-left text-gray-400 font-medium">Camera</th>
                <th className="py-3 px-4 text-left text-gray-400 font-medium">Time</th>
                <th className="py-3 px-4 text-left text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentScans.map((scan) => (
                <tr 
                  key={scan.id} 
                  className={`border-t border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                    selectedScans.has(scan.id) ? 'bg-blue-500/10' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedScans.has(scan.id)}
                      onChange={() => toggleSelectScan(scan.id)}
                      className="rounded border-gray-700"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-mono font-semibold">{scan.plate_number}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`status-badge status-${scan.status.toLowerCase()}`}>
                      {scan.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-20 bg-gray-800 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ 
                            width: `${scan.confidence * 100}%`,
                            backgroundColor: scan.confidence > 0.8 ? '#10b981' : 
                                           scan.confidence > 0.6 ? '#f59e0b' : '#ef4444'
                          }}
                        ></div>
                      </div>
                      <span>{(scan.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {scan.camera_id || <span className="text-gray-500">N/A</span>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <div>{new Date(scan.timestamp).toLocaleDateString()}</div>
                      <div className="text-gray-400">
                        {new Date(scan.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => window.open(`/api/image/${scan.id}`, '_blank')}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                        title="View Image"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(scan.id)}
                        className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                        title="Delete Scan"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {currentScans.length === 0 && (
          <div className="py-12 text-center">
            <Search size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No scans found</h3>
            <p className="text-gray-400">Try adjusting your filters or upload new images</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}