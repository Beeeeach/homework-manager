/**
 * 推定時間の更新（仕様書 14章）
 *
 *   newEstimate = α × 実測 + (1-α) × 旧推定
 *
 * α（学習率）は測定回数に応じて可変：
 *   測定回数が少ない → αを大きくする（実測を強く反映）
 *   測定回数が多い → αを小さくする（安定を重視）
 */

import { EMA_ALPHA_BY_SAMPLE_COUNT } from '../config/constants'
import type { LearningRecord } from './learning-record'

/**
 * 1回分の実測値でLearningRecordを更新する。
 * 初回（sampleCount === 0）は実測値をそのまま初期推定として採用する
 * （EMAの一般的な初期化方法。旧推定が存在しない状態でαを適用すると
 * 「旧推定」が未定義になってしまうため）。
 */
export function updateLearningRecord(
  record: LearningRecord,
  actualPerUnitMinutes: number,
): LearningRecord {
  if (record.sampleCount === 0) {
    return {
      ...record,
      currentEstimate: actualPerUnitMinutes,
      sampleCount: 1,
    }
  }

  const alpha = EMA_ALPHA_BY_SAMPLE_COUNT(record.sampleCount)
  const newEstimate =
    alpha * actualPerUnitMinutes + (1 - alpha) * record.currentEstimate

  return {
    ...record,
    currentEstimate: newEstimate,
    sampleCount: record.sampleCount + 1,
  }
}

/** 学習単位の初期レコードを作成する（初期値はユーザー入力による最初の見積もり） */
export function createInitialLearningRecord(
  homeworkType: LearningRecord['homeworkType'],
  subject: string,
  initialEstimate: number,
): LearningRecord {
  return {
    homeworkType,
    subject,
    currentEstimate: initialEstimate,
    sampleCount: 0,
  }
}
