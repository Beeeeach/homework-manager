import { describe, it, expect } from 'vitest'
import { allocateCapacity } from './allocate-capacity'
import { BLOCK_MINUTES, MAX_ASSIGNMENTS_PER_DAY } from '../config/constants'

// このテストファイルは「集中配分」自体のロジック（誰から先に、何分ブロックで配分するか）を
// 検証するためのものなので、1宿題あたりの1日上限（maxMinutesPerAssignment）による影響を
// 受けないよう、ここでは十分大きな値を指定する。上限自体の挙動を検証するテストは
// このファイルの末尾に別途追加している。
const NO_PRACTICAL_LIMIT = 100000

describe('allocateCapacity（集中配分方式）', () => {
  it('スコア最上位から順に、残り時間ぶんまとめて配分される', () => {
    const result = allocateCapacity(
      100,
      [
        { assignmentId: 'a', score: 30, remainingMinutes: 40, isUrgent: false },
        { assignmentId: 'b', score: 70, remainingMinutes: 50, isUrgent: false },
      ],
      NO_PRACTICAL_LIMIT,
    )
    const a = result.find((r) => r.assignmentId === 'a')!
    const b = result.find((r) => r.assignmentId === 'b')!

    // スコアが高いbから先に配分される: b=50分（残り時間分）、残り50分をaに配分
    expect(b.allocatedMinutes).toBeCloseTo(50)
    expect(b.excludedByMinimum).toBe(false)
    expect(a.allocatedMinutes).toBeCloseTo(40)
    expect(a.excludedByMinimum).toBe(false)
  })

  it('配分の合計はcapacityを超えない', () => {
    const result = allocateCapacity(
      100,
      [
        { assignmentId: 'a', score: 33, remainingMinutes: 200, isUrgent: false },
        { assignmentId: 'b', score: 33, remainingMinutes: 200, isUrgent: false },
        { assignmentId: 'c', score: 34, remainingMinutes: 200, isUrgent: false },
      ],
      NO_PRACTICAL_LIMIT,
    )
    const total = result.reduce((sum, r) => sum + r.allocatedMinutes, 0)
    expect(total).toBeLessThanOrEqual(100)
  })

  it(`1件に手をつけたら、その宿題の残り時間かcapacity上限まで配分される（${BLOCK_MINUTES}分ブロック未満は次に回さない）`, () => {
    // capacity=60分、最優先の宿題は残り時間20分（BLOCK_MINUTES=30未満）
    // 緊急でなければスキップされ、次の宿題に60分そのまま渡る
    const result = allocateCapacity(
      60,
      [
        { assignmentId: 'small', score: 100, remainingMinutes: 20, isUrgent: false },
        { assignmentId: 'big', score: 50, remainingMinutes: 100, isUrgent: false },
      ],
      NO_PRACTICAL_LIMIT,
    )
    const small = result.find((r) => r.assignmentId === 'small')!
    const big = result.find((r) => r.assignmentId === 'big')!

    expect(small.excludedByMinimum).toBe(true)
    expect(small.allocatedMinutes).toBe(0)
    expect(big.allocatedMinutes).toBeCloseTo(60)
    expect(big.excludedByMinimum).toBe(false)
  })

  it('緊急（残り1日）の宿題は、ブロック未満でもスキップされず配分される', () => {
    const result = allocateCapacity(
      60,
      [
        { assignmentId: 'urgent-small', score: 100, remainingMinutes: 10, isUrgent: true },
        { assignmentId: 'big', score: 50, remainingMinutes: 100, isUrgent: false },
      ],
      NO_PRACTICAL_LIMIT,
    )
    const urgentSmall = result.find((r) => r.assignmentId === 'urgent-small')!
    const big = result.find((r) => r.assignmentId === 'big')!

    expect(urgentSmall.excludedByMinimum).toBe(false)
    expect(urgentSmall.allocatedMinutes).toBeCloseTo(10)
    // 残り50分がbigに渡る
    expect(big.allocatedMinutes).toBeCloseTo(50)
  })

  it(`1日の割当件数は最大${MAX_ASSIGNMENTS_PER_DAY}件までで、capacityが余っても打ち切られる`, () => {
    const inputs = Array.from({ length: MAX_ASSIGNMENTS_PER_DAY + 2 }, (_, i) => ({
      assignmentId: `item-${i}`,
      score: 100 - i, // スコアはitem-0が最高
      remainingMinutes: BLOCK_MINUTES, // ちょうどBLOCK_MINUTES分ずつ
      isUrgent: false,
    }))

    const result = allocateCapacity(1000, inputs, NO_PRACTICAL_LIMIT)
    const assignedCount = result.filter((r) => !r.excludedByMinimum).length

    expect(assignedCount).toBe(MAX_ASSIGNMENTS_PER_DAY)
    // 上限に達した後の宿題は、capacityが余っていてもスキップされる
    const overflowItems = result.filter(
      (r) => Number(r.assignmentId.split('-')[1]) >= MAX_ASSIGNMENTS_PER_DAY,
    )
    expect(overflowItems.every((r) => r.excludedByMinimum)).toBe(true)
  })

  it('スコアが0以下の宿題は最初から除外される', () => {
    const result = allocateCapacity(
      50,
      [
        { assignmentId: 'a', score: 10, remainingMinutes: 100, isUrgent: false },
        { assignmentId: 'zero', score: 0, remainingMinutes: 100, isUrgent: false },
      ],
      NO_PRACTICAL_LIMIT,
    )
    const zero = result.find((r) => r.assignmentId === 'zero')!
    expect(zero.excludedByMinimum).toBe(true)
    expect(zero.allocatedMinutes).toBe(0)
  })

  it('capacityが0の場合は全員除外扱いになる', () => {
    const result = allocateCapacity(
      0,
      [
        { assignmentId: 'a', score: 10, remainingMinutes: 100, isUrgent: false },
        { assignmentId: 'b', score: 20, remainingMinutes: 100, isUrgent: false },
      ],
      NO_PRACTICAL_LIMIT,
    )
    expect(result.every((r) => r.allocatedMinutes === 0)).toBe(true)
    expect(result.every((r) => r.excludedByMinimum)).toBe(true)
  })

  it('入力が空配列なら空配列を返す', () => {
    expect(allocateCapacity(100, [], NO_PRACTICAL_LIMIT)).toEqual([])
  })

  it('残り時間がBLOCK_MINUTES未満の宿題が複数連続しても、緊急でなければ全てスキップされ次の宿題に回る', () => {
    const result = allocateCapacity(
      50,
      [
        { assignmentId: 'small1', score: 100, remainingMinutes: 10, isUrgent: false },
        { assignmentId: 'small2', score: 90, remainingMinutes: 15, isUrgent: false },
        { assignmentId: 'big', score: 80, remainingMinutes: 200, isUrgent: false },
      ],
      NO_PRACTICAL_LIMIT,
    )
    const small1 = result.find((r) => r.assignmentId === 'small1')!
    const small2 = result.find((r) => r.assignmentId === 'small2')!
    const big = result.find((r) => r.assignmentId === 'big')!

    expect(small1.excludedByMinimum).toBe(true)
    expect(small2.excludedByMinimum).toBe(true)
    expect(big.allocatedMinutes).toBeCloseTo(50)
  })

  it('全宿題の残り時間がBLOCK_MINUTES未満かつ非緊急なら、全員除外される', () => {
    const result = allocateCapacity(
      100,
      [
        { assignmentId: 'a', score: 1, remainingMinutes: 10, isUrgent: false },
        { assignmentId: 'b', score: 1, remainingMinutes: 10, isUrgent: false },
      ],
      NO_PRACTICAL_LIMIT,
    )
    expect(result.every((r) => r.excludedByMinimum)).toBe(true)
    expect(result.every((r) => r.allocatedMinutes === 0)).toBe(true)
  })

  it('maxMinutesPerAssignmentを超える分は配分されない（1宿題への偏りを防ぐ上限）', () => {
    // capacity=200分、1件だけだが上限90分までしか配分されない
    const result = allocateCapacity(
      200,
      [{ assignmentId: 'a', score: 10, remainingMinutes: 200, isUrgent: false }],
      90,
    )
    const a = result.find((r) => r.assignmentId === 'a')!
    expect(a.allocatedMinutes).toBeCloseTo(90)
  })

  it('maxMinutesPerAssignmentの上限で余ったcapacityは、次の優先度の宿題に回る', () => {
    const result = allocateCapacity(
      200,
      [
        { assignmentId: 'a', score: 100, remainingMinutes: 200, isUrgent: false },
        { assignmentId: 'b', score: 50, remainingMinutes: 200, isUrgent: false },
      ],
      90,
    )
    const a = result.find((r) => r.assignmentId === 'a')!
    const b = result.find((r) => r.assignmentId === 'b')!

    expect(a.allocatedMinutes).toBeCloseTo(90)
    // 残り110分のうち、bにも上限90分まで配分される
    expect(b.allocatedMinutes).toBeCloseTo(90)
  })
})
