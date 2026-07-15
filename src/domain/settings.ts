/**
 * 初回設定（仕様書 第6章）に対応するデータ構造。
 * ユーザーが最初に入力する「土台となる時間の枠」を表す。
 * ここで定まった値は、日々のcapacity計算（10.2③の前提）に使われる。
 */

import type { DateString, Weekday } from './common'

/** ① 長期休暇期間（例：7/20〜8/31） */
export interface VacationPeriod {
  startDate: DateString
  endDate: DateString
}

/**
 * ② 曜日ごとの勉強可能時間（分）
 * ユーザー入力を最優先する。休日だから多めなどの自動補正は行わない（仕様書6章）。
 */
export type WeekdayStudyMinutes = Record<Weekday, number>

/**
 * ③ 固定予定（毎週の部活・塾・習い事など）
 * 特定の曜日に毎週発生し、その分だけ勉強可能時間を減らす。
 */
export interface RecurringSchedule {
  id: string
  title: string
  weekday: Weekday
  /** その予定で失われる時間（分） */
  durationMinutes: number
}

/**
 * ④ 特別予定（旅行・大会・模試・帰省など）
 * 特定の期間、勉強可能時間を減らす（0にする場合も含む）。
 * 仕様書10.2②「勉強可能時間0の日は日付重み0として扱う」に対応するため、
 * durationMinutes には「その日の勉強可能時間からの減算分」を保持する。
 */
export interface SpecialSchedule {
  id: string
  title: string
  startDate: DateString
  endDate: DateString
  /** その期間中、1日あたり失われる時間（分）。終日不可なら十分大きな値を入れる想定 */
  durationMinutesPerDay: number
}

/**
 * ⑤ 締切バッファ設定
 * 優先度計算（10.2①）で使う「実効締切」を実際の締切より前倒しすることで、
 * 本来の締切ぎりぎりまで使い切るスケジュールではなく、
 * 数日分の余裕を持って終わるスケジュールを組むための設定。
 *
 * mode:
 *   'fixed'    - 常に固定日数分（fixedDays）前倒しする
 *   'percentage' - 締切までの残り日数に対する割合（percentage、0〜1）分前倒しする
 * どちらの場合も、前倒し後の残り日数は最低1日を下回らない（ゼロ除算・負値を防ぐ）。
 */
export interface DeadlineBufferSettings {
  mode: 'fixed' | 'percentage'
  /** mode: 'fixed' のときに使う前倒し日数 */
  fixedDays: number
  /** mode: 'percentage' のときに使う前倒し割合（0〜1） */
  percentage: number
}

/** 初回設定全体をまとめたもの */
export interface UserSettings {
  vacationPeriod: VacationPeriod
  weekdayStudyMinutes: WeekdayStudyMinutes
  recurringSchedules: RecurringSchedule[]
  specialSchedules: SpecialSchedule[]
  deadlineBuffer: DeadlineBufferSettings
}

/** deadlineBufferのデフォルト値（固定2日前倒し） */
export const DEFAULT_DEADLINE_BUFFER: DeadlineBufferSettings = {
  mode: 'fixed',
  fixedDays: 2,
  percentage: 0.2,
}
