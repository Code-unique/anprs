import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield,
  Eye,
  CheckCircle,
  XCircle,
  MoreVertical,
  AlertCircle
} from 'lucide-react';
import { usersApi } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'operator' | 'viewer';
  is_active: boolean;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentUser] = useAuthStore((state) => [state.user]);

  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'viewer' as 'admin' | 'operator' | 'viewer',
  });

  const [editUser, setEditUser] = useState({
    full_name: '',
    role: 'viewer' as 'admin' | 'operator' | 'viewer',
    is_active: true,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await usersApi.getUsers();
      setUsers(data);
    } catch (error: any) {
      toast.error('Failed to load users');
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.full_name && user.full_name.toLowerCase().includes(query))
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(user => user.is_active === isActive);
    }

    setFilteredUsers(filtered);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await usersApi.register(newUser);
      toast.success('User created successfully');
      setShowAddModal(false);
      setNewUser({
        username: '',
        email: '',
        password: '',
        full_name: '',
        role: 'viewer',
      });
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await usersApi.updateUser(selectedUser.id, editUser);
      toast.success('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await usersApi.deleteUser(userId);
      toast.success('User deleted successfully');
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await usersApi.updateUser(user.id, { is_active: !user.is_active });
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`);
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user status');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditUser({
      full_name: user.full_name || '',
      role: user.role,
      is_active: user.is_active,
    });
    setShowEditModal(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-400';
      case 'operator': return 'bg-blue-500/20 text-blue-400';
      case 'viewer': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield size={14} />;
      case 'operator': return <Edit size={14} />;
      case 'viewer': return <Eye size={14} />;
      default: return <Users size={14} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-400">Loading users...</p>
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
            <Users size={32} className="text-primary" />
            User Management
          </h1>
          <p className="text-gray-400">Manage system users and their permissions</p>
        </div>
        
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <UserPlus size={20} />
            Add User
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-title">Total Users</p>
              <p className="stat-value">{users.length}</p>
            </div>
            <Users className="stat-icon" size={24} />
          </div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-title">Admins</p>
              <p className="stat-value">{users.filter(u => u.role === 'admin').length}</p>
            </div>
            <Shield className="stat-icon text-red-400" size={24} />
          </div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-title">Active Users</p>
              <p className="stat-value">{users.filter(u => u.is_active).length}</p>
            </div>
            <CheckCircle className="stat-icon text-green-400" size={24} />
          </div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-title">Inactive Users</p>
              <p className="stat-value">{users.filter(u => !u.is_active).length}</p>
            </div>
            <XCircle className="stat-icon text-gray-400" size={24} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="text"
                placeholder="Search users by name, email, or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input pl-10"
              />
            </div>
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="form-input"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
              <option value="viewer">Viewer</option>
            </select>
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

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="py-3 px-4 text-left text-gray-400 font-medium">User</th>
                <th className="py-3 px-4 text-left text-gray-400 font-medium">Role</th>
                <th className="py-3 px-4 text-left text-gray-400 font-medium">Status</th>
                <th className="py-3 px-4 text-left text-gray-400 font-medium">Joined</th>
                <th className="py-3 px-4 text-left text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold">{user.username}</div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                        {user.full_name && (
                          <div className="text-sm text-gray-500">{user.full_name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-4 px-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${getRoleColor(user.role)}`}>
                      {getRoleIcon(user.role)}
                      <span className="text-sm font-medium capitalize">{user.role}</span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                      <span className={user.is_active ? 'text-green-400' : 'text-gray-400'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  
                  <td className="py-4 px-4">
                    <div className="text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(user.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                  
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {currentUser?.role === 'admin' && (
                        <>
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <Edit size={16} />
                          </button>
                          
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className="p-2 hover:bg-green-500/10 text-green-400 rounded-lg transition-colors"
                            title={user.is_active ? 'Deactivate User' : 'Activate User'}
                          >
                            {user.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                          </button>
                          
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
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
        {filteredUsers.length === 0 && (
          <div className="py-12 text-center">
            <Users size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No users found</h3>
            <p className="text-gray-400">Try adjusting your search filters</p>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <UserPlus size={24} />
                Add New User
              </h3>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Username *</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Full Name</label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                  className="form-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Password *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="form-input"
                  required
                  minLength={6}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                  className="form-input"
                  required
                >
                  <option value="viewer">Viewer</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Edit size={24} />
                Edit User: {selectedUser.username}
              </h3>
            </div>
            
            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name</label>
                <input
                  type="text"
                  value={editUser.full_name}
                  onChange={(e) => setEditUser({...editUser, full_name: e.target.value})}
                  className="form-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Role *</label>
                <select
                  value={editUser.role}
                  onChange={(e) => setEditUser({...editUser, role: e.target.value as any})}
                  className="form-input"
                  required
                >
                  <option value="viewer">Viewer</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editUser.is_active}
                  onChange={(e) => setEditUser({...editUser, is_active: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="is_active" className="text-sm">
                  Active User
                </label>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}