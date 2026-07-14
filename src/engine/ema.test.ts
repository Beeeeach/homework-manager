import { describe, it, expect } from 'vitest'
import { updateLearningRecord, createInitialLearningRecord } from './ema'

describe('updateLearningRecord', () => {
  it('初回の実測値は推定値としてそのまま採用される', () => {
    const record = createInitialLearningRecord('page', '数学', 4) // 初期値4分/ページ
    const updated = updateLearningRecord(record, 6) // 実測6分/ページ
    expect(updated.currentEstimate).toBe(6)
    expect(updated.sampleCount).toBe(1)
  })

  it('2回目以降はEMA式で更新される', () => {
    let record = createInitialLearningRecord('page', '数学', 4)
    record = updateLearningRecord(record, 6) // sampleCount: 0->1, estimate=6
    // 2回目の実測。sampleCount=1なのでalpha=EMA_ALPHA_BY_SAMPLE_COUNT(1)=0.6
    record = updateLearningRecord(record, 4)
    // newEstimate = 0.6*4 + 0.4*6 = 2.4 + 2.4 = 4.8
    expect(record.currentEstimate).toBeCloseTo(4.8)
    expect(record.sampleCount).toBe(2)
  })

  it('測定回数が増えるほど実測の影響（変化幅）が小さくなる', () => {
    // 多数回更新した後の推定値は、直近の極端な実測値1回では大きく動かない
    let record = createInitialLearningRecord('page', '数学', 5)
    for (let i = 0; i < 10; i++) {
      record = updateLearningRecord(record, 5) // 安定して5分
    }
    const before = record.currentEstimate
    record = updateLearningRecord(record, 50) // 急に極端な値
    const changeAmount = record.currentEstimate - before

    // sampleCountが少ない段階で同様の急変を与えた場合と比較
    let earlyRecord = createInitialLearningRecord('page', '数学', 5)
    earlyRecord = updateLearningRecord(earlyRecord, 5) // sampleCount=1
    const earlyBefore = earlyRecord.currentEstimate
    earlyRecord = updateLearningRecord(earlyRecord, 50)
    const earlyChangeAmount = earlyRecord.currentEstimate - earlyBefore

    expect(changeAmount).toBeLessThan(earlyChangeAmount)
  })
})
