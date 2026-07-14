/**
 * 創作型・プロジェクト型の「推定合計時間」を自動算出する。
 * ユーザーが登録時にこの値を初期値として提示され、違和感があれば手入力で上書きできる
 * （その場合 isEstimateManual = true として保存し、以後この自動推定では上書きしない）。
 */

import { CREATIVE_MINUTES_PER_CHAR, PROJECT_MINUTES_PER_PHASE } from '../config/constants'

/** 創作型：目標文字数から推定合計時間（分）を算出する */
export function estimateCreativeTotalMinutes(targetCharCount: number): number {
  return Math.round(targetCharCount * CREATIVE_MINUTES_PER_CHAR)
}

/** プロジェクト型：工程数から推定合計時間（分）を算出する */
export function estimateProjectTotalMinutes(phaseCount: number): number {
  return Math.round(phaseCount * PROJECT_MINUTES_PER_PHASE)
}
