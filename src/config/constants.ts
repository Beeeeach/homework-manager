/**
 * アプリ全体の設定値（仕様書 第18章「設定値一覧」に対応）
 *
 * ここに定義した値は、優先度計算・日付重み計算・割当ロジック・
 * リスケジュール判定・オーバーロード検出のすべてから参照される。
 * 「将来的に調整可能」という仕様要件があるため、マジックナンバーとして
 * 各ロジックに埋め込まず、必ずこのファイル経由で参照すること。
 */

/** 宿題タイプ（仕様書 第7章） */
export type HomeworkType = 'page' | 'repetition' | 'creative' | 'project'

/**
 * タイプ係数（仕様書 10.2①）
 * 優先度 = (残り予想時間 ÷ 残り日数) × タイプ係数
 */
export const TYPE_COEFFICIENT: Record<HomeworkType, number> = {
  page: 1.0,
  repetition: 1.0,
  creative: 1.2,
  project: 1.3,
}

/**
 * 日付重みの基礎値（仕様書 10.2②）
 * 休暇開始日〜終了日の線形前倒し補正の両端の値。
 * 実際の日ごとの重みは、期間内の位置に応じてこの2値を線形補間して求める。
 */
export const DAY_WEIGHT_START = 1.2
export const DAY_WEIGHT_END = 0.8

/**
 * 下限時間（仕様書 10.2③ 手順4）
 * この時間（分）未満になる配分は、当日の割当から除外し
 * 残りの宿題で再按分する。
 */
export const MIN_ALLOCATION_MINUTES = 5

/**
 * 安全係数（仕様書 第9章 オーバーロードチェック）
 * Σ残り予想時間 > Σ残り勉強可能時間 × 安全係数 の場合に警告。
 */
export const OVERLOAD_SAFETY_FACTOR = 0.9

/**
 * リスケジュールの範囲設定（仕様書 12.2 / 12.3）
 * レベル1: NearRange内で収まるか判定・再配分
 * レベル2: 収まらなければMediumRangeまで拡大
 * レベル3: それでも収まらなければ全期間再計算
 */
export const NEAR_RANGE_DAYS = 3
export const MEDIUM_RANGE_DAYS = 7

/**
 * 創作型・プロジェクト型のデフォルト工程比率（仕様書 第7章③④）
 * テンプレートごとに定義し、ユーザーがカスタマイズ可能とする想定。
 * ここではMVPで使う初期テンプレートのみ定義する。
 */
export const CREATIVE_TEMPLATE_PHASES: { name: string; ratio: number }[] = [
  { name: '読書', ratio: 0.4 },
  { name: 'メモ', ratio: 0.1 },
  { name: '構成', ratio: 0.1 },
  { name: '下書き', ratio: 0.25 },
  { name: '清書', ratio: 0.15 },
]

export const PROJECT_TEMPLATE_PHASES: { name: string; ratio: number }[] = [
  { name: 'テーマ決定', ratio: 0.1 },
  { name: '情報収集', ratio: 0.2 },
  { name: '実験', ratio: 0.3 },
  { name: '結果整理', ratio: 0.15 },
  { name: '考察', ratio: 0.15 },
  { name: 'レポート', ratio: 0.1 },
]

/**
 * EMA（指数移動平均）学習のα制御（仕様書 第14章）
 * 測定回数が少ないほどαを大きく（実測を強く反映）、
 * 測定回数が多いほどαを小さく（安定を重視）する。
 * ここでは単純な区分関数として定義し、後で調整しやすいようにする。
 */
export const EMA_ALPHA_BY_SAMPLE_COUNT = (sampleCount: number): number => {
  if (sampleCount <= 1) return 0.6
  if (sampleCount <= 3) return 0.4
  if (sampleCount <= 7) return 0.25
  return 0.15
}

/** 1ページ当たり予想時間の選択肢（仕様書 第9章 登録フロー例） */
export const PAGE_TIME_PRESETS_MINUTES = [
  { label: '1〜2分', value: 1.5 },
  { label: '3〜5分', value: 4 },
  { label: '5〜15分', value: 10 },
  { label: '15分以上', value: 20 },
] as const

/**
 * 創作型の自動推定用パラメータ（仕様書には明記なし、MVPでの初期値として設定）
 * 推定合計時間(分) = 目標文字数 × MINUTES_PER_CHAR
 * 「読む・考える」時間も含めた大まかな目安であり、精度はEMA学習で改善される想定。
 */
export const CREATIVE_MINUTES_PER_CHAR = 0.5

/**
 * プロジェクト型の自動推定用パラメータ（文字数に相当する指標がないため工程数ベース）
 * 推定合計時間(分) = 工程数 × MINUTES_PER_PHASE
 */
export const PROJECT_MINUTES_PER_PHASE = 90


/**
 * 以下は既存の config/constants.ts の末尾に追加してください。
 * （集中配分ロジックのための新規定数）
 */

/**
 * 集中配分の1ブロックあたりの時間（分）（新: 10.2③改訂）
 * この時間未満しか配分できない宿題は、緊急でない限りその日はスキップし、
 * 別の宿題にcapacityを回す。MIN_ALLOCATION_MINUTES（下限除外用、既存の按分ロジックが
 * 使用）とは目的が異なるため別定数として持つ。
 */
export const BLOCK_MINUTES = 30

/**
 * 1日に手をつける宿題の最大件数（新: 10.2③改訂）
 * 集中配分で「毎日全部に少しずつ」を避けるための上限。
 * これを超える分は、capacityが余っていてもその日は割り当てない。
 */
export const MAX_ASSIGNMENTS_PER_DAY = 3
