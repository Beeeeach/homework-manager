/**
 * AllocationLog: スケジューリング／リスケジュール実行時の計算根拠（仕様書 15章）
 * 画面表示は不要（内部保持のみ）だが、Version2の「宿題理由の説明」機能を
 * MVPのデータから再現できるようにするために保存しておく。
 */

import type { DateString, DateTimeString, Id } from './common'

/** リスケジュールのトリガー種別（12章） */
export type AllocationTrigger =
  | 'initial'        // 宿題新規登録によるスケジューリング
  | 'reschedule_l1'  // レベル1: NearRange
  | 'reschedule_l2'  // レベル2: MediumRange
  | 'reschedule_l3'  // レベル3: 全期間再計算

/** その日・その宿題1件分の計算根拠 */
export interface AssignmentScoreEntry {
  assignmentId: Id
  /** 10.2①の優先度スコア */
  priorityScore: number
  /** score(assignment) = 優先度 × 日付重み（按分の元になった最終スコア） */
  finalScore: number
  /** 実際に配分された時間（分）。下限時間未満で除外された場合は0 */
  allocatedMinutes: number
  /** 下限時間未満のため当日の割当から除外されたか（10.2③手順4） */
  excludedByMinimum: boolean
}

export interface AllocationLog {
  id: Id
  /** この計算が対象とした日 */
  targetDate: DateString
  /** 計算を実行した日時 */
  executedAt: DateTimeString
  trigger: AllocationTrigger

  /** その日の日付重み（10.2②） */
  dayWeight: number
  /** その日のcapacity（勉強可能時間、分） */
  capacityMinutes: number

  /** その日に対象となった全宿題のスコア内訳 */
  scores: AssignmentScoreEntry[]
}
