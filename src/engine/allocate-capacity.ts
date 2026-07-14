/**
 * 割当ロジック（Allocation Logic）（仕様書 10.2③）
 *
 * その日のcapacityを、対象となる全宿題のスコア比率で按分する。
 *
 *   1. その日のcapacityを確定する
 *   2. score(assignment) = 優先度(assignment) × 日付重み(day) を算出する
 *   3. 各宿題への配分時間 = capacity × (score ÷ Σscore)
 *   4. 下限時間未満になる宿題は当日の割当から除外し、除外分のcapacityを
 *      残りの宿題で再按分する
 *   5. 端数は優先度最上位の宿題に加算する
 *
 * 手順4は「除外 → 再按分」で新たに下限時間未満の宿題が発生しうるため、
 * 全員が下限時間以上になるか、対象がいなくなるまで繰り返す。
 */

import { MIN_ALLOCATION_MINUTES } from '../config/constants'

export interface AllocationInput {
  assignmentId: string
  /** score(assignment) = 優先度 × 日付重み（呼び出し側で事前に算出しておく） */
  score: number
}

export interface AllocationResult {
  assignmentId: string
  allocatedMinutes: number
  /** 下限時間未満のため除外されたか */
  excludedByMinimum: boolean
}

export function allocateCapacity(
  capacityMinutes: number,
  inputs: AllocationInput[],
): AllocationResult[] {
  if (capacityMinutes <= 0 || inputs.length === 0) {
    return inputs.map((i) => ({
      assignmentId: i.assignmentId,
      allocatedMinutes: 0,
      excludedByMinimum: inputs.length > 0,
    }))
  }

  // スコアが0以下のものは最初から対象外（配分しても0になるだけなので）
  let active = inputs.filter((i) => i.score > 0)
  const excluded = inputs.filter((i) => i.score <= 0)

  if (active.length === 0) {
    return inputs.map((i) => ({
      assignmentId: i.assignmentId,
      allocatedMinutes: 0,
      excludedByMinimum: true,
    }))
  }

  let remainingCapacity = capacityMinutes
  const excludedResults: AllocationResult[] = excluded.map((i) => ({
    assignmentId: i.assignmentId,
    allocatedMinutes: 0,
    excludedByMinimum: true,
  }))

  // 手順3〜4: 下限時間未満が出なくなるまで按分を繰り返す
  let allocations: Map<string, number> = new Map()

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const totalScore = active.reduce((sum, i) => sum + i.score, 0)
    allocations = new Map(
      active.map((i) => [i.assignmentId, remainingCapacity * (i.score / totalScore)]),
    )

    const belowMinimum = active.filter(
      (i) => (allocations.get(i.assignmentId) ?? 0) < MIN_ALLOCATION_MINUTES,
    )

    if (belowMinimum.length === 0) {
      break
    }

    // 下限未満のものを除外し、そのcapacity分を差し引いて残りで再按分
    for (const item of belowMinimum) {
      excludedResults.push({
        assignmentId: item.assignmentId,
        allocatedMinutes: 0,
        excludedByMinimum: true,
      })
    }
    active = active.filter((i) => !belowMinimum.includes(i))

    if (active.length === 0) {
      allocations = new Map()
      break
    }
    // remainingCapacityは変えない（除外された分は「残りの宿題で再按分」＝
    // 全capacityを残りの宿題だけで按分し直すことと同義）
  }

  // 手順5: 端数を優先度最上位（スコア最大）の宿題に加算する
  if (active.length > 0) {
    const allocatedSum = Array.from(allocations.values()).reduce((a, b) => a + b, 0)
    const remainder = remainingCapacity - allocatedSum
    if (Math.abs(remainder) > 1e-9) {
      const top = active.reduce((best, cur) => (cur.score > best.score ? cur : best))
      allocations.set(top.assignmentId, (allocations.get(top.assignmentId) ?? 0) + remainder)
    }
  }

  const activeResults: AllocationResult[] = active.map((i) => ({
    assignmentId: i.assignmentId,
    allocatedMinutes: allocations.get(i.assignmentId) ?? 0,
    excludedByMinimum: false,
  }))

  return [...activeResults, ...excludedResults]
}
