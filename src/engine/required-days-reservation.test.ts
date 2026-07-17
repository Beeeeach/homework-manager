import { describe, it, expect } from 'vitest'
import {
  findBestConsecutiveWindow,
  calculateReservableMinutes,
} from './required-days-reservation'
import { makeProjectAssignment, makePageAssignment, makeUserSettings } from '../domain/test-factories'

describe('findBestConsecutiveWindow', () => {
  it('他の宿題がなければ、期間の最初の連続区間を選ぶ（余裕度に差がないため先頭優先）', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-08-31' },
      weekdayStudyMinutes: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    })
    const target = makeProjectAssignment({
      createdAt: '2026-07-20',
      deadline: '2026-07-30',
      requiredDays: 3,
    })

    const window = findBestConsecutiveWindow(target, [], settings, 3)
    expect(window).not.toBeNull()
    expect(window).toHaveLength(3)
  })

  it('他の宿題の締切が迫っている期間を避け、余裕のある連続区間を選ぶ', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-08-10' },
      weekdayStudyMinutes: { 0: 60, 1: 60, 2: 60, 3: 60, 4: 60, 5: 60, 6: 60 },
    })
    const target = makeProjectAssignment({
      id: 'project',
      createdAt: '2026-07-20',
      deadline: '2026-08-10',
      requiredDays: 3,
    })
    // 他の宿題は7/20締切で残り時間が大きい → 7/20周辺は余裕度が低いはず
    const urgent = makePageAssignment({
      id: 'urgent',
      totalPages: 100,
      currentPage: 0,
      estimatedMinutesPerPage: 10, // 残り1000分
      deadline: '2026-07-21', // 明日締切、急ぎ
    })

    const window = findBestConsecutiveWindow(target, [urgent], settings, 3)
    expect(window).not.toBeNull()
    // 選ばれた区間には、緊急宿題の締切日（7/20か7/21）が含まれにくいはず
    // 少なくとも先頭日（7/20）は選ばれないことを確認する
    expect(window![0]).not.toBe('2026-07-20')
  })

  it('期間がrequiredDaysより短ければnullを返す', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-08-31' },
    })
    const target = makeProjectAssignment({
      createdAt: '2026-07-20',
      deadline: '2026-07-21', // 期間2日
      requiredDays: 5,
    })
    const window = findBestConsecutiveWindow(target, [], settings, 5)
    expect(window).toBeNull()
  })
})

describe('calculateReservableMinutes', () => {
  it('他の宿題がなければ、capacity全体を専有できる', () => {
    const settings = makeUserSettings({
      weekdayStudyMinutes: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    })
    const target = makeProjectAssignment({ deadline: '2026-08-31' })
    const reservable = calculateReservableMinutes('2026-07-20', target, [], settings)
    expect(reservable).toBeCloseTo(100)
  })

  it('他の宿題の必要ペース分は差し引かれる', () => {
    const settings = makeUserSettings({
      weekdayStudyMinutes: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    })
    const target = makeProjectAssignment({ deadline: '2026-08-31' })
    const other = makePageAssignment({
      totalPages: 10,
      currentPage: 0,
      estimatedMinutesPerPage: 3, // 残り30分
      deadline: '2026-07-25', // 実効残り日数6日 → ペース5分/日
    })
    const reservable = calculateReservableMinutes('2026-07-20', target, [other], settings)
    // 100 - 5 = 95分程度
    expect(reservable).toBeCloseTo(95, 0)
  })

  it('他の宿題の必要ペースがcapacityを超える場合は0になる（マイナスにはならない）', () => {
    const settings = makeUserSettings({
      weekdayStudyMinutes: { 0: 60, 1: 60, 2: 60, 3: 60, 4: 60, 5: 60, 6: 60 },
    })
    const target = makeProjectAssignment({ deadline: '2026-08-31' })
    const other = makePageAssignment({
      totalPages: 100,
      currentPage: 0,
      estimatedMinutesPerPage: 10, // 残り1000分
      deadline: '2026-07-20', // 実効残り日数1日 → ペース1000分/日
    })
    const reservable = calculateReservableMinutes('2026-07-20', target, [other], settings)
    expect(reservable).toBe(0)
  })
})
