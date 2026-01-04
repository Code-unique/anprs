import { useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { useDropzone } from 'react-dropzone'
import { Upload, Camera, ScanLine, X, AlertCircle, MapPin, Video } from 'lucide-react'
import { scanApi } from '../services/api'
import { useScanStore } from '../store/useScanStore'
import toast from 'react-hot-toast'

export default function Scanner() {
  const [image, setImage] = useState<string | null>(null)
  const [mode, setMode] = useState<'upload' | 'live'>('upload')
  const [uploading, setUploading] = useState(false)
  const [cameraId, setCameraId] = useState('CAM-001')
  const [location, setLocation] = useState('Main Entrance')
  const [scanResult, setScanResult] = useState<any>(null)
  const [showCameraSettings, setShowCameraSettings] = useState(false)
  
  const webcamRef = useRef<Webcam>(null)
  const addScan = useScanStore((state) => state.addScan)

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      const reader = new FileReader()
      reader.onload = () => setImage(reader.result as string)
      reader.readAsDataURL(acceptedFiles[0])
      setScanResult(null)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.bmp']
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB
  })

  const capture = () => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      setImage(imageSrc)
      setMode('upload')
      setScanResult(null)
      toast.success('Photo captured successfully!')
    }
  }

  const scan = async () => {
    if (!image) {
      toast.error('Please upload or capture an image first')
      return
    }

    setUploading(true)
    setScanResult(null)

    try {
      // Convert data URL to blob
      const response = await fetch(image)
      const blob = await response.blob()
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })

      // Send to backend
      const result = await scanApi.scanImage(file, cameraId, location)
      
      setScanResult(result)
      addScan(result)
      
      if (result.status === 'Alert') {
        toast.error(`🚨 ALERT: Blacklisted plate detected - ${result.plate_number}`)
      } else if (result.status === 'Success') {
        toast.success(`✅ Plate detected: ${result.plate_number} (${(result.confidence * 100).toFixed(1)}%)`)
      } else {
        toast.success(`⚠️ Plate detected for review: ${result.plate_number}`)
      }
      
    } catch (error: any) {
      console.error('Scan error:', error)
      toast.error(error.response?.data?.detail || 'Scan failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const clearImage = () => {
    setImage(null)
    setScanResult(null)
    toast.success('Image cleared')
  }

  const videoConstraints = {
    facingMode: "environment",
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }

  return (
    <div className="fade-in">
      {/* Hero Section */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
          Automatic Number Plate Recognition
        </h1>
        <p className="text-gray-400 text-lg max-w-3xl mx-auto">
          Upload an image or capture from camera to instantly detect and read vehicle license plates.
          Advanced AI-powered detection with real-time alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Scanner Controls */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex space-x-2">
              <button
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  mode === 'upload' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
                onClick={() => setMode('upload')}
                disabled={uploading}
              >
                <Upload size={20} />
                Upload Image
              </button>
              <button
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  mode === 'live' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
                onClick={() => setMode('live')}
                disabled={uploading}
              >
                <Camera size={20} />
                Live Capture
              </button>
            </div>

            <button
              onClick={() => setShowCameraSettings(!showCameraSettings)}
              className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Video size={20} />
            </button>
          </div>

          {showCameraSettings && (
            <div className="mb-6 p-4 bg-gray-900 rounded-lg slide-up">
              <h3 className="text-lg font-semibold mb-3">Camera Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Camera ID</label>
                  <input
                    type="text"
                    value={cameraId}
                    onChange={(e) => setCameraId(e.target.value)}
                    className="form-input"
                    placeholder="Enter camera ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="form-input"
                    placeholder="Enter location"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Upload/Webcam Area */}
          <div className="mb-6">
            {mode === 'upload' ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:border-blue-500 hover:bg-blue-500/5'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="w-24 h-24 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Upload size={48} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold mb-2">
                      {isDragActive ? 'Drop the image here' : 'Drag & drop an image'}
                    </p>
                    <p className="text-gray-400">or click to browse files</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Supports: JPG, PNG, WEBP, BMP (Max 20MB)
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    className="w-full h-auto"
                  />
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="flex items-center gap-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                      <span className="text-sm">LIVE</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={capture}
                  disabled={uploading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Camera size={24} />
                  Capture Photo
                </button>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={scan}
            disabled={!image || uploading}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              image && !uploading
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-lg hover:shadow-blue-500/25'
                : 'bg-gray-800 cursor-not-allowed'
            }`}
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="spinner"></div>
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <ScanLine size={24} />
                <span>Scan Number Plate</span>
              </div>
            )}
          </button>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          {/* Image Preview */}
          {image && (
            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Preview</h3>
                <button
                  onClick={clearImage}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Clear image"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="rounded-lg overflow-hidden">
                <img
                  src={image}
                  alt="Preview"
                  className="w-full h-48 object-cover"
                />
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin size={20} />
              Scan Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400">Camera ID</label>
                <p className="font-medium">{cameraId}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Location</label>
                <p className="font-medium">{location}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Mode</label>
                <p className="font-medium capitalize">{mode}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {scanResult && (
        <div className="card p-6 mt-6 slide-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <ScanLine size={28} />
              Scan Results
            </h2>
            <div className={`status-badge status-${scanResult.status.toLowerCase()}`}>
              {scanResult.status}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-gray-900/50 p-4 rounded-xl">
              <p className="text-sm text-gray-400">Plate Number</p>
              <p className="text-2xl font-bold font-mono">{scanResult.plate_number}</p>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-xl">
              <p className="text-sm text-gray-400">Confidence</p>
              <div className="flex items-center gap-2">
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${scanResult.confidence * 100}%` }}
                  ></div>
                </div>
                <span className="text-xl font-bold">
                  {(scanResult.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-xl">
              <p className="text-sm text-gray-400">Processing Time</p>
              <p className="text-2xl font-bold">
                {scanResult.processing_time?.toFixed(3) || '0.000'}s
              </p>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-xl">
              <p className="text-sm text-gray-400">Timestamp</p>
              <p className="text-lg font-medium">
                {new Date(scanResult.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          {scanResult.status === 'Alert' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle size={24} className="text-red-500" />
                <h3 className="text-lg font-semibold text-red-400">Security Alert</h3>
              </div>
              <p className="text-gray-300">
                This vehicle plate ({scanResult.plate_number}) is in the blacklist database.
                Please take appropriate action.
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => window.open(`/api/image/${scanResult.id}`, '_blank')}
              className="btn-secondary flex-1"
            >
              View Processed Image
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(scanResult.plate_number)}
              className="btn-secondary flex-1"
            >
              Copy Plate Number
            </button>
          </div>
        </div>
      )}
    </div>
  )
}