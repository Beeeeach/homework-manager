import { describe, it, expect } from 'vitest'
import { applyRecordedProgress } from './apply-recorded-progress'
import { makePageAssignment, makeRepetitionAssignment } from '../domain/test-factories'

describe('applyRecordedProgress（EMAによる予想時間の学習）', () => {
  it('page型: 初回記録時、実測値がそのまま新しい予想時間として採用される（EMA初回の挙動）', () => {
    const a = makePageAssignment({
      totalPages: 40,
      currentPage: 0,
      estimatedMinutesPerPage: 5, // 旧予想: 1ページ5分
      estimateSampleCount: 0,
    })
    // 10ページを20分で実施 → 実測は1ページ2分
    const result = applyRecordedProgress(a, { amount: 10, actualMinutes: 20 })

    if (result.type === 'page') {
      expect(result.currentPage).toBe(10)
      // 初回はEMAではなく実測値をそのまま採用する（ema.tsの仕様）
      expect(result.estimatedMinutesPerPage).toBeCloseTo(2)
      expect(result.estimateSampleCount).toBe(1)
    }
  })

  it('page型: 2回目以降はEMAで旧予想と実測値がブレンドされる', () => {
    const a = makePageAssignment({
      totalPages: 40,
      currentPage: 10,
      estimatedMinutesPerPage: 2, // 1回目の記録で2分に更新済みという想定
      estimateSampleCount: 1,
    })
    // 2回目: 10ページを30分で実施 → 実測は1ページ3分
    const result = applyRecordedProgress(a, { amount: 10, actualMinutes: 30 })

    if (result.type === 'page') {
      expect(result.currentPage).toBe(20)
      // sampleCount=1なのでalpha=0.6（EMA_ALPHA_BY_SAMPLE_COUNT）
      // newEstimate = 0.6×3 + 0.4×2 = 2.6
      expect(result.estimatedMinutesPerPage).toBeCloseTo(2.6)
      expect(result.estimateSampleCount).toBe(2)
    }
  })

  it('page型: actualMinutesが渡されない場合はEMA更新されず、進捗のみ反映される', () => {
    const a = makePageAssignment({
      totalPages: 40,
      currentPage: 0,
      estimatedMinutesPerPage: 5,
      estimateSampleCount: 0,
    })
    const result = applyRecordedProgress(a, { amount: 10 })

    if (result.type === 'page') {
      expect(result.currentPage).toBe(10)
      expect(result.estimatedMinutesPerPage).toBe(5) // 変化しない
      expect(result.estimateSampleCount).toBe(0) // 元の値のまま変化しない
    }
  })

  it('repetition型: 実測値からestimatedMinutesPerItemがEMAで更新される', () => {
    const a = makeRepetitionAssignment({
      totalItems: 100,
      completedItems: 0,
      estimatedMinutesPerItem: 0.5,
      estimateSampleCount: 0,
    })
    // 20個を5分で実施 → 実測は1個0.25分
    const result = applyRecordedProgress(a, { amount: 20, actualMinutes: 5 })

    if (result.type === 'repetition') {
      expect(result.completedItems).toBe(20)
      expect(result.estimatedMinutesPerItem).toBeCloseTo(0.25)
      expect(result.estimateSampleCount).toBe(1)
    }
  })
})
