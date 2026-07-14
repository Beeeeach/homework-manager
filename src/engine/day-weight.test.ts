import { describe, it, expect } from 'vitest'
import {
  getBaseDayWeight,
  getBaseStudyMinutes,
  getLostMinutes,
  getCapacityMinutes,
  getDayWeight,
} from './day-weight'
import { makeUserSettings } from '../domain/test-factories'

describe('getBaseDayWeight', () => {
  it('休暇開始日は1.2', () => {
    expect(getBaseDayWeight('2026-07-20', '2026-07-20', '2026-08-31')).toBeCloseTo(1.2)
  })

  it('休暇終了日は0.8', () => {
    expect(getBaseDayWeight('2026-08-31', '2026-07-20', '2026-08-31')).toBeCloseTo(0.8)
  })

  it('中間地点はおよそ中間値になる', () => {
    // 7/20〜8/31は42日間、中間は7/20+21日=8/10
    const mid = getBaseDayWeight('2026-08-10', '2026-07-20', '2026-08-31')
    expect(mid).toBeCloseTo(1.0, 1)
  })
})

describe('getBaseStudyMinutes / getLostMinutes / getCapacityMinutes', () => {
  it('曜日設定どおりの基準時間を返す', () => {
    const settings = makeUserSettings()
    // 2026-07-20は月曜(weekday=1) => 60分
    expect(getBaseStudyMinutes('2026-07-20', settings)).toBe(60)
  })

  it('固定予定がある曜日は時間が減算される', () => {
    const settings = makeUserSettings({
      recurringSchedules: [
        { id: 'r1', title: '部活', weekday: 1, durationMinutes: 30 },
      ],
    })
    expect(getLostMinutes('2026-07-20', settings)).toBe(30)
    expect(getCapacityMinutes('2026-07-20', settings)).toBe(30) // 60 - 30
  })

  it('特別予定期間中は時間が減算される（旅行で終日不可）', () => {
    const settings = makeUserSettings({
      specialSchedules: [
        {
          id: 's1',
          title: '帰省',
          startDate: '2026-07-20',
          endDate: '2026-07-22',
          durationMinutesPerDay: 999, // 終日不可相当
        },
      ],
    })
    expect(getCapacityMinutes('2026-07-20', settings)).toBe(0)
    expect(getCapacityMinutes('2026-07-21', settings)).toBe(0)
    // 期間外は影響なし
    expect(getCapacityMinutes('2026-07-23', settings)).toBe(60)
  })

  it('減算しても0未満にはならない', () => {
    const settings = makeUserSettings({
      recurringSchedules: [
        { id: 'r1', title: '塾', weekday: 1, durationMinutes: 500 },
      ],
    })
    expect(getCapacityMinutes('2026-07-20', settings)).toBe(0)
  })
})

describe('getDayWeight', () => {
  it('capacityが0の日は重み0になる（仕様書10.2②）', () => {
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
    expect(getDayWeight('2026-07-20', settings)).toBe(0)
  })

  it('通常日は基礎重みがそのまま反映される（予定なし）', () => {
    const settings = makeUserSettings()
    const weight = getDayWeight('2026-07-20', settings)
    const baseWeight = getBaseDayWeight('2026-07-20', '2026-07-20', '2026-08-31')
    expect(weight).toBeCloseTo(baseWeight)
  })

  it('固定予定で時間が半分になれば重みも比例して下がる', () => {
    const settings = makeUserSettings({
      recurringSchedules: [
        { id: 'r1', title: '部活', weekday: 1, durationMinutes: 30 }, // 60分中30分喪失
      ],
    })
    const weight = getDayWeight('2026-07-20', settings)
    const baseWeight = getBaseDayWeight('2026-07-20', '2026-07-20', '2026-08-31')
    expect(weight).toBeCloseTo(baseWeight * 0.5)
  })
})
