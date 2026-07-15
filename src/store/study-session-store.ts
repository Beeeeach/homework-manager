/**
 * 記録機能（仕様書 13章）のためのZustandストア。
 * ストップウォッチの実行状態と、確定したStudySessionの一覧を管理する。
 * 永続化（フェーズ9）が入るまではメモリ上のみで保持する。
 */

import { create } from 'zustand'
import type { StudySession, Id } from '../domain'

/** 開始・終了時刻(ISO文字列)から経過分数を算出する純粋関数（テスト容易性のため分離） */
export function calculateElapsedMinutes(startedAtIso: string, endedAtIso: string): number {
  const startedMs = new Date(startedAtIso).getTime()
  const endedMs = new Date(endedAtIso).getTime()
  return Math.max(0, (endedMs - startedMs) / 60000)
}

interface RunningStopwatch {
  taskId: Id
  assignmentId: Id
  startedAt: string // ISO文字列
}

interface StudySessionState {
  sessions: StudySession[]
  running: RunningStopwatch | null

  startStopwatch: (taskId: Id, assignmentId: Id) => void
  /** ストップウォッチを終了し、確定したセッションを追加する。途中終了でも呼び出せる（13章） */
  stopStopwatch: (actualAmount: number) => void
  /** 手入力での記録追加（ストップウォッチ未使用でも登録可能、13章） */
  addManualSession: (input: {
    taskId: Id
    assignmentId: Id
    actualAmount: number
    actualMinutes: number
  }) => void
  /** 全ての学習記録をリセットする（全データ削除機能用） */
  resetAll: () => void
}

function nowIso(): string {
  return new Date().toISOString()
}

export const useStudySessionStore = create<StudySessionState>((set, get) => ({
  sessions: [],
  running: null,

  startStopwatch: (taskId, assignmentId) => {
    set({ running: { taskId, assignmentId, startedAt: nowIso() } })
  },

  stopStopwatch: (actualAmount) => {
    const running = get().running
    if (!running) return

    const endedAt = nowIso()
    const actualMinutes = calculateElapsedMinutes(running.startedAt, endedAt)

    const session: StudySession = {
      id: crypto.randomUUID(),
      taskId: running.taskId,
      assignmentId: running.assignmentId,
      startedAt: running.startedAt,
      endedAt,
      actualAmount,
      actualMinutes,
      recordMethod: 'stopwatch',
    }

    set((state) => ({
      sessions: [...state.sessions, session],
      running: null,
    }))
  },

  addManualSession: ({ taskId, assignmentId, actualAmount, actualMinutes }) => {
    const now = nowIso()
    const session: StudySession = {
      id: crypto.randomUUID(),
      taskId,
      assignmentId,
      startedAt: now,
      endedAt: now,
      actualAmount,
      actualMinutes,
      recordMethod: 'manual',
    }
    set((state) => ({ sessions: [...state.sessions, session] }))
  },

  resetAll: () => {
    set({ sessions: [], running: null })
  },
}))
