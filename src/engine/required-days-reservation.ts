/**
 * 創作型・プロジェクト型の「必要日数（requiredDays）」を、
 * できる限り連続した日で確保するための予約ロジック。
 *
 * 【アルゴリズム】
 * 1. 対象期間（登録日〜締切）の各日について、「他の宿題の必要ペース」
 *    （Σ 他宿題の残り時間 / 実効残り日数）と、その日のcapacityから
 *    「余裕度」（capacity - 他の必要ペース合計）を計算する
 * 2. requiredDays分の連続区間をスライドさせ、余裕度合計が最大になる区間を選ぶ
 *    （締切を超えない範囲、登録日以降）
 * 3. 選ばれた区間の日付一覧を返す。呼び出し側（schedule-day.ts）は、
 *    この日付一覧に含まれる日については、対象の創作/プロジェクト型を
 *    優先的に（基本は専有で）確保する。
 *
 * この計算は「その日のスケジュールを組む」たびに行うと重くなるため、
 * 呼び出し側で対象日と結果をキャッシュする使い方を想定している
 * （schedule-day.ts側で日付ごとに毎回呼ぶ設計にはしていない）。
 */

import type { Assignment, DateString, UserSettings } from '../domain'
import { dateRange, diffDays } from './date-utils'
import { getCapacityMinutes } from './day-weight'
import { getRemainingMinutes } from './remaining-time'
import { getEffectiveRemainingDays } from './priority'

/**
 * 指定日について、対象宿題(target)以外の宿題群の「最低限必要なペース（分/日）」を計算する。
 * 各宿題の (残り時間 / 実効残り日数) の合計。
 */
function calculateOtherAssignmentsPace(
  date: DateString,
  otherAssignments: Assignment[],
  settings: UserSettings,
): number {
  return otherAssignments.reduce((sum, a) => {
    if (a.isCompleted) return sum
    const remainingMinutes = getRemainingMinutes(a)
    if (remainingMinutes <= 0) return sum
    const effectiveRemainingDays = getEffectiveRemainingDays(date, a.deadline, settings)
    return sum + remainingMinutes / effectiveRemainingDays
  }, 0)
}

/**
 * requiredDays分の連続区間のうち、余裕度合計が最大になる区間の開始日を探す。
 * 候補期間は [target.createdAt, target.deadline] の範囲内。
 * 見つからない場合（期間がrequiredDaysに満たない等）はnullを返す。
 */
export function findBestConsecutiveWindow(
  target: Assignment,
  otherAssignments: Assignment[],
  settings: UserSettings,
  requiredDays: number,
): DateString[] | null {
  const allDates = dateRange(target.createdAt, target.deadline)
  if (allDates.length < requiredDays) return null

  // 各日の余裕度（capacity - 他宿題の必要ペース）を先に計算しておく
  const marginByDate = new Map<DateString, number>()
  for (const date of allDates) {
    const capacity = getCapacityMinutes(date, settings)
    const otherPace = calculateOtherAssignmentsPace(date, otherAssignments, settings)
    marginByDate.set(date, capacity - otherPace)
  }

  let bestStartIndex = 0
  let bestTotalMargin = -Infinity

  for (let start = 0; start + requiredDays <= allDates.length; start++) {
    let totalMargin = 0
    for (let i = start; i < start + requiredDays; i++) {
      totalMargin += marginByDate.get(allDates[i]) ?? 0
    }
    if (totalMargin > bestTotalMargin) {
      bestTotalMargin = totalMargin
      bestStartIndex = start
    }
  }

  return allDates.slice(bestStartIndex, bestStartIndex + requiredDays)
}

/**
 * 指定日について、他宿題の必要ペースを差し引いてもなお専有できる余裕があるかを判定する。
 * 余裕がなければ「部分確保」（他の必要ペース分は残し、余った分だけ専有）にする。
 * 戻り値は、その日にtargetへ割り当ててよい上限時間（分）。
 */
export function calculateReservableMinutes(
  date: DateString,
  target: Assignment,
  otherAssignments: Assignment[],
  settings: UserSettings,
): number {
  const capacity = getCapacityMinutes(date, settings)
  const otherPace = calculateOtherAssignmentsPace(date, otherAssignments, settings)
  // 他宿題の必要ペース分は必ず残し、残りをtargetに充てる（0未満にはしない）
  return Math.max(0, capacity - otherPace)
}
