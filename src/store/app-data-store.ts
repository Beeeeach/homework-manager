/**
 * 初回設定（6章）とAssignment一覧を管理するZustandストア。
 * 永続化（フェーズ9）が入るまではメモリ上のみで保持する。
 */

import { create } from 'zustand'
import type { Assignment, Id, UserSettings } from '../domain'
import { applyRecordedProgress } from '../engine/apply-recorded-progress'
import type { RecordedProgressInput } from '../engine/apply-recorded-progress'

interface AppDataState {
  settings: UserSettings | null
  assignments: Assignment[]
  isSetupComplete: boolean

  setSettings: (settings: UserSettings) => void
  addAssignment: (assignment: Assignment) => void
  completeSetup: () => void
  /** 全データを初期状態に戻す（設定・宿題・完了フラグすべてリセット） */
  resetAll: () => void
  /**
   * RecordPanel（13章）で記録された進捗量を、該当Assignmentに反映する。
   * これを呼ばないと、記録は学習履歴（StudySession）として残るだけで、
   * Assignment側の残り時間・進捗率・翌日以降のスケジュールに一切反映されない。
   */
  recordProgress: (assignmentId: Id, input: RecordedProgressInput) => void
}

export const useAppDataStore = create<AppDataState>((set) => ({
  settings: null,
  assignments: [],
  isSetupComplete: false,

  setSettings: (settings) => set({ settings }),
  addAssignment: (assignment) =>
    set((state) => ({ assignments: [...state.assignments, assignment] })),
  completeSetup: () => set({ isSetupComplete: true }),
  resetAll: () =>
    set({
      settings: null,
      assignments: [],
      isSetupComplete: false,
    }),
  recordProgress: (assignmentId, input) =>
    set((state) => ({
      assignments: state.assignments.map((a) =>
        a.id === assignmentId ? applyRecordedProgress(a, input) : a,
      ),
    })),
}))
