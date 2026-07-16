/**
 * RecordPanel（13章）で記録された「進んだ量」を、Assignmentの進捗フィールドに反映する。
 *
 * apply-virtual-progress.ts（executeRescheduleの複数日予測用）は「時間（分）」を
 * 入力に取る仮想的な進捗計算だったが、こちらは実際にユーザーが記録した
 * 「量（ページ数・項目数など）」をそのままAssignmentへ加算する、実データ用の関数。
 *
 * タイプごとの「量」の意味:
 *   page: 進んだページ数
 *   repetition: 進んだ項目数
 *   creative/project: 対象工程（phaseId）の進捗比率（0〜1）への加算量
 *     ※ 創作・プロジェクト型は「量」の単位がページ数等と異なり比率そのものであるため、
 *        RecordPanel側でamountを「今回の工程進捗比率の増分」として入力する想定。
 */

import type { Assignment } from '../domain'
import { getTotalRequiredItems } from '../domain/assignment'

export interface RecordedProgressInput {
  /** 記録された「進んだ量」。page: ページ数、repetition: 項目数、creative/project: 工程進捗比率の増分 */
  amount: number
  /** creative/project型の場合、対象工程のID。page/repetition型では不要 */
  phaseId?: string
}

/**
 * 記録された進捗量をAssignmentに加算した、新しいAssignmentを返す（イミュータブル）。
 * 完了扱いの判定（isCompleted）もあわせて更新する。
 */
export function applyRecordedProgress(
  assignment: Assignment,
  input: RecordedProgressInput,
): Assignment {
  const { amount, phaseId } = input
  if (amount <= 0) return assignment

  switch (assignment.type) {
    case 'page': {
      const nextCurrentPage = Math.min(assignment.totalPages, assignment.currentPage + amount)
      return {
        ...assignment,
        currentPage: nextCurrentPage,
        isCompleted: nextCurrentPage >= assignment.totalPages,
      }
    }
    case 'repetition': {
      // 周回込みの総必要量（totalItems × cycleCount）を上限とする
      const totalRequired = getTotalRequiredItems(assignment)
      const nextCompletedItems = Math.min(totalRequired, assignment.completedItems + amount)
      return {
        ...assignment,
        completedItems: nextCompletedItems,
        isCompleted: nextCompletedItems >= totalRequired,
      }
    }
    case 'creative':
    case 'project': {
      if (!phaseId) return assignment

      const nextPhases = assignment.phases.map((phase) => {
        if (phase.id !== phaseId) return phase
        const nextProgressRatio = Math.min(1, phase.progressRatio + amount)
        return {
          ...phase,
          progressRatio: nextProgressRatio,
          isCompleted: nextProgressRatio >= 1,
        }
      })

      const allPhasesCompleted = nextPhases.every((p) => p.isCompleted)

      return {
        ...assignment,
        phases: nextPhases,
        isCompleted: allPhasesCompleted,
      }
    }
  }
}
