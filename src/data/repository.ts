/**
 * 永続化層のリポジトリインターフェース。
 * 実装（localStorage / 将来的なSupabase等）を差し替え可能にするための抽象化。
 * アプリの他の層（store等）は、この型だけに依存し、具体実装を意識しない。
 */

import type { Assignment, StudySession, UserSettings } from '../domain'
import type { LearningRecordStore } from '../engine/learning-store'

export interface AppSnapshot {
  settings: UserSettings | null
  assignments: Assignment[]
  sessions: StudySession[]
  learningStore: LearningRecordStore
  isSetupComplete: boolean
}

export interface AppRepository {
  load: () => Promise<AppSnapshot | null>
  save: (snapshot: AppSnapshot) => Promise<void>
  clear: () => Promise<void>
}

export function createEmptySnapshot(): AppSnapshot {
  return {
    settings: null,
    assignments: [],
    sessions: [],
    learningStore: {},
    isSetupComplete: false,
  }
}
