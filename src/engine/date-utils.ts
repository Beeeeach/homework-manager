/**
 * 日付操作の共通ユーティリティ。
 * DateStringは "YYYY-MM-DD" 形式で統一し、時刻・タイムゾーンの影響を避けるため
 * 常にUTC正午を基準にDateオブジェクトへ変換してから計算する。
 */

import type { DateString, Weekday } from '../domain'

function toUtcDate(date: DateString): Date {
  // "YYYY-MM-DD" をUTC正午のDateとして解釈する（DST等の影響を避けるため正午を使う）
  return new Date(`${date}T12:00:00Z`)
}

/** 2つの日付の差（日数）。end - start */
export function diffDays(start: DateString, end: DateString): number {
  const ms = toUtcDate(end).getTime() - toUtcDate(start).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

/** 指定日数を加算した日付を返す */
export function addDays(date: DateString, days: number): DateString {
  const d = toUtcDate(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** date の曜日を返す（0=日〜6=土） */
export function getWeekday(date: DateString): Weekday {
  return toUtcDate(date).getUTCDay() as Weekday
}

/** start〜end（両端含む）の日付文字列配列を返す */
export function dateRange(start: DateString, end: DateString): DateString[] {
  const days = diffDays(start, end)
  if (days < 0) return []
  const result: DateString[] = []
  for (let i = 0; i <= days; i++) {
    result.push(addDays(start, i))
  }
  return result
}

/** a <= b かどうか */
export function isOnOrBefore(a: DateString, b: DateString): boolean {
  return a <= b
}

/** date が [start, end] の範囲内かどうか（両端含む） */
export function isWithinRange(
  date: DateString,
  start: DateString,
  end: DateString,
): boolean {
  return date >= start && date <= end
}
