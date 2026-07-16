/**
 * 複数日にまたがるスケジュール予測（executeReschedule）のための補助関数。
 *
 * 【背景】
 * scheduleForDayは「その時点のAssignmentの残り時間」を見て1日分の配分を計算する。
 * 複数日分をまとめて予測する際、日をまたいでも同じAssignmentをそのまま渡すと、
 * 前日に配分された分が全く消化されていない扱いになり、
 * 同じ残り時間が毎日重複して配分されてしまう（過大な合計になるバグ）。
 *
 * これを防ぐため、「その日に配分された分（allocatedMinutes）だけ進捗したと仮定した
 * 仮のAssignment」を作り、翌日以降の計算に引き継ぐ。
 *
 * 注意: これはあくまで複数日予測のための仮想的な進捗であり、
 * 実際のユーザーの学習記録（StudySession）やAssignmentの実データは一切変更しない。
 */

import type { Assignment } from '../domain'

/**
 * 指定した分数だけ進捗したと仮定した、Assignmentのコピーを返す。
 * タイプごとに「時間 → 進捗量」の逆算方法が異なるため、ここで一元化する。
 * 残り時間を超える分を渡された場合は、進捗100%（残り時間0）でクリップする。
 */
export function applyVirtualProgress(
  assignment: Assignment,
  allocatedMinutes: number,
): Assignment {
  if (allocatedMinutes <= 0) return assignment

  switch (assignment.type) {
    case 'page': {
      const pagesAdvanced = allocatedMinutes / assignment.estimatedMinutesPerPage
      const nextCurrentPage = Math.min(
        assignment.totalPages,
        assignment.currentPage + pagesAdvanced,
      )
      return { ...assignment, currentPage: nextCurrentPage }
    }
    case 'repetition': {
      const itemsAdvanced = allocatedMinutes / assignment.estimatedMinutesPerItem
      const nextCompletedItems = Math.min(
        assignment.totalItems,
        assignment.completedItems + itemsAdvanced,
      )
      return { ...assignment, completedItems: nextCompletedItems }
    }
    case 'creative':
    case 'project': {
      // 工程を先頭から順に消化していく想定で、配分された分数を工程のprogressRatioに反映する。
      // 1工程あたりの残り時間 = ratio × totalEstimatedMinutes × (1 - progressRatio)
      let remainingToApply = allocatedMinutes
      const nextPhases = assignment.phases.map((phase) => {
        if (remainingToApply <= 0) return phase

        const phaseTotalMinutes = phase.ratio * assignment.estimatedTotalMinutes
        const phaseRemainingMinutes = phaseTotalMinutes * (1 - phase.progressRatio)

        if (phaseRemainingMinutes <= 0) return phase

        const applied = Math.min(remainingToApply, phaseRemainingMinutes)
        remainingToApply -= applied

        const additionalRatio = phaseTotalMinutes > 0 ? applied / phaseTotalMinutes : 0
        const nextProgressRatio = Math.min(1, phase.progressRatio + additionalRatio)

        return {
          ...phase,
          progressRatio: nextProgressRatio,
          isCompleted: nextProgressRatio >= 1,
        }
      })
      return { ...assignment, phases: nextPhases }
    }
  }
}

/**
 * その日の配分結果（allocations）をもとに、翌日以降の計算で使うAssignment一覧を作る。
 * 配分されなかった宿題（allocatedMinutes === 0）はそのまま返す。
 */
export function advanceAssignments(
  assignments: Assignment[],
  allocations: { assignmentId: string; allocatedMinutes: number }[],
): Assignment[] {
  return assignments.map((a) => {
    const allocation = allocations.find((al) => al.assignmentId === a.id)
    if (!allocation || allocation.allocatedMinutes <= 0) return a
    return applyVirtualProgress(a, allocation.allocatedMinutes)
  })
}
