import { describe, it, expect } from 'vitest'
import { getRemainingMinutes, getRemainingMinutesForPhase } from './remaining-time'
import {
  makePageAssignment,
  makeRepetitionAssignment,
  makeCreativeAssignment,
  makePhase,
} from '../domain/test-factories'
import { estimateCreativeTotalMinutes, estimateProjectTotalMinutes } from './estimate-total-minutes'

describe('getRemainingMinutes', () => {
  it('ページ型: 残りページ数 × 1ページ当たり時間', () => {
    const a = makePageAssignment({
      totalPages: 40,
      currentPage: 10,
      estimatedMinutesPerPage: 4,
    })
    // 残り30ページ × 4分 = 120分
    expect(getRemainingMinutes(a)).toBe(120)
  })

  it('ページ型: 完了ページが総ページ数を超えても負にならない', () => {
    const a = makePageAssignment({ totalPages: 10, currentPage: 15 })
    expect(getRemainingMinutes(a)).toBe(0)
  })

  it('反復型: 残り項目数 × 1項目当たり時間', () => {
    const a = makeRepetitionAssignment({
      totalItems: 200,
      completedItems: 50,
      estimatedMinutesPerItem: 0.5,
    })
    // 残り150項目 × 0.5分 = 75分
    expect(getRemainingMinutes(a)).toBe(75)
  })

  it('創作型: 全工程が未着手なら合計時間そのまま', () => {
    const a = makeCreativeAssignment({
      estimatedTotalMinutes: 600,
      phases: [
        makePhase({ ratio: 0.4, progressRatio: 0 }),
        makePhase({ ratio: 0.6, progressRatio: 0 }),
      ],
    })
    expect(getRemainingMinutes(a)).toBe(600)
  })

  it('創作型: 一部工程が完了していれば残り時間が減る', () => {
    const a = makeCreativeAssignment({
      estimatedTotalMinutes: 600,
      phases: [
        makePhase({ ratio: 0.4, progressRatio: 1 }), // 読書完了(40%分がゼロに)
        makePhase({ ratio: 0.6, progressRatio: 0 }),
      ],
    })
    // 残りは0.6 * 600 = 360分
    expect(getRemainingMinutes(a)).toBe(360)
  })

  it('getRemainingMinutesForPhaseが単体で正しく動く', () => {
    const phase = makePhase({ ratio: 0.25, progressRatio: 0.5 })
    // 0.25 * 400 * (1 - 0.5) = 50
    expect(getRemainingMinutesForPhase(phase, 400)).toBe(50)
  })
})

describe('estimateTotalMinutes（自動推定）', () => {
  it('創作型は文字数から推定する', () => {
    expect(estimateCreativeTotalMinutes(1200)).toBe(600) // 1200 * 0.5
  })

  it('プロジェクト型は工程数から推定する', () => {
    expect(estimateProjectTotalMinutes(6)).toBe(540) // 6 * 90
  })
})
