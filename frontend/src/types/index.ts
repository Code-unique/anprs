export interface Scan {
  id: number
  plate_number: string
  confidence: number
  status: 'Success' | 'Failed' | 'Review' | 'Processing' | 'Alert'
  vehicle_type?: string
  location?: string
  camera_id?: string
  processing_time?: number
  timestamp: string
  image_path: string
  processed_image_path?: string
  annotations?: string
}

export interface DashboardStats {
  total_scans: number
  success_rate: number
  avg_processing_time: number
  total_alerts: number
  recent_activity: Scan[]
  hourly_stats: Record<string, number>
  top_cameras: Array<{ camera_id: string; count: number }>
}

export interface PlateValidation {
  plate: string
  is_valid: boolean
  suggestions: string[]
  is_blacklisted: boolean
}

export interface User {
  id: number
  username: string
  email: string
  full_name: string | null
  role: 'admin' | 'operator' | 'viewer'
  is_active: boolean
  created_at: string
}

export interface BlacklistedPlate {
  id: number
  plate_number: string
  reason?: string
  added_by: number
  added_at: string
  is_active: boolean
}