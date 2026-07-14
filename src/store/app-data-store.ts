/**
 * 初回設定（6章）とAssignment一覧を管理するZustandストア。
 * 永続化（フェーズ9）が入るまではメモリ上のみで保持する。
 */

import { create } from 'zustand'
import type { Assignment, UserSettings } from '../domain'

interface AppDataState {
  settings: UserSettings | null
  assignments: Assignment[]
  isSetupComplete: boolean

  setSettings: (settings: UserSettings) => void
  addAssignment: (assignment: Assignment) => void
  completeSetup: () => void
}

export const useAppDataStore = create<AppDataState>((set) => ({
  settings: null,
  assignments: [],
  isSetupComplete: false,

  setSettings: (settings) => set({ settings }),
  addAssignment: (assignment) =>
    set((state) => ({ assignments: [...state.assignments, assignment] })),
  completeSetup: () => set({ isSetupComplete: true }),
}))
