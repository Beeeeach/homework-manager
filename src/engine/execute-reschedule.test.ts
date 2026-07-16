import { describe, it, expect } from 'vitest'
import { executeReschedule } from './execute-reschedule'
import { makePageAssignment, makeUserSettings } from '../domain/test-factories'

describe('executeReschedule', () => {
  it('level1と判定された場合、NearRange日数分のスケジュールが生成される', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-08-31' },
      weekdayStudyMinutes: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    })
    const a = makePageAssignment({
      id: 'math',
      totalPages: 5,
      currentPage: 0,
      estimatedMinutesPerPage: 10,
    })
    const result = executeReschedule([a], '2026-07-20', settings)

    expect(result.level).toBe('level1_near')
    expect(result.trigger).toBe('reschedule_l1')
    expect(result.daySchedules).toHaveLength(3)
    // 各日のスケジュールにallocationsが含まれている
    expect(result.daySchedules[0].allocations.length).toBeGreaterThan(0)
  })

  it('生成された各日のスケジュール合計時間が、宿題の残り時間を超えない', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-08-31' },
      weekdayStudyMinutes: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    })
    // 残り時間50分（NearRangeのcapacity300分よりずっと少ない）
    const a = makePageAssignment({
      id: 'math',
      totalPages: 5,
      currentPage: 0,
      estimatedMinutesPerPage: 10,
    })
    const result = executeReschedule([a], '2026-07-20', settings)

    const totalAllocated = result.daySchedules.reduce(
      (sum, day) =>
        sum + day.allocations.reduce((s, a) => s + a.allocatedMinutes, 0),
      0,
    )
    // 集中配分方式では、宿題の残り時間（50分）を超えて配分されることはない。
    // 初日にまとめて50分配分され、以降の日は残り時間0のため配分されない。
    expect(totalAllocated).toBeCloseTo(50)

    const totalCapacity = result.daySchedules.reduce((s, d) => s + d.capacityMinutes, 0)
    // 宿題の残り時間はcapacity合計を超えない（余ったcapacityは使われず捨てられる）
    expect(totalAllocated).toBeLessThanOrEqual(totalCapacity)
  })

  it('level3の場合、休暇全期間のスケジュールが生成される', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-07-24' }, // 5日間
      weekdayStudyMinutes: { 0: 20, 1: 20, 2: 20, 3: 20, 4: 20, 5: 20, 6: 20 },
    })
    const a = makePageAssignment({
      totalPages: 100,
      currentPage: 0,
      estimatedMinutesPerPage: 10, // 残り1000分、5日間の合計capacity=100分では全く足りない
    })
    const result = executeReschedule([a], '2026-07-20', settings)

    expect(result.level).toBe('level3_full')
    expect(result.trigger).toBe('reschedule_l3')
    expect(result.daySchedules).toHaveLength(5)
  })
})
