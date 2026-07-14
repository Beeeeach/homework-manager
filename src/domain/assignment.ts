/**
 * Assignment: 宿題全体（仕様書 15章）
 * 例：数学ワーク、英単語、読書感想文、自由研究 など。
 *
 * 宿題タイプ（7章）によって必要な入力項目が異なるため、
 * `type` フィールドで判別可能なユニオン型として表現する。
 * こうすることで、例えば creative 型にだけ存在する `phases` を
 * TypeScriptの型チェックで安全に扱える。
 */

import type { DateString, Id } from './common'
import type { HomeworkType } from '../config/constants'

/** 全タイプ共通のフィールド */
interface AssignmentBase {
  id: Id
  title: string
  subject: string
  type: HomeworkType
  deadline: DateString
  /** 登録日。優先度計算の「残り日数」の起点にはならないが記録用に保持 */
  createdAt: DateString
  /** 完了しているか（全工程・全ページ・全単語が終わっているか） */
  isCompleted: boolean
}

/** ① ページ型（数学ワーク、英語ワークなど） */
export interface PageAssignment extends AssignmentBase {
  type: 'page'
  totalPages: number
  currentPage: number
  /** 1ページ当たりの予想時間（分）。初期値はユーザー選択、後にEMAで更新される */
  estimatedMinutesPerPage: number
}

/** ② 反復型（英単語、漢字、古文単語など） */
export interface RepetitionAssignment extends AssignmentBase {
  type: 'repetition'
  totalItems: number
  completedItems: number
  /** 項目1つ当たりの予想時間（分） */
  estimatedMinutesPerItem: number
}

/** 創作型・プロジェクト型に共通する「工程」 */
export interface Phase {
  id: Id
  name: string
  /** その工程が全体に占める時間比率（0〜1） */
  ratio: number
  /** その工程の完了状況（0〜1、ページ型の currentPage/totalPages に相当する概念） */
  progressRatio: number
  isCompleted: boolean
}

/** ③ 創作型（読書感想文、作文、小論文など） */
export interface CreativeAssignment extends AssignmentBase {
  type: 'creative'
  targetCharCount: number
  /**
   * 全体の推定所要時間（分）。
   * 初期値は文字数から自動推定するが、ユーザーが大きくずれていると感じた場合は
   * 手入力で上書きできる（isEstimateManual で判別）。
   * その後は14章のEMA学習で実測に基づき精度が上がっていく。
   */
  estimatedTotalMinutes: number
  isEstimateManual: boolean
  phases: Phase[]
}

/** ④ プロジェクト型（自由研究、工作、探究など） */
export interface ProjectAssignment extends AssignmentBase {
  type: 'project'
  /** 創作型と同様。プロジェクト型は文字数の概念がないため、工程数ベースの簡易推定を初期値とする */
  estimatedTotalMinutes: number
  isEstimateManual: boolean
  phases: Phase[]
}

/** 4タイプをまとめたユニオン型。エンジン層はこの型を主に扱う */
export type Assignment =
  | PageAssignment
  | RepetitionAssignment
  | CreativeAssignment
  | ProjectAssignment
