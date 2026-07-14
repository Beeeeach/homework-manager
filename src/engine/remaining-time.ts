/**
 * Assignmentの「残り予想時間（分）」を算出する。
 * 優先度計算（10.2①）の分子として使う最重要の基礎関数。
 * 宿題タイプごとに計算方法が異なるため、ここで一元化する。
 */

import type { Assignment, Phase } from '../domain'

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
      const remainingItems = Math.max(
        0,
        assignment.totalItems - assignment.completedItems,
      )
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
