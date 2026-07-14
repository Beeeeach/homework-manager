/**
 * StudySession（実際の勉強記録）から「1単位あたりの実測時間」を算出する。
 * EMA更新（ema.ts）への入力を作るための変換関数。
 *
 * 1単位の意味はAssignmentのタイプに依存する：
 *   ページ型: 1ページあたりの時間 = actualMinutes / actualAmount（ページ数）
 *   反復型: 1項目あたりの時間 = actualMinutes / actualAmount（項目数）
 *   創作型・プロジェクト型: 工程の進捗比率1.0あたりの時間
 *     = actualMinutes / actualAmount（このセッションで進んだ進捗比率、0〜1）
 *
 * いずれも「actualMinutes ÷ actualAmount」という同一の式になるため、
 * 実質1つの関数で足りるが、意図を明確にするため名前付きで公開する。
 * actualAmountが0の場合（進捗なしで時間だけ記録されたケース）はnullを返し、
 * 呼び出し側でEMA更新をスキップする判断ができるようにする。
 */

import type { StudySession } from '../domain'

export function calculateActualPerUnitMinutes(
  session: StudySession,
): number | null {
  if (session.actualAmount <= 0) return null
  if (session.actualMinutes <= 0) return null
  return session.actualMinutes / session.actualAmount
}
