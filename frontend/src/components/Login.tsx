import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    clearError();
    
    try {
      await login(username, password);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestCredentials = (type: 'admin' | 'viewer') => {
    if (type === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('test');
      setPassword('test123');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo */}
        <div className="login-header">
          <div className="logo-icon">
            <Shield size={48} />
          </div>
          <h1 className="login-title">ANPR System</h1>
          <p className="login-subtitle">Automatic Number Plate Recognition</p>
        </div>

        {/* Login Form */}
        <div className="form-container">
          <div className="form-header">
            <LogIn size={24} />
            <h2>Login to System</h2>
          </div>

          {error && (
            <div className="error-alert">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="form-input"
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="password-input-container">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="form-input password-input"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" className="checkbox" />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="forgot-password">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-button"
            >
              {loading ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <span>Logging in...</span>
                </div>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Test Credentials */}
          <div className="test-credentials">
            <p className="test-title">Test Credentials:</p>
            <div className="test-buttons">
              <button
                type="button"
                onClick={() => handleTestCredentials('admin')}
                className="test-btn admin-btn"
              >
                Admin Account
              </button>
              <button
                type="button"
                onClick={() => handleTestCredentials('viewer')}
                className="test-btn viewer-btn"
              >
                Viewer Account
              </button>
            </div>
          </div>

          {/* Register Link */}
          <div className="register-link">
            <p>Don't have an account?</p>
            <Link to="/register" className="register-button">
              Create Account
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p className="footer-text">© 2024 ANPR System. All rights reserved.</p>
          <p className="footer-version">Version 2.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;