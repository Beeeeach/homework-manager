/**
 * 学習機能（仕様書 14章）のデータ構造。
 * MVPでの学習単位は「宿題タイプ × 教科」（例：ページ型×数学）。
 * この単位ごとに「1単位あたりの所要時間」の推定値をEMAで更新し続ける。
 *
 * 「1単位」の意味はタイプによって異なる：
 *   ページ型: 1ページあたりの時間
 *   反復型: 1項目あたりの時間
 *   創作型・プロジェクト型: 工程の残り比率1.0あたりの時間（＝全体の推定合計時間に相当）
 */

import type { HomeworkType } from '../config/constants'

export interface LearningKey {
  homeworkType: HomeworkType
  subject: string
}

export interface LearningRecord {
  homeworkType: HomeworkType
  subject: string
  /** 現在の推定値（1単位あたりの分） */
  currentEstimate: number
  /** これまでの実測回数（αの決定に使う） */
  sampleCount: number
}

/** LearningKeyから一意な文字列キーを生成する（ストアのMapキーなどに使う） */
export function learningKeyToString(key: LearningKey): string {
  return `${key.homeworkType}::${key.subject}`
}
