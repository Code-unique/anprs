import { create } from 'zustand';
import { Scan, DashboardStats } from '../types';

interface AppState {
  scans: Scan[];
  currentScan: Scan | null;
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setScans: (scans: Scan[]) => void;
  setCurrentScan: (scan: Scan | null) => void;
  setStats: (stats: DashboardStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Helper actions
  addScan: (scan: Scan) => void;
  updateScan: (id: number, updates: Partial<Scan>) => void;
  removeScan: (id: number) => void;
}

export const useStore = create<AppState>((set) => ({
  scans: [],
  currentScan: null,
  stats: null,
  loading: false,
  error: null,
  
  setScans: (scans) => set({ scans }),
  setCurrentScan: (scan) => set({ currentScan: scan }),
  setStats: (stats) => set({ stats }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  addScan: (scan) =>
    set((state) => ({
      scans: [scan, ...state.scans],
    })),
    
  updateScan: (id, updates) =>
    set((state) => ({
      scans: state.scans.map((scan) =>
        scan.id === id ? { ...scan, ...updates } : scan
      ),
    })),
    
  removeScan: (id) =>
    set((state) => ({
      scans: state.scans.filter((scan) => scan.id !== id),
    })),
}));