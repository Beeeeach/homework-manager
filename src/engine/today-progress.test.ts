import { describe, it, expect } from 'vitest'
import { calculateTodayRecordedAmount, calculateTodayRecordedMinutes } from './today-progress'
import { makeStudySession } from '../domain/test-factories'

describe('calculateTodayRecordedAmount', () => {
  it('指定日・指定宿題のセッションのactualAmount合計を返す', () => {
    const sessions = [
      makeStudySession({
        assignmentId: 'math',
        startedAt: '2026-07-20T10:00:00',
        actualAmount: 5,
      }),
      makeStudySession({
        assignmentId: 'math',
        startedAt: '2026-07-20T14:00:00',
        actualAmount: 3,
      }),
    ]
    expect(calculateTodayRecordedAmount(sessions, 'math', '2026-07-20')).toBe(8)
  })

  it('異なる日付のセッションは合計に含めない', () => {
    const sessions = [
      makeStudySession({
        assignmentId: 'math',
        startedAt: '2026-07-19T10:00:00',
        actualAmount: 5,
      }),
      makeStudySession({
        assignmentId: 'math',
        startedAt: '2026-07-20T10:00:00',
        actualAmount: 3,
      }),
    ]
    expect(calculateTodayRecordedAmount(sessions, 'math', '2026-07-20')).toBe(3)
  })

  it('異なる宿題のセッションは合計に含めない', () => {
    const sessions = [
      makeStudySession({
        assignmentId: 'english',
        startedAt: '2026-07-20T10:00:00',
        actualAmount: 5,
      }),
      makeStudySession({
        assignmentId: 'math',
        startedAt: '2026-07-20T10:00:00',
        actualAmount: 3,
      }),
    ]
    expect(calculateTodayRecordedAmount(sessions, 'math', '2026-07-20')).toBe(3)
  })

  it('該当セッションがなければ0を返す', () => {
    expect(calculateTodayRecordedAmount([], 'math', '2026-07-20')).toBe(0)
  })
})

describe('calculateTodayRecordedMinutes', () => {
  it('指定日・指定宿題のセッションのactualMinutes合計を返す', () => {
    const sessions = [
      makeStudySession({
        assignmentId: 'math',
        startedAt: '2026-07-20T10:00:00',
        actualMinutes: 20,
      }),
      makeStudySession({
        assignmentId: 'math',
        startedAt: '2026-07-20T14:00:00',
        actualMinutes: 15,
      }),
    ]
    expect(calculateTodayRecordedMinutes(sessions, 'math', '2026-07-20')).toBe(35)
  })
})
