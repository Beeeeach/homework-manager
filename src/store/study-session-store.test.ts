import { describe, it, expect } from 'vitest'
import { calculateElapsedMinutes } from './study-session-store'

describe('calculateElapsedMinutes', () => {
  it('20分の経過を正しく算出する', () => {
    const min = calculateElapsedMinutes(
      '2026-07-21T16:00:00.000Z',
      '2026-07-21T16:20:00.000Z',
    )
    expect(min).toBeCloseTo(20)
  })

  it('終了時刻が開始時刻より前でも負にならない', () => {
    const min = calculateElapsedMinutes(
      '2026-07-21T16:20:00.000Z',
      '2026-07-21T16:00:00.000Z',
    )
    expect(min).toBe(0)
  })
})
