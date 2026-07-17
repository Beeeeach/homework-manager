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
 *
 * 【予想時間の学習（仕様書14章）】
 * page/repetition型は、実際にかかった時間（actualMinutes）が渡された場合、
 * 「1単位あたりの実測時間」を逆算し、既存のema.ts（updateLearningRecord）と同じ
 * EMA計算式でestimatedMinutesPerPage/estimatedMinutesPerItemを更新する。
 * これにより、記録するたびにその宿題固有の予想時間が実態に近づいていく。
 * actualMinutesが渡されない場合（手入力で時間未入力等）は、進捗のみ反映しEMA更新は行わない。
 */

import type { Assignment } from '../domain'
import { getTotalRequiredItems } from '../domain/assignment'
import { updateLearningRecord } from '../engine/ema'
import type { LearningRecord } from '../engine/learning-record'

export interface RecordedProgressInput {
  /** 記録された「進んだ量」。page: ページ数、repetition: 項目数、creative/project: 工程進捗比率の増分 */
  amount: number
  /** creative/project型の場合、対象工程のID。page/repetition型では不要 */
  phaseId?: string
  /**
   * 実際にかかった時間（分）。page/repetition型でこれが渡されると、
   * 1単位あたりの実測時間をEMAで学習し、estimatedMinutesPerPage等を更新する。
   */
  actualMinutes?: number
}

/**
 * 現在のestimatedMinutesPerPage（またはPerItem）とestimateSampleCountを
 * 仮のLearningRecordとして扱い、ema.tsのupdateLearningRecordで更新した結果を返す。
 * これにより、EMAの計算式やα（学習率）の決定ロジックをそのまま再利用できる。
 */
function updateEstimateWithEma(
  currentEstimate: number,
  sampleCount: number,
  actualPerUnitMinutes: number,
): { estimate: number; sampleCount: number } {
  const fakeRecord: LearningRecord = {
    homeworkType: 'page', // updateLearningRecordはhomeworkTypeを参照しないため仮の値でよい
    subject: '',
    currentEstimate,
    sampleCount,
  }
  const updated = updateLearningRecord(fakeRecord, actualPerUnitMinutes)
  return { estimate: updated.currentEstimate, sampleCount: updated.sampleCount }
}

/**
 * 記録された進捗量をAssignmentに加算した、新しいAssignmentを返す（イミュータブル）。
 * 完了扱いの判定（isCompleted）もあわせて更新する。
 */
export function applyRecordedProgress(
  assignment: Assignment,
  input: RecordedProgressInput,
): Assignment {
  const { amount, phaseId, actualMinutes } = input
  if (amount <= 0) return assignment

  switch (assignment.type) {
    case 'page': {
      const nextCurrentPage = Math.min(assignment.totalPages, assignment.currentPage + amount)

      // 実測時間があれば、1ページあたりの実測値からEMAで予想を更新する
      if (actualMinutes !== undefined && actualMinutes > 0) {
        const actualPerPage = actualMinutes / amount
        const { estimate, sampleCount } = updateEstimateWithEma(
          assignment.estimatedMinutesPerPage,
          assignment.estimateSampleCount ?? 0,
          actualPerPage,
        )
        return {
          ...assignment,
          currentPage: nextCurrentPage,
          isCompleted: nextCurrentPage >= assignment.totalPages,
          estimatedMinutesPerPage: estimate,
          estimateSampleCount: sampleCount,
        }
      }

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

      if (actualMinutes !== undefined && actualMinutes > 0) {
        const actualPerItem = actualMinutes / amount
        const { estimate, sampleCount } = updateEstimateWithEma(
          assignment.estimatedMinutesPerItem,
          assignment.estimateSampleCount ?? 0,
          actualPerItem,
        )
        return {
          ...assignment,
          completedItems: nextCompletedItems,
          isCompleted: nextCompletedItems >= totalRequired,
          estimatedMinutesPerItem: estimate,
          estimateSampleCount: sampleCount,
        }
      }

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
