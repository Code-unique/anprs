import { useState } from 'react'
import { Save, Bell, Shield, Database, Cpu, Globe } from 'lucide-react'
import toast from 'react-hot-toast'

const Settings = () => {
  const [settings, setSettings] = useState({
    // General
    siteName: 'ANPR System',
    siteDescription: 'Automatic Number Plate Recognition',
    
    // Notification
    emailNotifications: true,
    pushNotifications: true,
    alertThreshold: 0.7,
    
    // Security
    requireTwoFactor: false,
    sessionTimeout: 30,
    ipWhitelist: '',
    
    // ANPR Settings
    confidenceThreshold: 0.6,
    autoBlacklist: true,
    maxFileSize: 20,
    
    // System
    enableLogging: true,
    logRetention: 30,
    backupFrequency: 'daily'
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? Number(value) : value
    }))
  }

  const handleSave = () => {
    // In production, this would save to backend
    toast.success('Settings saved successfully!')
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings?')) {
      setSettings({
        siteName: 'ANPR System',
        siteDescription: 'Automatic Number Plate Recognition',
        emailNotifications: true,
        pushNotifications: true,
        alertThreshold: 0.7,
        requireTwoFactor: false,
        sessionTimeout: 30,
        ipWhitelist: '',
        confidenceThreshold: 0.6,
        autoBlacklist: true,
        maxFileSize: 20,
        enableLogging: true,
        logRetention: 30,
        backupFrequency: 'daily'
      })
      toast.success('Settings reset to defaults')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-gray-400">Configure your ANPR system preferences</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Save size={20} />
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Settings */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Globe size={20} />
              General Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">System Name</label>
                <input
                  type="text"
                  name="siteName"
                  value={settings.siteName}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  name="siteDescription"
                  value={settings.siteDescription}
                  onChange={handleChange}
                  rows={3}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* ANPR Settings */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Cpu size={20} />
              ANPR Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Confidence Threshold: {settings.confidenceThreshold}
                </label>
                <input
                  type="range"
                  name="confidenceThreshold"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={settings.confidenceThreshold}
                  onChange={handleChange}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Low (0.1)</span>
                  <span>High (1.0)</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max File Size (MB)</label>
                <input
                  type="number"
                  name="maxFileSize"
                  value={settings.maxFileSize}
                  onChange={handleChange}
                  className="form-input"
                  min="1"
                  max="100"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="autoBlacklist"
                  checked={settings.autoBlacklist}
                  onChange={handleChange}
                  className="rounded border-gray-700"
                  id="autoBlacklist"
                />
                <label htmlFor="autoBlacklist" className="ml-2">
                  Automatically flag blacklisted plates
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bell size={20} />
              Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="emailNotifications"
                  checked={settings.emailNotifications}
                  onChange={handleChange}
                  className="rounded border-gray-700"
                  id="emailNotifications"
                />
                <label htmlFor="emailNotifications" className="ml-2">
                  Email Notifications
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="pushNotifications"
                  checked={settings.pushNotifications}
                  onChange={handleChange}
                  className="rounded border-gray-700"
                  id="pushNotifications"
                />
                <label htmlFor="pushNotifications" className="ml-2">
                  Push Notifications
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Alert Threshold: {settings.alertThreshold}
                </label>
                <input
                  type="range"
                  name="alertThreshold"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={settings.alertThreshold}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield size={20} />
              Security
            </h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="requireTwoFactor"
                  checked={settings.requireTwoFactor}
                  onChange={handleChange}
                  className="rounded border-gray-700"
                  id="requireTwoFactor"
                />
                <label htmlFor="requireTwoFactor" className="ml-2">
                  Require Two-Factor Authentication
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  name="sessionTimeout"
                  value={settings.sessionTimeout}
                  onChange={handleChange}
                  className="form-input"
                  min="1"
                  max="240"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  IP Whitelist (comma-separated)
                </label>
                <textarea
                  name="ipWhitelist"
                  value={settings.ipWhitelist}
                  onChange={handleChange}
                  rows={3}
                  className="form-input"
                  placeholder="192.168.1.1, 10.0.0.1"
                />
              </div>
            </div>
          </div>

          {/* System */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Database size={20} />
              System
            </h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="enableLogging"
                  checked={settings.enableLogging}
                  onChange={handleChange}
                  className="rounded border-gray-700"
                  id="enableLogging"
                />
                <label htmlFor="enableLogging" className="ml-2">
                  Enable System Logging
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Log Retention (days)
                </label>
                <input
                  type="number"
                  name="logRetention"
                  value={settings.logRetention}
                  onChange={handleChange}
                  className="form-input"
                  min="1"
                  max="365"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Backup Frequency
                </label>
                <select
                  name="backupFrequency"
                  value={settings.backupFrequency}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings