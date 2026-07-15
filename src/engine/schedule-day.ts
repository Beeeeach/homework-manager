/**
 * 1日分のスケジュール生成（仕様書 10.2①〜③の統合・改訂版）
 *
 * 特定の1日について、対象となる全宿題の優先度・日付重みからスコアを算出し、
 * その日のcapacityを集中配分方式で割り当てる。フェーズ4のリスケジュールエンジンからも
 * この関数を再利用する想定。
 */

import type { Assignment, DateString } from '../domain'
import { calculatePriority, isUrgent } from './priority'
import { getDayWeight, getCapacityMinutes } from './day-weight'
import { getRemainingMinutes } from './remaining-time'
import { allocateCapacity } from './allocate-capacity'
import type { AllocationResult } from './allocate-capacity'
import type { UserSettings } from '../domain'

export interface DayScheduleResult {
  date: DateString
  capacityMinutes: number
  dayWeight: number
  /** 対象宿題ごとの優先度スコア・最終スコア・配分結果（AllocationLog生成の元データ） */
  allocations: (AllocationResult & { priorityScore: number; finalScore: number })[]
}

/**
 * 特定の1日について、対象宿題群への時間配分を算出する。
 * 完了済み・残り時間0の宿題は対象から自然に除外される（優先度0→スコア0→按分対象外）。
 */
export function scheduleForDay(
  date: DateString,
  assignments: Assignment[],
  settings: UserSettings,
): DayScheduleResult {
  const capacityMinutes = getCapacityMinutes(date, settings)
  const dayWeight = getDayWeight(date, settings)

  const scored = assignments
    .filter((a) => !a.isCompleted)
    .map((a) => {
      const priorityScore = calculatePriority(a, date, settings)
      const finalScore = priorityScore * dayWeight
      return { assignment: a, priorityScore, finalScore }
    })

  const allocationInputs = scored.map((s) => ({
    assignmentId: s.assignment.id,
    score: s.finalScore,
    remainingMinutes: getRemainingMinutes(s.assignment),
    isUrgent: isUrgent(date, s.assignment.deadline),
  }))

  const results = allocateCapacity(capacityMinutes, allocationInputs)

  const allocations = results.map((r) => {
    const scoreInfo = scored.find((s) => s.assignment.id === r.assignmentId)!
    return {
      ...r,
      priorityScore: scoreInfo.priorityScore,
      finalScore: scoreInfo.finalScore,
    }
  })

  return { date, capacityMinutes, dayWeight, allocations }
}
