/**
 * 永続化層のリポジトリインターフェース。
 * 実装（localStorage / Firestore等）を差し替え可能にするための抽象化。
 * アプリの他の層（store等）は、この型だけに依存し、具体実装を意識しない。
 *
 * 変更点: todaySnapshot（「今日の勉強開始」時点で固定された当日の予定）を追加した。
 * これを永続化対象に含めないと、ページ再読み込みやブラウザ再起動のたびに
 * 当日の予定が消えてしまい、「1日の間は予定を保持する」という要件を満たせない。
 */
import type { Assignment, StudySession, UserSettings } from '../domain'
import type { LearningRecordStore } from '../engine/learning-store'
import type { TodaySnapshot } from '../store/app-data-store'

export interface AppSnapshot {
  settings: UserSettings | null
  assignments: Assignment[]
  sessions: StudySession[]
  learningStore: LearningRecordStore
  isSetupComplete: boolean
  /** 「今日の勉強開始」時点で固定された当日の予定。未開始ならnull */
  todaySnapshot: TodaySnapshot | null
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
    todaySnapshot: null,
  }
}
