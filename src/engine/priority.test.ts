import { describe, it, expect } from 'vitest'
import { calculatePriority, getRemainingDays } from './priority'
import {
  makePageAssignment,
  makeCreativeAssignment,
  makeProjectAssignment,
  makeUserSettings,
} from '../domain/test-factories'

// バッファの影響を受けずに旧仕様どおりの数値を検証するため、
// テストでは「バッファなし」に相当する設定（fixedDays: 0）を使う。
const noBufferSettings = makeUserSettings({
  deadlineBuffer: { mode: 'fixed', fixedDays: 0, percentage: 0 },
})

describe('getRemainingDays', () => {
  it('締切当日は残り1日として数える', () => {
    expect(getRemainingDays('2026-07-25', '2026-07-25')).toBe(1)
  })

  it('締切まで5日ある場合は6（当日+5日後まで含む）', () => {
    // 7/20から7/25までは差分5日、+1で6日
    expect(getRemainingDays('2026-07-20', '2026-07-25')).toBe(6)
  })

  it('締切を過ぎていても最低1を返す', () => {
    expect(getRemainingDays('2026-07-26', '2026-07-25')).toBe(1)
  })
})

describe('calculatePriority', () => {
  it('ページ型: (残り時間 / 残り日数) × 1.0', () => {
    const a = makePageAssignment({
      totalPages: 40,
      currentPage: 10,
      estimatedMinutesPerPage: 4,
      deadline: '2026-07-25',
    })
    // 残り時間120分、残り日数 = diff(7/20,7/25)+1 = 6（バッファなし）
    const priority = calculatePriority(a, '2026-07-20', noBufferSettings)
    expect(priority).toBeCloseTo(120 / 6)
  })

  it('創作型: タイプ係数1.2が乗算される', () => {
    const a = makeCreativeAssignment({
      estimatedTotalMinutes: 600,
      deadline: '2026-07-25',
    })
    const priority = calculatePriority(a, '2026-07-20', noBufferSettings)
    // 残り時間600分（全工程未着手）、残り日数6、係数1.2
    expect(priority).toBeCloseTo((600 / 6) * 1.2)
  })

  it('プロジェクト型: タイプ係数1.3が乗算される', () => {
    const a = makeProjectAssignment({
      estimatedTotalMinutes: 540,
      deadline: '2026-07-25',
    })
    const priority = calculatePriority(a, '2026-07-20', noBufferSettings)
    expect(priority).toBeCloseTo((540 / 6) * 1.3)
  })

  it('残り時間が0（完了済み）なら優先度は0', () => {
    const a = makePageAssignment({ totalPages: 10, currentPage: 10 })
    expect(calculatePriority(a, '2026-07-20', noBufferSettings)).toBe(0)
  })

  it('締切が近いほど優先度が高くなる', () => {
    const nearDeadline = makePageAssignment({
      totalPages: 40,
      currentPage: 0,
      estimatedMinutesPerPage: 4,
      deadline: '2026-07-21',
    })
    const farDeadline = makePageAssignment({
      totalPages: 40,
      currentPage: 0,
      estimatedMinutesPerPage: 4,
      deadline: '2026-08-31',
    })
    const pNear = calculatePriority(nearDeadline, '2026-07-20', noBufferSettings)
    const pFar = calculatePriority(farDeadline, '2026-07-20', noBufferSettings)
    expect(pNear).toBeGreaterThan(pFar)
  })
})
