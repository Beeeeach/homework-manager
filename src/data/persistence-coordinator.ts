/**
 * 永続化コーディネーター。
 * app-data-store・study-session-store・学習ストアの状態をまとめて
 * AppSnapshotとして保存/復元する。各ストアに個別の永続化ロジックを
 * 埋め込まず、この層に集約することで責務を分離する。
 */

import type { AppRepository } from './repository'
import { createEmptySnapshot } from './repository'
import { useAppDataStore } from '../store/app-data-store'
import { useStudySessionStore } from '../store/study-session-store'
import type { LearningRecordStore } from '../engine/learning-store'

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
  }
}

/** アプリ起動時にリポジトリからスナップショットを読み込み、各ストアへ反映する */
export async function hydrateFromRepository(
  repository: AppRepository,
): Promise<LearningRecordStore> {
  const snapshot = (await repository.load()) ?? createEmptySnapshot()

  useAppDataStore.setState({
    settings: snapshot.settings,
    assignments: snapshot.assignments,
    isSetupComplete: snapshot.isSetupComplete,
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
