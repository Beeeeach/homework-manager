import { describe, it, expect } from 'vitest'
import { scheduleForDay } from './schedule-day'
import { makePageAssignment, makeUserSettings, makeRepetitionAssignment } from '../domain/test-factories'

describe('scheduleForDay（統合）', () => {
  it('単一の宿題のみで、残り時間がcapacity以上なら、その日のcapacityを全て受け取る', () => {
    const settings = makeUserSettings() // 月曜=60分
    const assignment = makePageAssignment({
      id: 'math',
      totalPages: 40,
      currentPage: 0,
      estimatedMinutesPerPage: 4, // 残り160分。capacity60分より十分多い
      deadline: '2026-08-31',
    })
    const result = scheduleForDay('2026-07-20', [assignment], settings)

    expect(result.capacityMinutes).toBe(60)
    expect(result.allocations).toHaveLength(1)
    expect(result.allocations[0].allocatedMinutes).toBeCloseTo(60)
    expect(result.allocations[0].excludedByMinimum).toBe(false)
  })

  it('複数宿題は優先度の高い順に集中配分され、締切が近い方がより多く配分される', () => {
    const settings = makeUserSettings({
      weekdayStudyMinutes: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    })
    // 締切が近い方が優先度が高くなり、先に（より多く）配分されるはず
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

    // urgentが先に配分され、残り時間100分をまるごと得る（capacity100分ちょうど使い切る）
    expect(urgentAlloc.allocatedMinutes).toBeCloseTo(100)
    expect(urgentAlloc.excludedByMinimum).toBe(false)
    // capacityが尽きたため、relaxedはその日は割り当てなし
    expect(relaxedAlloc.allocatedMinutes).toBe(0)
    expect(relaxedAlloc.excludedByMinimum).toBe(true)
  })

  it('完了済みの宿題は対象から除外される', () => {
    const settings = makeUserSettings()
    const done = makePageAssignment({ id: 'done', isCompleted: true })
    // active: 残り時間40分（10ページ×4分）、capacityは60分
    const active = makePageAssignment({ id: 'active', totalPages: 10, currentPage: 0 })
    const result = scheduleForDay('2026-07-20', [done, active], settings)

    expect(result.allocations.some((a) => a.assignmentId === 'done')).toBe(false)
    const activeAlloc = result.allocations.find((a) => a.assignmentId === 'active')!
    // 集中配分では「残り時間ぶんだけ」配分されるため、capacity(60分)ではなく
    // 残り時間である40分がそのまま割り当てられる（余りは捨てられる）
    expect(activeAlloc.allocatedMinutes).toBeCloseTo(40)
    expect(activeAlloc.excludedByMinimum).toBe(false)
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

  it('異なるタイプの宿題が混在する場合、優先度の高い方から順に配分され、合計はcapacityを超えない', () => {
    const settings = makeUserSettings({
      weekdayStudyMinutes: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    })
    const pageType = makePageAssignment({
      id: 'page',
      totalPages: 10,
      currentPage: 0,
      estimatedMinutesPerPage: 5, // 残り50分
      deadline: '2026-07-25',
    })
    const repType = makeRepetitionAssignment({
      id: 'rep',
      totalItems: 100,
      completedItems: 0,
      estimatedMinutesPerItem: 0.5, // 残り50分
      deadline: '2026-07-25',
    })
    const result = scheduleForDay('2026-07-20', [pageType, repType], settings)
    const total = result.allocations.reduce((s, a) => s + a.allocatedMinutes, 0)
    // 両方とも残り時間50分ずつなので、2件合計で100分（capacityちょうど）配分される
    expect(total).toBeCloseTo(100)
  })
})
