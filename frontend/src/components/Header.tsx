import { Bell, Sun, Moon, User, Search, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';

interface HeaderProps {
  user: any;
}

export default function Header({ user }: HeaderProps) {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(3);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleClearNotifications = () => {
    setNotifications(0);
  };

  return (
    <header className="header">
      <div className="header-content">
        {/* Search Bar */}
        <div className="search-container">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search plates, users, or cameras..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Right Side Actions */}
        <div className="header-actions">
          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="action-btn"
            title="Toggle theme"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button className="action-btn relative">
              <Bell size={20} />
              {notifications > 0 && (
                <span className="notification-badge">
                  {notifications}
                </span>
              )}
            </button>
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              className="user-profile-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="user-avatar-sm">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="user-info-sm">
                <span className="user-name-sm">{user?.username}</span>
                <span className="user-role-sm capitalize">{user?.role}</span>
              </div>
              <ChevronDown size={16} className={`transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="user-dropdown">
                <div className="user-dropdown-header">
                  <div className="user-avatar-md">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="user-dropdown-name">{user?.full_name || user?.username}</h4>
                    <p className="user-dropdown-email">{user?.email}</p>
                    <p className="user-dropdown-role capitalize">{user?.role}</p>
                  </div>
                </div>
                <div className="user-dropdown-divider"></div>
                <button className="user-dropdown-item">
                  <User size={16} />
                  <span>Profile Settings</span>
                </button>
                <button className="user-dropdown-item">
                  <Bell size={16} />
                  <span>Notifications</span>
                </button>
                <div className="user-dropdown-divider"></div>
                <button className="user-dropdown-item text-red-400 hover:text-red-300">
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date Display */}
      <div className="date-display">
        <span className="date-text">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </span>
        <span className="time-text">
          {new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>
    </header>
  );
}