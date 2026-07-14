import { describe, it, expect } from 'vitest'
import { checkOverload, getTotalAvailableMinutes, getTotalRemainingMinutes } from './overload-check'
import { makePageAssignment, makeUserSettings } from '../domain/test-factories'

describe('getTotalAvailableMinutes', () => {
  it('休暇期間全体のcapacity合計を返す（予定なしの単純ケース）', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-07-21' }, // 月・火の2日間
      weekdayStudyMinutes: { 0: 0, 1: 60, 2: 120, 3: 0, 4: 0, 5: 0, 6: 0 },
    })
    // 7/20(月)=60分 + 7/21(火)=120分 = 180分
    expect(getTotalAvailableMinutes('2026-07-20', settings)).toBe(180)
  })

  it('currentDateが休暇開始後なら、その日以降のみ合算する', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-07-21' },
      weekdayStudyMinutes: { 0: 0, 1: 60, 2: 120, 3: 0, 4: 0, 5: 0, 6: 0 },
    })
    // 7/21のみ = 120分
    expect(getTotalAvailableMinutes('2026-07-21', settings)).toBe(120)
  })

  it('currentDateが休暇終了後なら0を返す', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-07-21' },
    })
    expect(getTotalAvailableMinutes('2026-07-22', settings)).toBe(0)
  })
})

describe('getTotalRemainingMinutes', () => {
  it('全宿題の残り時間を合算する', () => {
    const a = makePageAssignment({ totalPages: 40, currentPage: 10, estimatedMinutesPerPage: 4 })
    const b = makePageAssignment({ totalPages: 20, currentPage: 0, estimatedMinutesPerPage: 5 })
    // a: 30ページ*4分=120分、b: 20ページ*5分=100分 => 合計220分
    expect(getTotalRemainingMinutes([a, b])).toBe(220)
  })

  it('完了済みの宿題は合算対象外', () => {
    const done = makePageAssignment({ isCompleted: true, totalPages: 100, currentPage: 0 })
    const active = makePageAssignment({ totalPages: 10, currentPage: 0, estimatedMinutesPerPage: 4 })
    expect(getTotalRemainingMinutes([done, active])).toBe(40)
  })
})

describe('checkOverload', () => {
  it('残り時間が閾値以下なら警告なし', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-07-21' },
      weekdayStudyMinutes: { 0: 0, 1: 100, 2: 100, 3: 0, 4: 0, 5: 0, 6: 0 },
    })
    // 利用可能=200分、閾値=200*0.9=180分
    const a = makePageAssignment({ totalPages: 10, currentPage: 0, estimatedMinutesPerPage: 10 }) // 残り100分
    const result = checkOverload([a], '2026-07-20', settings)

    expect(result.isOverloaded).toBe(false)
    expect(result.totalRemainingMinutes).toBe(100)
    expect(result.totalAvailableMinutes).toBe(200)
    expect(result.threshold).toBeCloseTo(180)
  })

  it('残り時間が閾値を超えると警告になる', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-07-21' },
      weekdayStudyMinutes: { 0: 0, 1: 60, 2: 60, 3: 0, 4: 0, 5: 0, 6: 0 },
    })
    // 利用可能=120分、閾値=120*0.9=108分
    const a = makePageAssignment({ totalPages: 20, currentPage: 0, estimatedMinutesPerPage: 10 }) // 残り200分
    const result = checkOverload([a], '2026-07-20', settings)

    expect(result.isOverloaded).toBe(true)
    expect(result.totalRemainingMinutes).toBe(200)
  })

  it('複数宿題の合計で判定される', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-07-20' },
      weekdayStudyMinutes: { 0: 0, 1: 100, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    })
    // 利用可能=100分、閾値=90分
    const a = makePageAssignment({ totalPages: 10, currentPage: 0, estimatedMinutesPerPage: 5 }) // 50分
    const b = makePageAssignment({ totalPages: 10, currentPage: 0, estimatedMinutesPerPage: 5 }) // 50分
    // 合計100分 > 閾値90分 => 警告
    const result = checkOverload([a, b], '2026-07-20', settings)
    expect(result.isOverloaded).toBe(true)
  })

  it('ちょうど閾値と同じ場合は警告にならない（超えた場合のみ警告）', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-07-20' },
      weekdayStudyMinutes: { 0: 0, 1: 100, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    })
    // 利用可能=100分、閾値=90分ちょうどになるよう残り時間を90分に設定
    const a = makePageAssignment({ totalPages: 9, currentPage: 0, estimatedMinutesPerPage: 10 }) // 90分
    const result = checkOverload([a], '2026-07-20', settings)
    expect(result.isOverloaded).toBe(false)
  })
})
