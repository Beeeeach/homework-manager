/**
 * StudySession: 実際の勉強記録（仕様書 15章、13章）
 * ストップウォッチ方式で記録されるほか、手入力にも対応する。
 * 途中終了でも保存される（13章）。
 */

import type { DateTimeString, Id } from './common'

export interface StudySession {
  id: Id
  taskId: Id
  assignmentId: Id

  startedAt: DateTimeString
  /** 途中終了の場合もここに終了時刻を記録する（未終了状態は存在しない = 必ず終了操作で保存） */
  endedAt: DateTimeString

  /** 実際に進んだ量。Taskのplannedamountと同じ単位系（ページ数・項目数・進捗比率など） */
  actualAmount: number

  /** 実際にかかった時間（分） */
  actualMinutes: number

  /** ストップウォッチ経由か手入力かの区別。学習機能（14章）の精度検証や表示に利用 */
  recordMethod: 'stopwatch' | 'manual'
}
