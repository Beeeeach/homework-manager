/**
 * 日付重み（Day Weight）の計算（仕様書 10.2②）
 *
 *   日付重み(day) = 基礎重み(day) - 固定予定による減算 - 特別予定による減算
 *
 * 基礎重みは休暇開始日を1.2、終了日を0.8とする線形の前倒し補正。
 * 「勉強可能時間0の日（特別予定で旅行など）は日付重み0として扱う」という
 * 仕様書の要件を満たすため、固定・特別予定による減算は
 * 「その日の基準時間からどれだけの割合が失われたか」を基礎重みに乗じる形で表現する。
 * こうすることで、capacityが0になった日は自動的に重みも0になり、
 * 割当ロジック（10.2③）側で特別な分岐を追加する必要がなくなる。
 *
 * 【修正】休暇期間（vacationPeriod）の範囲外の日付は、曜日設定に関わらず
 * capacity・重みともに常に0として扱うようにした。以前はvacationPeriodの
 * チェックが漏れており、期間外の日付でも曜日の基準時間がそのまま
 * capacityとして使われてしまうバグがあった。
 */
import type { DateString, UserSettings } from '../domain'
import { DAY_WEIGHT_START, DAY_WEIGHT_END } from '../config/constants'
import { diffDays, getWeekday, isWithinRange } from './date-utils'

/** 基礎重み：休暇開始日〜終了日を線形補間する */
export function getBaseDayWeight(
  date: DateString,
  vacationStart: DateString,
  vacationEnd: DateString,
): number {
  const totalDays = diffDays(vacationStart, vacationEnd)
  if (totalDays <= 0) return DAY_WEIGHT_START
  const elapsed = diffDays(vacationStart, date)
  const progress = Math.min(1, Math.max(0, elapsed / totalDays))
  return DAY_WEIGHT_START + (DAY_WEIGHT_END - DAY_WEIGHT_START) * progress
}

/** 指定した日付が、設定された長期休暇期間の範囲内かどうかを判定する */
export function isWithinVacationPeriod(date: DateString, settings: UserSettings): boolean {
  return isWithinRange(
    date,
    settings.vacationPeriod.startDate,
    settings.vacationPeriod.endDate,
  )
}

/**
 * その日の「基準勉強可能時間」（曜日設定のみに基づく、固定・特別予定を考慮する前の時間）。
 * capacity計算にも日付重み計算にも使うため共通化する。
 * 休暇期間の範囲外であれば、曜日設定に関わらず0を返す。
 */
export function getBaseStudyMinutes(
  date: DateString,
  settings: UserSettings,
): number {
  if (!isWithinVacationPeriod(date, settings)) return 0
  const weekday = getWeekday(date)
  return settings.weekdayStudyMinutes[weekday] ?? 0
}

/**
 * その日、固定予定・特別予定によって失われる時間（分）の合計。
 * 曜日設定の基準時間を超えて減算されることはない（0未満にはならない）。
 */
export function getLostMinutes(date: DateString, settings: UserSettings): number {
  const weekday = getWeekday(date)
  const recurringLoss = settings.recurringSchedules
    .filter((s) => s.weekday === weekday)
    .reduce((sum, s) => sum + s.durationMinutes, 0)
  const specialLoss = settings.specialSchedules
    .filter((s) => isWithinRange(date, s.startDate, s.endDate))
    .reduce((sum, s) => sum + s.durationMinutesPerDay, 0)
  return recurringLoss + specialLoss
}

/**
 * その日の実際の勉強可能時間（capacity、分）。
 * 基準時間から固定・特別予定分を減算し、0未満にはしない。
 * 休暇期間の範囲外であれば、getBaseStudyMinutesが0を返すため、常に0になる。
 */
export function getCapacityMinutes(
  date: DateString,
  settings: UserSettings,
): number {
  const base = getBaseStudyMinutes(date, settings)
  const lost = getLostMinutes(date, settings)
  return Math.max(0, base - lost)
}

/**
 * 日付重みの最終値。
 * capacityが0の日は重み0（仕様書10.2②「勉強可能時間0の日は日付重み0」）。
 * これには休暇期間外の日付も含まれる（getCapacityMinutesが0を返すため）。
 * それ以外は、基礎重み × (実際のcapacity ÷ 基準時間) として、
 * 固定・特別予定で目減りした分だけ重みも比例して下げる。
 */
export function getDayWeight(
  date: DateString,
  settings: UserSettings,
): number {
  const base = getBaseStudyMinutes(date, settings)
  const capacity = getCapacityMinutes(date, settings)
  if (capacity <= 0) return 0
  if (base <= 0) return 0
  const baseWeight = getBaseDayWeight(
    date,
    settings.vacationPeriod.startDate,
    settings.vacationPeriod.endDate,
  )
  const retainedRatio = capacity / base
  return baseWeight * retainedRatio
}
