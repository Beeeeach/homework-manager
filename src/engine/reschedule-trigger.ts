/**
 * リスケジュールの発生タイミング管理（仕様書 12.1）
 *
 * 「毎回のセッション記録では発火させない」という要件を守るため、
 * リスケジュールの実行はUI層から次の2つのイベントに限定して呼び出す。
 * このモジュールはそのイベント種別を型として明示し、
 * 誤って別のタイミング（例: StudySession保存の直後）で呼び出すミスを防ぐ。
 */

export type RescheduleTriggerEvent =
  /** 「今日はここまで」ボタン、またはアプリを閉じる操作 */
  | 'end_of_day_action'
  /** 日付が変わったとき（未実施のまま日をまたいだ場合を含む） */
  | 'date_changed'

/**
 * 与えられたイベントがリスケジュールを発火させるべきものかを判定する。
 * 現状は12.1で定義された2種類のみが対象だが、将来イベント種別が増えた場合に
 * ここでの判定ロジックを一元管理できるようにするための薄いラッパー。
 */
export function shouldTriggerReschedule(event: RescheduleTriggerEvent): boolean {
  return event === 'end_of_day_action' || event === 'date_changed'
}
