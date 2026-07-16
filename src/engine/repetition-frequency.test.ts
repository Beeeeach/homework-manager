import { describe, it, expect } from 'vitest'
import {
  countRemainingOccurrences,
  isOccurrenceDay,
  calculateItemsPerOccurrence,
} from './repetition-frequency'
import { makeRepetitionAssignment } from '../domain/test-factories'

describe('isOccurrenceDay', () => {
  it('frequencyDays=1（毎日）なら常に実施日', () => {
    const a = makeRepetitionAssignment({ createdAt: '2026-07-20', frequencyDays: 1 })
    expect(isOccurrenceDay(a, '2026-07-20')).toBe(true)
    expect(isOccurrenceDay(a, '2026-07-25')).toBe(true)
  })

  it('frequencyDays=2なら登録日から2日おきが実施日', () => {
    const a = makeRepetitionAssignment({ createdAt: '2026-07-20', frequencyDays: 2 })
    expect(isOccurrenceDay(a, '2026-07-20')).toBe(true) // 0日後
    expect(isOccurrenceDay(a, '2026-07-21')).toBe(false) // 1日後
    expect(isOccurrenceDay(a, '2026-07-22')).toBe(true) // 2日後
    expect(isOccurrenceDay(a, '2026-07-23')).toBe(false) // 3日後
  })

  it('登録日より前の日付は実施日ではない', () => {
    const a = makeRepetitionAssignment({ createdAt: '2026-07-20', frequencyDays: 2 })
    expect(isOccurrenceDay(a, '2026-07-19')).toBe(false)
  })
})

describe('countRemainingOccurrences', () => {
  it('毎日（frequencyDays=1）なら残り日数と同じ回数になる', () => {
    const a = makeRepetitionAssignment({ deadline: '2026-07-25', frequencyDays: 1 })
    // 7/20〜7/25は当日含めて6日
    expect(countRemainingOccurrences(a, '2026-07-20')).toBe(6)
  })

  it('週1回（frequencyDays=7）なら回数が切り上げで少なくなる', () => {
    const a = makeRepetitionAssignment({ deadline: '2026-08-09', frequencyDays: 7 })
    // 7/20〜8/9は当日含めて21日 → 21/7 = 3回
    expect(countRemainingOccurrences(a, '2026-07-20')).toBe(3)
  })

  it('締切を過ぎていても最低1回を返す', () => {
    const a = makeRepetitionAssignment({ deadline: '2026-07-19', frequencyDays: 1 })
    expect(countRemainingOccurrences(a, '2026-07-20')).toBe(1)
  })
})

describe('calculateItemsPerOccurrence（動的追い上げ）', () => {
  it('20日間毎日3周1000単語なら、1回あたり150単語になる', () => {
    const a = makeRepetitionAssignment({
      createdAt: '2026-07-20',
      deadline: '2026-08-08', // 7/20〜8/8は当日含めて20日
      totalItems: 1000,
      cycleCount: 3,
      frequencyDays: 1,
      completedItems: 0,
    })
    // 総必要量 = 1000×3 = 3000、残り実施回数20回 → 150/回
    expect(calculateItemsPerOccurrence(a, '2026-07-20')).toBeCloseTo(150)
  })

  it('進捗が遅れている場合、残り回数で必要量を再計算し1回あたりが増える（追い上げ）', () => {
    const a = makeRepetitionAssignment({
      createdAt: '2026-07-20',
      deadline: '2026-08-08', // 20日間
      totalItems: 1000,
      cycleCount: 3,
      frequencyDays: 1,
      completedItems: 0, // 10日経過しても全く進んでいない状態を想定
    })
    // 10日目時点（残り10回）で計算すると、1回あたりの量が増えるはず
    const amountAtStart = calculateItemsPerOccurrence(a, '2026-07-20')
    const amountWhenBehind = calculateItemsPerOccurrence(a, '2026-07-30')
    expect(amountWhenBehind).toBeGreaterThan(amountAtStart)
  })

  it('残り必要量が0（完了扱い）なら0を返す', () => {
    const a = makeRepetitionAssignment({
      totalItems: 100,
      cycleCount: 1,
      completedItems: 100,
    })
    expect(calculateItemsPerOccurrence(a, '2026-07-20')).toBe(0)
  })
})
