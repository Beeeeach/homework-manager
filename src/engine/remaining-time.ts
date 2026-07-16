/**
 * Assignmentの「残り予想時間（分）」を算出する。
 * 優先度計算（10.2①）の分子として使う最重要の基礎関数。
 * 宿題タイプごとに計算方法が異なるため、ここで一元化する。
 *
 * 変更点: repetition型は「周回」を導入したため、残り量は
 * (総必要量 = totalItems × cycleCount) - completedItems（累積実施量）で計算する。
 */
import type { Assignment, Phase, RepetitionAssignment } from '../domain'
import { getTotalRequiredItems } from '../domain/assignment'

export function getRemainingMinutes(assignment: Assignment): number {
  switch (assignment.type) {
    case 'page': {
      const remainingPages = Math.max(
        0,
        assignment.totalPages - assignment.currentPage,
      )
      return remainingPages * assignment.estimatedMinutesPerPage
    }
    case 'repetition': {
      const remainingItems = getRemainingItems(assignment)
      return remainingItems * assignment.estimatedMinutesPerItem
    }
    case 'creative':
    case 'project': {
      // 全体の推定合計時間 × 各工程の(比率 × 残り割合)の総和
      return assignment.phases.reduce(
        (sum, phase) =>
          sum + getRemainingMinutesForPhase(phase, assignment.estimatedTotalMinutes),
        0,
      )
    }
  }
}

/**
 * repetition型の「残り必要量」（周回込みの総必要量からcompletedItemsを引いた値）。
 * completedItemsは周をまたいで積み上がる累積実施量として扱う。
 */
export function getRemainingItems(assignment: RepetitionAssignment): number {
  const totalRequired = getTotalRequiredItems(assignment)
  return Math.max(0, totalRequired - assignment.completedItems)
}

/**
 * 創作型・プロジェクト型における、特定の工程1つ分の残り予想時間（分）。
 * 工程の残り時間 = 工程比率 × Assignment全体の推定合計時間 × (1 - 工程の進捗比率)
 */
export function getRemainingMinutesForPhase(
  phase: Phase,
  totalEstimatedMinutes: number,
): number {
  const remainingRatio = Math.max(0, 1 - phase.progressRatio)
  return phase.ratio * totalEstimatedMinutes * remainingRatio
}
