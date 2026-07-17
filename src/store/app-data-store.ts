/**
 * 初回設定（6章）とAssignment一覧を管理するZustandストア。
 * 永続化（フェーズ9）が入るまではメモリ上のみで保持する。
 *
 * 変更点: 「今日やる宿題」のスナップショット（todaySnapshot）を追加した。
 * これにより、「今日の勉強開始」を押した時点の予定を、ページの再読み込みや
 * ブラウザの再起動をまたいでもその日のうちは固定して保持できる。
 * 日付が変わった場合は、呼び出し側（App.tsx）がsetTodaySnapshotで
 * 新しい日付のものに置き換える（このストア自身は自動失効の判定をしない）。
 */

import { create } from 'zustand'
import type { Assignment, Id, UserSettings, DateString } from '../domain'
import { applyRecordedProgress } from '../engine/apply-recorded-progress'
import type { RecordedProgressInput } from '../engine/apply-recorded-progress'
import type { TodayTaskView } from '../engine/home-screen-data'

export interface TodaySnapshot {
  date: DateString
  tasks: TodayTaskView[]
}

interface AppDataState {
  settings: UserSettings | null
  assignments: Assignment[]
  isSetupComplete: boolean
  /** 「今日の勉強開始」を押した時点で固定された、その日にやる宿題一覧 */
  todaySnapshot: TodaySnapshot | null

  setSettings: (settings: UserSettings) => void
  /** 設定完了後に、期間・勉強可能時間などを後から変更する */
  updateSettings: (settings: UserSettings) => void
  addAssignment: (assignment: Assignment) => void
  /** 宿題を削除する（即削除、確認はUI側の責務） */
  deleteAssignment: (assignmentId: Id) => void
  completeSetup: () => void
  /** 全データを初期状態に戻す（設定・宿題・完了フラグすべてリセット） */
  resetAll: () => void
  /**
   * RecordPanel（13章）で記録された進捗量を、該当Assignmentに反映する。
   * これを呼ばないと、記録は学習履歴（StudySession）として残るだけで、
   * Assignment側の残り時間・進捗率・翌日以降のスケジュールに一切反映されない。
   */
  recordProgress: (assignmentId: Id, input: RecordedProgressInput) => void
  /** 今日のスナップショットを保存する（「今日の勉強開始」を押した時に呼ぶ） */
  setTodaySnapshot: (snapshot: TodaySnapshot) => void
}

export const useAppDataStore = create<AppDataState>((set) => ({
  settings: null,
  assignments: [],
  isSetupComplete: false,
  todaySnapshot: null,

  setSettings: (settings) => set({ settings }),
  updateSettings: (settings) => set({ settings }),
  addAssignment: (assignment) =>
    set((state) => ({ assignments: [...state.assignments, assignment] })),
  deleteAssignment: (assignmentId) =>
    set((state) => ({
      assignments: state.assignments.filter((a) => a.id !== assignmentId),
    })),
  completeSetup: () => set({ isSetupComplete: true }),
  resetAll: () =>
    set({
      settings: null,
      assignments: [],
      isSetupComplete: false,
      todaySnapshot: null,
    }),
  recordProgress: (assignmentId, input) =>
    set((state) => ({
      assignments: state.assignments.map((a) =>
        a.id === assignmentId ? applyRecordedProgress(a, input) : a,
      ),
    })),
  setTodaySnapshot: (snapshot) => set({ todaySnapshot: snapshot }),
}))
