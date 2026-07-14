import { describe, it, expect } from 'vitest'
import { calculateActualPerUnitMinutes } from './session-to-unit-time'
import { makeStudySession } from '../domain/test-factories'

describe('calculateActualPerUnitMinutes', () => {
  it('actualMinutes / actualAmountを返す', () => {
    const session = makeStudySession({ actualAmount: 5, actualMinutes: 20 })
    expect(calculateActualPerUnitMinutes(session)).toBe(4)
  })

  it('actualAmountが0の場合はnullを返す', () => {
    const session = makeStudySession({ actualAmount: 0, actualMinutes: 20 })
    expect(calculateActualPerUnitMinutes(session)).toBeNull()
  })

  it('actualMinutesが0の場合はnullを返す', () => {
    const session = makeStudySession({ actualAmount: 5, actualMinutes: 0 })
    expect(calculateActualPerUnitMinutes(session)).toBeNull()
  })
})
