/**
 * Task: 最小作業単位（仕様書 15章）
 * 例：「数学ワーク P1〜5」「英単語 100〜150番」「読書感想文：下書き（○月○日分）」
 *
 * Taskはスケジューリングエンジン（10章）が生成する「その日に割り当てられた作業」を表す。
 * Assignmentが宿題全体、Taskはそれを日ごとに分割した実行単位、という関係。
 */

import type { DateString, Id } from './common'

export interface Task {
  id: Id
  assignmentId: Id
  /** 割り当てられた日 */
  date: DateString

  /**
   * 予定量。
   * ページ型: ページ数 / 反復型: 項目数 / 創作・プロジェクト型: 該当工程の進捗比率(0〜1)
   * 単位が宿題タイプによって異なるため、意味の解釈はengine層に委ねる。
   */
  plannedAmount: number

  /** 予定時間（分）。10.2③の割当ロジックで算出される値 */
  plannedMinutes: number

  /** 創作型・プロジェクト型の場合、対象となる工程のID。ページ型・反復型ではundefined */
  phaseId?: Id

  /** このTaskが完了しているか */
  isCompleted: boolean

  /**
   * このTaskがどのスケジューリング／リスケジュールで生成されたかを辿るための参照。
   * AllocationLogと紐付けることで「なぜこの割当になったか」を後から追跡できる（Version2の宿題理由説明に対応）。
   */
  allocationLogId?: Id
}
