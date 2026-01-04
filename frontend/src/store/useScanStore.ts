import { create } from 'zustand'
import { Scan } from '../types'

interface ScanState {
  scans: Scan[]
  currentScan: Scan | null
  selectedScans: Set<number>
  
  addScan: (scan: Scan) => void
  updateScan: (id: number, updates: Partial<Scan>) => void
  removeScan: (id: number) => void
  setScans: (scans: Scan[]) => void
  setCurrentScan: (scan: Scan | null) => void
  toggleSelectScan: (id: number) => void
  selectAllScans: (scanIds: number[]) => void
  clearSelectedScans: () => void
  removeSelectedScans: () => void
}

export const useScanStore = create<ScanState>((set) => ({
  scans: [],
  currentScan: null,
  selectedScans: new Set(),

  addScan: (scan) =>
    set((state) => ({
      scans: [scan, ...state.scans]
    })),

  updateScan: (id, updates) =>
    set((state) => ({
      scans: state.scans.map((scan) =>
        scan.id === id ? { ...scan, ...updates } : scan
      )
    })),

  removeScan: (id) =>
    set((state) => ({
      scans: state.scans.filter((scan) => scan.id !== id),
      selectedScans: new Set([...state.selectedScans].filter(scanId => scanId !== id))
    })),

  setScans: (scans) => set({ scans }),

  setCurrentScan: (scan) => set({ currentScan: scan }),

  toggleSelectScan: (id) =>
    set((state) => {
      const newSelected = new Set(state.selectedScans)
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
      return { selectedScans: newSelected }
    }),

  selectAllScans: (scanIds) =>
    set((state) => {
      const allSelected = new Set(scanIds)
      return { selectedScans: allSelected }
    }),

  clearSelectedScans: () => set({ selectedScans: new Set() }),

  removeSelectedScans: () =>
    set((state) => ({
      scans: state.scans.filter((scan) => !state.selectedScans.has(scan.id)),
      selectedScans: new Set()
    }))
}))