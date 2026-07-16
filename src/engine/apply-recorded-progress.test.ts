import { describe, it, expect } from 'vitest'
import { applyRecordedProgress } from './apply-recorded-progress'
import {
  makePageAssignment,
  makeRepetitionAssignment,
  makeCreativeAssignment,
  makePhase,
} from '../domain/test-factories'

describe('applyRecordedProgress', () => {
  it('page型: currentPageに記録した量が加算される', () => {
    const a = makePageAssignment({ totalPages: 40, currentPage: 5 })
    const result = applyRecordedProgress(a, { amount: 3 })
    expect(result.type).toBe('page')
    if (result.type === 'page') {
      expect(result.currentPage).toBe(8)
      expect(result.isCompleted).toBe(false)
    }
  })

  it('page型: totalPagesに達するとisCompletedがtrueになる', () => {
    const a = makePageAssignment({ totalPages: 10, currentPage: 8 })
    const result = applyRecordedProgress(a, { amount: 5 })
    if (result.type === 'page') {
      // 上限でクリップされる
      expect(result.currentPage).toBe(10)
      expect(result.isCompleted).toBe(true)
    }
  })

  it('repetition型: completedItemsに記録した量が加算される', () => {
    const a = makeRepetitionAssignment({ totalItems: 100, completedItems: 20 })
    const result = applyRecordedProgress(a, { amount: 30 })
    if (result.type === 'repetition') {
      expect(result.completedItems).toBe(50)
      expect(result.isCompleted).toBe(false)
    }
  })

  it('creative型: 指定したphaseIdの工程progressRatioが加算される', () => {
    const phase1 = makePhase({ id: 'phase-1', progressRatio: 0.2 })
    const phase2 = makePhase({ id: 'phase-2', progressRatio: 0 })
    const a = makeCreativeAssignment({ phases: [phase1, phase2] })

    const result = applyRecordedProgress(a, { amount: 0.3, phaseId: 'phase-1' })
    if (result.type === 'creative') {
      const updatedPhase1 = result.phases.find((p) => p.id === 'phase-1')!
      const untouchedPhase2 = result.phases.find((p) => p.id === 'phase-2')!
      expect(updatedPhase1.progressRatio).toBeCloseTo(0.5)
      expect(untouchedPhase2.progressRatio).toBe(0)
    }
  })

  it('creative型: 全工程が完了するとAssignment全体もisCompletedになる', () => {
    const phase1 = makePhase({ id: 'phase-1', progressRatio: 0.9, isCompleted: false })
    const a = makeCreativeAssignment({ phases: [phase1] })

    const result = applyRecordedProgress(a, { amount: 0.2, phaseId: 'phase-1' })
    if (result.type === 'creative') {
      expect(result.phases[0].progressRatio).toBe(1)
      expect(result.phases[0].isCompleted).toBe(true)
      expect(result.isCompleted).toBe(true)
    }
  })

  it('creative型でphaseIdを指定しない場合は変化しない', () => {
    const a = makeCreativeAssignment()
    const result = applyRecordedProgress(a, { amount: 0.5 })
    expect(result).toEqual(a)
  })

  it('amountが0以下の場合は変化しない', () => {
    const a = makePageAssignment({ currentPage: 5 })
    const result = applyRecordedProgress(a, { amount: 0 })
    expect(result).toEqual(a)
  })
})
