import { NavLink } from 'react-router-dom';
import { 
  Camera, 
  LayoutDashboard, 
  History, 
  Settings, 
  Shield, 
  Users,
  AlertCircle,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useState } from 'react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'scanner', label: 'Scanner', icon: Camera, path: '/scanner' },
  { id: 'history', label: 'History', icon: History, path: '/history' },
  { id: 'blacklist', label: 'Blacklist', icon: AlertCircle, path: '/blacklist' },
  { id: 'users', label: 'Users', icon: Users, path: '/users' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-lg"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="sidebar-header">
          <div className="logo">
            <Shield size={36} className="shield-icon" />
            <div>
              <h1 className="logo-text">ANPR System</h1>
              <p className="logo-subtitle">Automatic Plate Recognition</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="user-info">
          <div className="user-avatar">
            <div className="avatar-circle">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="user-details">
            <h3 className="user-name">{user?.full_name || user?.username}</h3>
            <p className="user-role">{user?.role}</p>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) => 
                  `nav-link ${isActive ? 'active' : ''}`
                }
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="nav-link logout-btn"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </nav>

        {/* System Status */}
        <div className="system-status">
          <div className="status-item">
            <div className="status-indicator online"></div>
            <span>System Online</span>
          </div>
          <div className="status-item">
            <div className="status-indicator active"></div>
            <span>Real-time Processing</span>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}