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

  it('他の宿題の締切間近の期間ほど余裕度が低く、締切から離れた期間ほど余裕度が高くなる', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-08-10' },
      weekdayStudyMinutes: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    })
    const target = makeProjectAssignment({
      id: 'project',
      createdAt: '2026-07-20',
      deadline: '2026-08-10',
      requiredDays: 3,
    })
    // 他の宿題は7/25締切。7/20時点は実効残り日数が短く必要ペースが高いが、
    // 締切を過ぎた7/26以降は対象から自然に外れ、余裕度が回復するはず
    const other = makePageAssignment({
      id: 'other',
      totalPages: 100,
      currentPage: 0,
      estimatedMinutesPerPage: 10, // 残り1000分
      deadline: '2026-07-25',
    })

    const window = findBestConsecutiveWindow(target, [other], settings, 3)
    expect(window).not.toBeNull()
    // 締切7/25を含まない、より後半の連続区間が選ばれるはず
    expect(window!.every((d) => d > '2026-07-25')).toBe(true)
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
    const reservable = calculateReservableMinutes('2026-07-20', [], settings)
    expect(reservable).toBeCloseTo(100)
  })

  it('他の宿題の必要ペース分は差し引かれる（実効残り日数は締切バッファ適用後の値）', () => {
    const settings = makeUserSettings({
      weekdayStudyMinutes: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    })
    const target = makeProjectAssignment({ deadline: '2026-08-31' })
    const other = makePageAssignment({
      totalPages: 10,
      currentPage: 0,
      estimatedMinutesPerPage: 3, // 残り30分
      deadline: '2026-07-25', // 素の残り日数6日、デフォルトバッファ(固定2日)適用後の実効残り日数は4日
    })
    const reservable = calculateReservableMinutes('2026-07-20', [other], settings)
    // ペース = 30分 / 4日 = 7.5分/日、reservable = 100 - 7.5 = 92.5分
    expect(reservable).toBeCloseTo(92.5)
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
    const reservable = calculateReservableMinutes('2026-07-20', [other], settings)
    expect(reservable).toBe(0)
  })
})
