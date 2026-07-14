/**
 * ドメイン全体で使う基礎的な型。
 * 日付は "YYYY-MM-DD" 形式の文字列で統一する（タイムゾーン問題を避けるため、
 * Date型ではなく文字列で扱い、比較・計算はengine層のユーティリティ関数で行う）。
 */

/** "YYYY-MM-DD" 形式の日付文字列 */
export type DateString = string

/** ISO8601形式の日時文字列（開始・終了時刻など、時刻まで必要な場合） */
export type DateTimeString = string

/** 一意識別子 */
export type Id = string

/** 曜日（0=日曜 〜 6=土曜、JSのDate#getDay()と揃える） */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6
