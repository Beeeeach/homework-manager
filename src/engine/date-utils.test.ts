import { describe, it, expect } from 'vitest'
import { diffDays, addDays, getWeekday, dateRange, isWithinRange } from './date-utils'

describe('date-utils', () => {
  it('diffDaysが正しく差分日数を返す', () => {
    expect(diffDays('2026-07-20', '2026-07-20')).toBe(0)
    expect(diffDays('2026-07-20', '2026-07-25')).toBe(5)
    expect(diffDays('2026-07-20', '2026-08-31')).toBe(42)
  })

  it('addDaysが正しく日付を加算する', () => {
    expect(addDays('2026-07-20', 1)).toBe('2026-07-21')
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01')
    expect(addDays('2026-07-20', 0)).toBe('2026-07-20')
  })

  it('getWeekdayが正しい曜日を返す', () => {
    // 2026-07-20 は月曜日
    expect(getWeekday('2026-07-20')).toBe(1)
  })

  it('dateRangeが両端を含む日付配列を返す', () => {
    const range = dateRange('2026-07-20', '2026-07-23')
    expect(range).toEqual(['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23'])
  })

  it('dateRangeはstart > endの場合空配列を返す', () => {
    expect(dateRange('2026-07-23', '2026-07-20')).toEqual([])
  })

  it('isWithinRangeが範囲判定を正しく行う', () => {
    expect(isWithinRange('2026-07-21', '2026-07-20', '2026-07-25')).toBe(true)
    expect(isWithinRange('2026-07-20', '2026-07-20', '2026-07-25')).toBe(true)
    expect(isWithinRange('2026-07-19', '2026-07-20', '2026-07-25')).toBe(false)
  })
})
