/**
 * 永続化コーディネーター。
 * app-data-store・study-session-store・学習ストアの状態をまとめて
 * AppSnapshotとして保存/復元する。各ストアに個別の永続化ロジックを
 * 埋め込まず、この層に集約することで責務を分離する。
 *
 * 変更点: todaySnapshot（当日固定の予定）の保存・復元を追加した。
 * 復元時、保存されていたtodaySnapshotの日付が「今日」と異なる場合は
 * 自動的に無効化する（古い日の予定を翌日以降に持ち越さないため）。
 */

import type { AppRepository } from './repository'
import { createEmptySnapshot } from './repository'
import { useAppDataStore } from '../store/app-data-store'
import { useStudySessionStore } from '../store/study-session-store'
import type { LearningRecordStore } from '../engine/learning-store'
import { DEFAULT_DEADLINE_BUFFER } from '../domain/settings'
import type { UserSettings } from '../domain'
import type { TodaySnapshot } from '../store/app-data-store'
import { getTodayDateString } from '../engine/date-utils'

/** 現在の全ストアの状態からスナップショットを作る */
function buildSnapshot(learningStore: LearningRecordStore) {
  const appData = useAppDataStore.getState()
  const sessionData = useStudySessionStore.getState()

  return {
    settings: appData.settings,
    assignments: appData.assignments,
    sessions: sessionData.sessions,
    learningStore,
    isSetupComplete: appData.isSetupComplete,
    todaySnapshot: appData.todaySnapshot,
  }
}

/**
 * 旧バージョンで保存されたsettings（deadlineBufferフィールドが存在しない）を
 * 読み込んだ場合に、デフォルト値を補って新しい形に揃える。
 * 新規保存分は既にdeadlineBufferを持っているため、この関数は何もしない（そのまま返す）。
 */
function withDeadlineBufferFallback(settings: UserSettings | null): UserSettings | null {
  if (!settings) return settings
  if (settings.deadlineBuffer) return settings
  return { ...settings, deadlineBuffer: DEFAULT_DEADLINE_BUFFER }
}

/**
 * 保存されていたtodaySnapshotが「今日」の日付のものであれば復元し、
 * 別の日（前日以前）のものであれば無効化してnullを返す。
 * これにより、日付が変わった翌日には自動的に当日固定が解除され、
 * 新しい日の予定が組めるようになる。
 */
function withTodaySnapshotFallback(
  todaySnapshot: TodaySnapshot | null | undefined,
): TodaySnapshot | null {
  if (!todaySnapshot) return null
  const today = getTodayDateString()
  if (todaySnapshot.date !== today) return null
  return todaySnapshot
}

/** アプリ起動時にリポジトリからスナップショットを読み込み、各ストアへ反映する */
export async function hydrateFromRepository(
  repository: AppRepository,
): Promise<LearningRecordStore> {
  const snapshot = (await repository.load()) ?? createEmptySnapshot()

  useAppDataStore.setState({
    settings: withDeadlineBufferFallback(snapshot.settings),
    assignments: snapshot.assignments,
    isSetupComplete: snapshot.isSetupComplete,
    todaySnapshot: withTodaySnapshotFallback(snapshot.todaySnapshot),
  })
  useStudySessionStore.setState({ sessions: snapshot.sessions, running: null })

  return snapshot.learningStore
}

/**
 * 現在の全ストア状態をリポジトリへ保存する。
 * learningStoreはZustandストア化していないため（フェーズ5はイミュータブルな
 * データ操作のみを提供）、呼び出し側が保持している最新の値を渡す。
 */
export async function persistToRepository(
  repository: AppRepository,
  learningStore: LearningRecordStore,
): Promise<void> {
  await repository.save(buildSnapshot(learningStore))
}
