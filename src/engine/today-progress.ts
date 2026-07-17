/**
 * 「今日、この宿題についてどれだけ記録したか」を集計する。
 * ホーム画面で「今日Xページ中Yページ」のような進捗表示に使う。
 *
 * StudySessionのstartedAtはISO文字列（例: "2026-07-20T16:00:00"）なので、
 * 日付部分（先頭10文字）が対象日と一致するセッションだけを対象にする。
 */

import type { StudySession, Id, DateString } from '../domain'

/** ISO文字列の先頭10文字（YYYY-MM-DD）を取り出す */
function toDateOnly(isoString: string): string {
  return isoString.slice(0, 10)
}

/**
 * 指定した日付・宿題について、記録されたセッションのactualAmount合計を返す。
 * 創作・プロジェクト型の場合、actualAmountは工程進捗比率の増分なので、
 * 合計値も「今日進んだ比率の合計」という意味になる。
 */
export function calculateTodayRecordedAmount(
  sessions: StudySession[],
  assignmentId: Id,
  date: DateString,
): number {
  return sessions
    .filter((s) => s.assignmentId === assignmentId && toDateOnly(s.startedAt) === date)
    .reduce((sum, s) => sum + s.actualAmount, 0)
}

/** 指定した日付・宿題について、記録された実測時間（分）の合計を返す */
export function calculateTodayRecordedMinutes(
  sessions: StudySession[],
  assignmentId: Id,
  date: DateString,
): number {
  return sessions
    .filter((s) => s.assignmentId === assignmentId && toDateOnly(s.startedAt) === date)
    .reduce((sum, s) => sum + s.actualMinutes, 0)
}
