import { describe, it, expect } from 'vitest'
import { applyActualToStore, getEstimate, findLearningRecord } from './learning-store'
import type { LearningRecordStore } from './learning-store'

describe('learning-store', () => {
  it('レコードが存在しない場合、fallback値を初期推定として新規作成される', () => {
    const store: LearningRecordStore = {}
    const key = { homeworkType: 'page' as const, subject: '数学' }
    const updated = applyActualToStore(store, key, 6, 4)

    const record = findLearningRecord(updated, key)
    expect(record).not.toBeNull()
    expect(record!.currentEstimate).toBe(6) // 初回実測がそのまま採用される
    expect(record!.sampleCount).toBe(1)
  })

  it('既存レコードがあれば、それを更新する', () => {
    const key = { homeworkType: 'page' as const, subject: '数学' }
    let store: LearningRecordStore = {}
    store = applyActualToStore(store, key, 6, 4) // sampleCount=1, estimate=6
    store = applyActualToStore(store, key, 4, 4) // alpha(1)=0.6 => 0.6*4+0.4*6=4.8

    const record = findLearningRecord(store, key)
    expect(record!.currentEstimate).toBeCloseTo(4.8)
    expect(record!.sampleCount).toBe(2)
  })

  it('異なる宿題タイプ×教科の組み合わせは独立して管理される', () => {
    let store: LearningRecordStore = {}
    const mathKey = { homeworkType: 'page' as const, subject: '数学' }
    const englishKey = { homeworkType: 'page' as const, subject: '英語' }

    store = applyActualToStore(store, mathKey, 10, 4)
    store = applyActualToStore(store, englishKey, 2, 4)

    expect(getEstimate(store, mathKey, 0)).toBe(10)
    expect(getEstimate(store, englishKey, 0)).toBe(2)
  })

  it('getEstimateはレコードがない場合fallbackを返す', () => {
    const store: LearningRecordStore = {}
    const key = { homeworkType: 'repetition' as const, subject: '古文' }
    expect(getEstimate(store, key, 0.5)).toBe(0.5)
  })
})
