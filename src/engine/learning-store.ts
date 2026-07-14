/**
 * 学習レコードのコレクション操作。
 * 「宿題タイプ×教科」ごとに1つのLearningRecordを持つ集合を、
 * イミュータブルな操作（Map操作の関数版）として提供する。
 * 実際の永続化（localStorage等）はフェーズ9のリポジトリ層が担当し、
 * ここでは純粋なデータ操作のみを扱う。
 */

import type { LearningKey, LearningRecord } from './learning-record'
import { learningKeyToString } from './learning-record'
import { updateLearningRecord, createInitialLearningRecord } from './ema'

export type LearningRecordStore = Record<string, LearningRecord>

/** 指定キーのレコードを取得する。存在しなければnull */
export function findLearningRecord(
  store: LearningRecordStore,
  key: LearningKey,
): LearningRecord | null {
  return store[learningKeyToString(key)] ?? null
}

/**
 * 実測値を反映してストアを更新する。
 * 該当する学習単位のレコードがまだ存在しない場合は、initialEstimateFallbackを
 * 初期値として新規作成してから実測を反映する。
 */
export function applyActualToStore(
  store: LearningRecordStore,
  key: LearningKey,
  actualPerUnitMinutes: number,
  initialEstimateFallback: number,
): LearningRecordStore {
  const k = learningKeyToString(key)
  const existing =
    store[k] ?? createInitialLearningRecord(key.homeworkType, key.subject, initialEstimateFallback)
  const updated = updateLearningRecord(existing, actualPerUnitMinutes)

  return { ...store, [k]: updated }
}

/** 指定キーの推定値を取得する。レコードがなければfallback値を返す */
export function getEstimate(
  store: LearningRecordStore,
  key: LearningKey,
  fallback: number,
): number {
  const record = findLearningRecord(store, key)
  return record ? record.currentEstimate : fallback
}
