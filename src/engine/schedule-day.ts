/**
 * 1日分のスケジュール生成（仕様書 10.2①〜③の統合・改訂版）
 *
 * 特定の1日について、対象となる全宿題の優先度・日付重みからスコアを算出し、
 * その日のcapacityを集中配分方式で割り当てる。フェーズ4のリスケジュールエンジンからも
 * この関数を再利用する想定。
 *
 * 【頻度指定つき反復型（repetition）の扱い】
 * 「N日に1回」の頻度が指定された反復型は、通常の集中配分（スコア順に30分ブロックを積む）
 * とは別枠で扱う:
 *   1. 今日が実施日でない反復型は、最初から対象から除外する（他の宿題にcapacityを譲る）
 *   2. 今日が実施日の反復型は、頻度計算（calculateItemsPerOccurrence）で決まる
 *      「今日必要な時間」を固定値として先に確保し、残りのcapacityを
 *      それ以外の宿題（page/creative/project、および実施日の反復型の残り分があれば）で
 *      通常の集中配分にかける。
 * これにより「毎日やる」という頻度の約束を、優先度スコアの上下に左右されず守れるようにする。
 */

import type { Assignment, DateString, RepetitionAssignment } from '../domain'
import { calculatePriority, isUrgent } from './priority'
import { getDayWeight, getCapacityMinutes } from './day-weight'
import { getRemainingMinutes } from './remaining-time'
import { allocateCapacity } from './allocate-capacity'
import type { AllocationResult } from './allocate-capacity'
import type { UserSettings } from '../domain'
import { isOccurrenceDay, calculateItemsPerOccurrence } from './repetition-frequency'

export interface DayScheduleResult {
  date: DateString
  capacityMinutes: number
  dayWeight: number
  /** 対象宿題ごとの優先度スコア・最終スコア・配分結果（AllocationLog生成の元データ） */
  allocations: (AllocationResult & { priorityScore: number; finalScore: number })[]
}

function isRepetitionWithFrequency(a: Assignment): a is RepetitionAssignment {
  return a.type === 'repetition'
}

/**
 * 特定の1日について、対象宿題群への時間配分を算出する。
 * 完了済み・残り時間0の宿題は対象から自然に除外される（優先度0→スコア0→按分対象外）。
 * 頻度指定つき反復型は、実施日でなければ完全に除外し、実施日なら固定時間を先に確保する。
 */
export function scheduleForDay(
  date: DateString,
  assignments: Assignment[],
  settings: UserSettings,
): DayScheduleResult {
  const capacityMinutes = getCapacityMinutes(date, settings)
  const dayWeight = getDayWeight(date, settings)

  // 完了済み、および「頻度指定つき反復型で今日が実施日でないもの」を対象から除外する
  const candidates = assignments.filter((a) => {
    if (a.isCompleted) return false
    if (isRepetitionWithFrequency(a) && !isOccurrenceDay(a, date)) return false
    return true
  })

  // 実施日の反復型は、頻度計算による固定時間を先に確保する（通常の集中配分の対象外）
  const fixedRepetitionAllocations: (AllocationResult & {
    priorityScore: number
    finalScore: number
  })[] = []
  let remainingCapacityAfterFixed = capacityMinutes

  const flexibleCandidates = candidates.filter((a) => {
    if (!isRepetitionWithFrequency(a)) return true

    const itemsPerOccurrence = calculateItemsPerOccurrence(a, date)
    if (itemsPerOccurrence <= 0) return false

    const fixedMinutes = Math.min(
      itemsPerOccurrence * a.estimatedMinutesPerItem,
      remainingCapacityAfterFixed,
    )
    if (fixedMinutes <= 0) return false

    const priorityScore = calculatePriority(a, date, settings)
    fixedRepetitionAllocations.push({
      assignmentId: a.id,
      allocatedMinutes: fixedMinutes,
      excludedByMinimum: false,
      priorityScore,
      finalScore: priorityScore * dayWeight,
    })
    remainingCapacityAfterFixed -= fixedMinutes
    return false
  })

  const scored = flexibleCandidates.map((a) => {
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

  const results = allocateCapacity(remainingCapacityAfterFixed, allocationInputs)

  const flexibleAllocations = results.map((r) => {
    const scoreInfo = scored.find((s) => s.assignment.id === r.assignmentId)!
    return {
      ...r,
      priorityScore: scoreInfo.priorityScore,
      finalScore: scoreInfo.finalScore,
    }
  })

  return {
    date,
    capacityMinutes,
    dayWeight,
    allocations: [...fixedRepetitionAllocations, ...flexibleAllocations],
  }
}
