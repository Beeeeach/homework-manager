import { describe, it, expect } from 'vitest'
import { buildUpcomingSchedule, addDays, getMaxHorizonDays } from './upcoming-schedule'
import { makePageAssignment, makeUserSettings } from '../domain/test-factories'

describe('addDays', () => {
  it('日数をまたいで正しく加算する', () => {
    expect(addDays('2026-07-20', 1)).toBe('2026-07-21')
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01')
  })
})

describe('getMaxHorizonDays', () => {
  it('宿題がなければ0を返す', () => {
    expect(getMaxHorizonDays('2026-07-20', [])).toBe(0)
  })

  it('最も遠い締切までの日数を返す', () => {
    const a = makePageAssignment({ deadline: '2026-07-25' })
    expect(getMaxHorizonDays('2026-07-20', [a])).toBe(5)
  })
})

describe('buildUpcomingSchedule（複数日予測・日をまたぐ進捗の引き継ぎ）', () => {
  it('1日で終わる分量の宿題は、終わった日以降に重複して登場しない（再発防止）', () => {
    // 40ページ×4分=160分の宿題。1日の勉強可能時間を100分とすると、
    // 初日に100分、2日目に残り60分で完了し、3日目以降は登場しないはず。
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-08-31' },
      weekdayStudyMinutes: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    })
    const assignment = makePageAssignment({
      id: 'math',
      totalPages: 40,
      currentPage: 0,
      estimatedMinutesPerPage: 4, // 総残り時間160分
      deadline: '2026-08-31',
    })

    const days = buildUpcomingSchedule('2026-07-20', [assignment], settings)

    // 全登場日にわたる配分合計は、宿題の総残り時間（160分）を超えてはならない
    const totalAllocated = days.reduce(
      (sum, day) =>
        sum +
        day.tasks
          .filter((t) => t.assignmentId === 'math')
          .reduce((s, t) => s + t.plannedMinutes, 0),
      0,
    )
    expect(totalAllocated).toBeCloseTo(160)

    // 宿題が登場する日は高々2日（100分+60分で終わるため）であり、
    // 締切（8/31）までの全日程（40日以上）に渡って登場することはない
    const daysWithThisAssignment = days.filter((day) =>
      day.tasks.some((t) => t.assignmentId === 'math'),
    )
    expect(daysWithThisAssignment.length).toBeLessThanOrEqual(2)
  })

  it('複数の宿題がある場合も、それぞれの総残り時間を超えて配分されない', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-08-10' },
      weekdayStudyMinutes: { 0: 60, 1: 60, 2: 60, 3: 60, 4: 60, 5: 60, 6: 60 },
    })
    const a = makePageAssignment({
      id: 'a',
      totalPages: 10,
      currentPage: 0,
      estimatedMinutesPerPage: 4, // 残り40分
      deadline: '2026-08-10',
    })
    const b = makePageAssignment({
      id: 'b',
      totalPages: 20,
      currentPage: 0,
      estimatedMinutesPerPage: 4, // 残り80分
      deadline: '2026-08-10',
    })

    const days = buildUpcomingSchedule('2026-07-20', [a, b], settings)

    const totalFor = (id: string) =>
      days.reduce(
        (sum, day) =>
          sum +
          day.tasks
            .filter((t) => t.assignmentId === id)
            .reduce((s, t) => s + t.plannedMinutes, 0),
        0,
      )

    expect(totalFor('a')).toBeLessThanOrEqual(40 + 1e-9)
    expect(totalFor('b')).toBeLessThanOrEqual(80 + 1e-9)
  })

  it('宿題が1件もなければ空配列を返す', () => {
    const settings = makeUserSettings()
    expect(buildUpcomingSchedule('2026-07-20', [], settings)).toEqual([])
  })
})
