import { describe, it, expect } from 'vitest'
import { getRemainingMinutes, getRemainingItems } from './remaining-time'
import { makeRepetitionAssignment } from '../domain/test-factories'

describe('getRemainingItems（周回対応）', () => {
  it('cycleCount未指定（1周扱い）なら、従来通りtotalItems-completedItems', () => {
    const a = makeRepetitionAssignment({ totalItems: 100, completedItems: 30 })
    expect(getRemainingItems(a)).toBe(70)
  })

  it('cycleCount=3なら、総必要量はtotalItems×3から引かれる', () => {
    const a = makeRepetitionAssignment({ totalItems: 100, cycleCount: 3, completedItems: 50 })
    // 総必要量300 - 50 = 250
    expect(getRemainingItems(a)).toBe(250)
  })

  it('累積実施量が総必要量を超えることはない（0未満にならない）', () => {
    const a = makeRepetitionAssignment({ totalItems: 100, cycleCount: 1, completedItems: 150 })
    expect(getRemainingItems(a)).toBe(0)
  })
})

describe('getRemainingMinutes（周回対応・repetition型）', () => {
  it('周回込みの残り量×1個あたり時間になる', () => {
    const a = makeRepetitionAssignment({
      totalItems: 100,
      cycleCount: 2,
      completedItems: 20,
      estimatedMinutesPerItem: 0.5,
    })
    // 総必要量200 - 20 = 180、180×0.5=90分
    expect(getRemainingMinutes(a)).toBeCloseTo(90)
  })
})
