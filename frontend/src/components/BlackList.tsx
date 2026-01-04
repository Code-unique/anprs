// src/components/Blacklist.tsx
import { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  AlertTriangle,
  Clock,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  MoreVertical,
  Download,
  ChevronUp,
  ChevronDown,
  Check,
  Eye,
  History
} from 'lucide-react';
import { blacklistApi, scanApi } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

interface BlacklistedPlate {
  id: number;
  plate_number: string;
  reason: string | null;
  added_by: number | null;
  added_at: string;
  is_active: boolean;
}

interface PlateHistory {
  id: number;
  plate_number: string;
  action: 'added' | 'removed' | 'activated' | 'deactivated';
  performed_by: string;
  performed_at: string;
  reason: string | null;
}

type SortField = 'plate_number' | 'added_at' | 'is_active';
type SortOrder = 'asc' | 'desc';

export default function BlacklistPage() {
  const [plates, setPlates] = useState<BlacklistedPlate[]>([]);
  const [filteredPlates, setFilteredPlates] = useState<BlacklistedPlate[]>([]);
  const [sortedPlates, setSortedPlates] = useState<BlacklistedPlate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPlate, setSelectedPlate] = useState<string>('');
  const [selectedPlateHistory, setSelectedPlateHistory] = useState<PlateHistory[]>([]);
  const [currentUser] = useAuthStore((state) => [state.user]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selection state
  const [selectedPlates, setSelectedPlates] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Sorting state
  const [sortBy, setSortBy] = useState<SortField>('added_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [newPlate, setNewPlate] = useState({
    plate_number: '',
    reason: '',
  });

  const [validation, setValidation] = useState({
    isValid: false,
    suggestions: [] as string[],
    isBlacklisted: false,
  });

  // Debounced plate validation
  const validatePlate = useCallback(async (plateNumber: string) => {
    if (!plateNumber.trim()) {
      setValidation({
        isValid: false,
        suggestions: [],
        isBlacklisted: false,
      });
      return;
    }

    try {
      const result = await scanApi.validatePlate(plateNumber);
      setValidation({
        isValid: result.is_valid,
        suggestions: result.suggestions || [],
        isBlacklisted: result.is_blacklisted,
      });
    } catch (error) {
      setValidation({
        isValid: false,
        suggestions: [],
        isBlacklisted: false,
      });
    }
  }, []);

  useEffect(() => {
    loadBlacklist();
  }, []);

  // Filter plates when search or status changes
  useEffect(() => {
    filterPlates();
  }, [plates, searchQuery, statusFilter]);

  // Sort plates when sort criteria changes
  useEffect(() => {
    sortPlates();
  }, [filteredPlates, sortBy, sortOrder]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedPlates([]);
    setSelectAll(false);
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  const loadBlacklist = async () => {
    try {
      setLoading(true);
      const data = await blacklistApi.getBlacklist();
      setPlates(data);
    } catch (error: any) {
      toast.error('Failed to load blacklist');
      console.error('Error loading blacklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPlates = () => {
    let filtered = [...plates];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(plate =>
        plate.plate_number.toLowerCase().includes(query) ||
        (plate.reason && plate.reason.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(plate => plate.is_active === isActive);
    }

    setFilteredPlates(filtered);
  };

  const sortPlates = () => {
    const sorted = [...filteredPlates].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'plate_number':
          aValue = a.plate_number;
          bValue = b.plate_number;
          break;
        case 'added_at':
          aValue = new Date(a.added_at).getTime();
          bValue = new Date(b.added_at).getTime();
          break;
        case 'is_active':
          aValue = a.is_active ? 1 : 0;
          bValue = b.is_active ? 1 : 0;
          break;
        default:
          aValue = new Date(a.added_at).getTime();
          bValue = new Date(b.added_at).getTime();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setSortedPlates(sorted);
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleAddPlate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await blacklistApi.addToBlacklist(newPlate.plate_number, newPlate.reason);
      toast.success('Plate added to blacklist successfully');
      setShowAddModal(false);
      setNewPlate({ plate_number: '', reason: '' });
      await loadBlacklist();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add plate to blacklist');
    }
  };

  const handleRemovePlate = async (plateId: number) => {
    if (!confirm('Are you sure you want to remove this plate from blacklist?')) return;
    
    try {
      await blacklistApi.removeFromBlacklist(plateId);
      toast.success('Plate removed from blacklist successfully');
      await loadBlacklist();
      setSelectedPlates(selectedPlates.filter(id => id !== plateId));
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove plate from blacklist');
    }
  };

  const handleToggleStatus = async (plate: BlacklistedPlate) => {
    try {
      if (plate.is_active) {
        await blacklistApi.removeFromBlacklist(plate.id);
        toast.success('Plate deactivated successfully');
      } else {
        await blacklistApi.addToBlacklist(plate.plate_number, plate.reason);
        toast.success('Plate reactivated successfully');
      }
      await loadBlacklist();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update plate status');
    }
  };

  const handleBulkDeactivate = async () => {
    if (!selectedPlates.length) return;
    if (!confirm(`Are you sure you want to deactivate ${selectedPlates.length} plate(s)?`)) return;
    
    try {
      await Promise.all(
        selectedPlates.map(id => blacklistApi.removeFromBlacklist(id))
      );
      toast.success(`${selectedPlates.length} plate(s) deactivated successfully`);
      await loadBlacklist();
      setSelectedPlates([]);
      setSelectAll(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate plates');
    }
  };

  const handleBulkRemove = async () => {
    if (!selectedPlates.length) return;
    if (!confirm(`Are you sure you want to remove ${selectedPlates.length} plate(s) from blacklist?`)) return;
    
    try {
      // Note: This would require a bulk delete endpoint in the API
      for (const id of selectedPlates) {
        await blacklistApi.removeFromBlacklist(id);
      }
      toast.success(`${selectedPlates.length} plate(s) removed successfully`);
      await loadBlacklist();
      setSelectedPlates([]);
      setSelectAll(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove plates');
    }
  };

  const handleSelectPlate = (plateId: number) => {
    setSelectedPlates(prev => 
      prev.includes(plateId) 
        ? prev.filter(id => id !== plateId)
        : [...prev, plateId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedPlates([]);
    } else {
      setSelectedPlates(sortedPlates.map(plate => plate.id));
    }
    setSelectAll(!selectAll);
  };

  const exportBlacklist = async () => {
    try {
      const csvData = plates.map(plate => ({
        'Plate Number': plate.plate_number,
        'Reason': plate.reason || '',
        'Status': plate.is_active ? 'Active' : 'Inactive',
        'Added Date': new Date(plate.added_at).toLocaleDateString(),
        'Added By': plate.added_by ? `User ${plate.added_by}` : 'System'
      }));

      // Create CSV content
      const headers = Object.keys(csvData[0] || {}).join(',');
      const rows = csvData.map(row => Object.values(row).map(value => 
        `"${String(value).replace(/"/g, '""')}"`
      ).join(','));
      const csv = [headers, ...rows].join('\n');

      // Create and download file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `blacklist_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Blacklist exported successfully');
    } catch (error) {
      toast.error('Failed to export blacklist');
      console.error('Export error:', error);
    }
  };

  const loadPlateHistory = async (plateNumber: string) => {
    try {
      // This would require a new API endpoint
      // For now, we'll use mock data
      const mockHistory: PlateHistory[] = [
        {
          id: 1,
          plate_number: plateNumber,
          action: 'added',
          performed_by: 'Admin User',
          performed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          reason: 'Stolen vehicle'
        },
        {
          id: 2,
          plate_number: plateNumber,
          action: 'deactivated',
          performed_by: 'System',
          performed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          reason: 'Plate recovered'
        },
        {
          id: 3,
          plate_number: plateNumber,
          action: 'activated',
          performed_by: 'Admin User',
          performed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          reason: 'Vehicle reported stolen again'
        }
      ];
      setSelectedPlateHistory(mockHistory);
      setSelectedPlate(plateNumber);
      setShowHistoryModal(true);
    } catch (error) {
      toast.error('Failed to load plate history');
    }
  };

  const openAddModal = () => {
    setNewPlate({ plate_number: '', reason: '' });
    setValidation({ isValid: false, suggestions: [], isBlacklisted: false });
    setShowAddModal(true);
  };

  const openReasonModal = (plateNumber: string) => {
    setSelectedPlate(plateNumber);
    setShowReasonModal(true);
  };

  const openHistoryModal = (plateNumber: string) => {
    loadPlateHistory(plateNumber);
  };

  const formatPlateNumber = (plate: string) => {
    return plate.replace(/([A-Z]+)(\d+)/, '$1 $2');
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Calculate pagination
  const totalPages = Math.ceil(sortedPlates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPlates = sortedPlates.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-400">Loading blacklist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield size={32} className="text-red-400" />
            Blacklist Management
          </h1>
          <p className="text-gray-400">Manage blacklisted vehicle plates</p>
        </div>
        
        {currentUser?.role === 'admin' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportBlacklist}
              className="btn-secondary flex items-center gap-2"
            >
              <Download size={20} />
              Export CSV
            </button>
            <button
              onClick={openAddModal}
              className="btn-danger flex items-center gap-2"
            >
              <Plus size={20} />
              Add Plate
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-title">Total Blacklisted</p>
              <p className="stat-value">{plates.length}</p>
            </div>
            <Shield className="stat-icon text-red-400" size={24} />
          </div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-title">Active</p>
              <p className="stat-value">{plates.filter(p => p.is_active).length}</p>
            </div>
            <AlertTriangle className="stat-icon text-yellow-400" size={24} />
          </div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-title">Inactive</p>
              <p className="stat-value">{plates.filter(p => !p.is_active).length}</p>
            </div>
            <XCircle className="stat-icon text-gray-400" size={24} />
          </div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-title">This Month</p>
              <p className="stat-value">
                {plates.filter(p => {
                  const plateDate = new Date(p.added_at);
                  const monthAgo = new Date();
                  monthAgo.setMonth(monthAgo.getMonth() - 1);
                  return plateDate > monthAgo;
                }).length}
              </p>
            </div>
            <Calendar className="stat-icon text-blue-400" size={24} />
          </div>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedPlates.length > 0 && (
        <div className="card p-4 bg-blue-500/10 border-blue-500/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Check className="text-blue-400" size={20} />
              <span className="font-medium">{selectedPlates.length} plate(s) selected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleBulkDeactivate}
                className="btn-secondary text-sm py-2 px-4"
              >
                Deactivate Selected
              </button>
              <button
                onClick={handleBulkRemove}
                className="btn-danger text-sm py-2 px-4"
              >
                Remove Selected
              </button>
              <button
                onClick={() => setSelectedPlates([])}
                className="text-sm py-2 px-4 text-gray-400 hover:text-white"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="text"
                placeholder="Search plates or reasons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input pl-10"
              />
            </div>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Blacklist Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="py-3 px-4 text-left text-gray-400 font-medium">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="rounded border-gray-600 bg-gray-800"
                    />
                  </div>
                </th>
                <th className="py-3 px-4 text-left text-gray-400 font-medium">
                  <button 
                    onClick={() => handleSort('plate_number')}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    Plate Number
                    {sortBy === 'plate_number' && (
                      <span>{sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 text-left text-gray-400 font-medium">Reason</th>
                <th className="py-3 px-4 text-left text-gray-400 font-medium">
                  <button 
                    onClick={() => handleSort('is_active')}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    Status
                    {sortBy === 'is_active' && (
                      <span>{sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 text-left text-gray-400 font-medium">
                  <button 
                    onClick={() => handleSort('added_at')}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    Added
                    {sortBy === 'added_at' && (
                      <span>{sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 text-left text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentPlates.map((plate) => (
                <tr key={plate.id} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-4 px-4">
                    <input
                      type="checkbox"
                      checked={selectedPlates.includes(plate.id)}
                      onChange={() => handleSelectPlate(plate.id)}
                      className="rounded border-gray-600 bg-gray-800"
                    />
                  </td>
                  
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                        <AlertTriangle size={20} className="text-red-400" />
                      </div>
                      <div>
                        <div className="font-mono font-bold text-lg">{formatPlateNumber(plate.plate_number)}</div>
                        <div className="text-sm text-gray-400">ID: {plate.id}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-4 px-4">
                    <div className="max-w-xs">
                      {plate.reason ? (
                        <div>
                          <p className="text-sm line-clamp-2">{plate.reason}</p>
                          <button
                            onClick={() => openReasonModal(plate.plate_number)}
                            className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                          >
                            View details
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">No reason provided</span>
                      )}
                    </div>
                  </td>
                  
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${plate.is_active ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                      <span className={plate.is_active ? 'text-red-400 font-semibold' : 'text-gray-400'}>
                        {plate.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-4">
                    <div className="text-sm">
                      {new Date(plate.added_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={12} />
                      {getTimeAgo(plate.added_at)}
                    </div>
                  </td>
                  
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openHistoryModal(plate.plate_number)}
                        className="p-2 hover:bg-gray-500/10 text-gray-400 rounded-lg transition-colors"
                        title="View History"
                      >
                        <History size={16} />
                      </button>
                      
                      {currentUser?.role === 'admin' && (
                        <>
                          <button
                            onClick={() => handleToggleStatus(plate)}
                            className={`p-2 rounded-lg transition-colors ${
                              plate.is_active 
                                ? 'hover:bg-gray-500/10 text-gray-400' 
                                : 'hover:bg-green-500/10 text-green-400'
                            }`}
                            title={plate.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {plate.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                          </button>
                          
                          <button
                            onClick={() => handleRemovePlate(plate.id)}
                            className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                            title="Remove from blacklist"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredPlates.length === 0 && (
          <div className="py-12 text-center">
            <Shield size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No blacklisted plates found</h3>
            <p className="text-gray-400">Try adjusting your search filters or add a new plate</p>
          </div>
        )}

        {/* Pagination */}
        {sortedPlates.length > 0 && (
          <div className="p-4 border-t border-gray-800/50">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-400">
                Showing {startIndex + 1} to {Math.min(endIndex, sortedPlates.length)} of {sortedPlates.length} entries
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Items per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="form-input text-sm py-1 px-2"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="rotate-90" size={20} />
                  </button>
                  
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="-rotate-90" size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Plate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <AlertTriangle size={24} className="text-red-400" />
                Add to Blacklist
              </h3>
            </div>
            
            <form onSubmit={handleAddPlate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Plate Number *</label>
                <input
                  type="text"
                  value={newPlate.plate_number}
                  onChange={(e) => {
                    const plate = e.target.value.toUpperCase();
                    setNewPlate({...newPlate, plate_number: plate});
                    validatePlate(plate);
                  }}
                  className="form-input"
                  required
                  placeholder="e.g., ABC123"
                />
                
                {/* Validation Feedback */}
                {newPlate.plate_number && (
                  <div className="mt-2 space-y-2">
                    <div className={`text-sm flex items-center gap-2 ${validation.isValid ? 'text-green-400' : 'text-red-400'}`}>
                      {validation.isValid ? (
                        <CheckCircle size={16} />
                      ) : (
                        <XCircle size={16} />
                      )}
                      <span>
                        {validation.isValid ? 'Valid plate format' : 'Invalid plate format'}
                      </span>
                    </div>
                    
                    {validation.isBlacklisted && (
                      <div className="text-sm text-yellow-400 flex items-center gap-2">
                        <AlertTriangle size={16} />
                        <span>This plate is already blacklisted</span>
                      </div>
                    )}
                    
                    {/* Suggestions */}
                    {validation.suggestions.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-400 mb-2">Did you mean?</p>
                        <div className="space-y-1">
                          {validation.suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setNewPlate({...newPlate, plate_number: suggestion});
                                validatePlate(suggestion);
                              }}
                              className="text-sm px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors block w-full text-left"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Reason (Optional)</label>
                <textarea
                  value={newPlate.reason}
                  onChange={(e) => setNewPlate({...newPlate, reason: e.target.value})}
                  className="form-input min-h-[100px]"
                  placeholder="Enter reason for blacklisting..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!validation.isValid || validation.isBlacklisted}
                  className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to Blacklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reason Details Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <AlertTriangle size={24} className="text-yellow-400" />
                Blacklist Details - {formatPlateNumber(selectedPlate)}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Reason for Blacklisting</h4>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  {plates.find(p => p.plate_number === selectedPlate)?.reason || (
                    <span className="text-gray-500 italic">No reason provided</span>
                  )}
                </div>
              </div>
              
              {(() => {
                const plate = plates.find(p => p.plate_number === selectedPlate);
                if (!plate) return null;
                
                return (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-400">Status</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${plate.is_active ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                        <span className={plate.is_active ? 'text-red-400' : 'text-gray-400'}>
                          {plate.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-400">Added On</p>
                      <p className="mt-1">{new Date(plate.added_at).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-400">Time Since Added</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={16} className="text-gray-400" />
                        <span>{getTimeAgo(plate.added_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              <div className="flex justify-end pt-4 border-t border-gray-800">
                <button
                  onClick={() => setShowReasonModal(false)}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <History size={24} className="text-blue-400" />
                Plate History - {formatPlateNumber(selectedPlate)}
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {selectedPlateHistory.length > 0 ? (
                  selectedPlateHistory.map((history, index) => (
                    <div key={history.id} className="bg-gray-800/50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            history.action === 'added' || history.action === 'activated' ? 'bg-red-500' :
                            history.action === 'removed' ? 'bg-gray-500' :
                            'bg-yellow-500'
                          }`}></div>
                          <span className="font-medium capitalize">{history.action}</span>
                        </div>
                        <div className="text-sm text-gray-400">
                          {new Date(history.performed_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-300 mb-2">
                        By: {history.performed_by}
                      </div>
                      
                      {history.reason && (
                        <div className="text-sm">
                          <p className="text-gray-400 mb-1">Reason:</p>
                          <p className="text-gray-300">{history.reason}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No history found for this plate
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-800">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-400">
        <div>
          Total: {plates.length} plates | Filtered: {filteredPlates.length} plates
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span>Active</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-500"></div>
              <span>Inactive</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}