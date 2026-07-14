import { describe, it, expect } from 'vitest'
import { scheduleForDay } from './schedule-day'
import { makePageAssignment, makeUserSettings, makeRepetitionAssignment } from '../domain/test-factories'

describe('scheduleForDay（統合）', () => {
  it('単一の宿題のみなら、その日のcapacityを全て受け取る', () => {
    const settings = makeUserSettings() // 月曜=60分
    const assignment = makePageAssignment({
      id: 'math',
      totalPages: 40,
      currentPage: 0,
      estimatedMinutesPerPage: 4,
      deadline: '2026-08-31',
    })
    const result = scheduleForDay('2026-07-20', [assignment], settings)

    expect(result.capacityMinutes).toBe(60)
    expect(result.allocations).toHaveLength(1)
    expect(result.allocations[0].allocatedMinutes).toBeCloseTo(60)
    expect(result.allocations[0].excludedByMinimum).toBe(false)
  })

  it('複数宿題は優先度に応じて按分される', () => {
    const settings = makeUserSettings({
      weekdayStudyMinutes: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    })
    // 締切が近い方が優先度が高くなり、より多く配分されるはず
    const urgent = makePageAssignment({
      id: 'urgent',
      totalPages: 10,
      currentPage: 0,
      estimatedMinutesPerPage: 10, // 残り100分
      deadline: '2026-07-21', // 明日締切
    })
    const relaxed = makePageAssignment({
      id: 'relaxed',
      totalPages: 10,
      currentPage: 0,
      estimatedMinutesPerPage: 10, // 残り100分（同じ残り時間）
      deadline: '2026-08-31', // 締切まで余裕あり
    })
    const result = scheduleForDay('2026-07-20', [urgent, relaxed], settings)

    const urgentAlloc = result.allocations.find((a) => a.assignmentId === 'urgent')!
    const relaxedAlloc = result.allocations.find((a) => a.assignmentId === 'relaxed')!

    expect(urgentAlloc.allocatedMinutes).toBeGreaterThan(relaxedAlloc.allocatedMinutes)
    // 合計はcapacityと一致
    const total = result.allocations.reduce((s, a) => s + a.allocatedMinutes, 0)
    expect(total).toBeCloseTo(100)
  })

  it('完了済みの宿題は対象から除外される', () => {
    const settings = makeUserSettings()
    const done = makePageAssignment({ id: 'done', isCompleted: true })
    const active = makePageAssignment({ id: 'active', totalPages: 10, currentPage: 0 })
    const result = scheduleForDay('2026-07-20', [done, active], settings)

    expect(result.allocations.some((a) => a.assignmentId === 'done')).toBe(false)
    const activeAlloc = result.allocations.find((a) => a.assignmentId === 'active')!
    expect(activeAlloc.allocatedMinutes).toBeCloseTo(result.capacityMinutes)
  })

  it('capacityが0の日は全宿題が配分0になる（旅行等）', () => {
    const settings = makeUserSettings({
      specialSchedules: [
        {
          id: 's1',
          title: '旅行',
          startDate: '2026-07-20',
          endDate: '2026-07-20',
          durationMinutesPerDay: 999,
        },
      ],
    })
    const a = makePageAssignment({ id: 'a', totalPages: 10, currentPage: 0 })
    const result = scheduleForDay('2026-07-20', [a], settings)

    expect(result.capacityMinutes).toBe(0)
    expect(result.dayWeight).toBe(0)
    expect(result.allocations[0].allocatedMinutes).toBe(0)
  })

  it('異なるタイプの宿題が混在しても正しく按分される（ページ型+反復型）', () => {
    const settings = makeUserSettings({
      weekdayStudyMinutes: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    })
    const pageType = makePageAssignment({
      id: 'page',
      totalPages: 10,
      currentPage: 0,
      estimatedMinutesPerPage: 5,
      deadline: '2026-07-25',
    })
    const repType = makeRepetitionAssignment({
      id: 'rep',
      totalItems: 100,
      completedItems: 0,
      estimatedMinutesPerItem: 0.5,
      deadline: '2026-07-25',
    })
    const result = scheduleForDay('2026-07-20', [pageType, repType], settings)
    const total = result.allocations.reduce((s, a) => s + a.allocatedMinutes, 0)
    expect(total).toBeCloseTo(100)
  })
})
