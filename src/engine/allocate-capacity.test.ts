import { describe, it, expect } from 'vitest'
import { allocateCapacity } from './allocate-capacity'

describe('allocateCapacity', () => {
  it('スコア比率どおりに按分される（基本ケース）', () => {
    const result = allocateCapacity(100, [
      { assignmentId: 'a', score: 30 },
      { assignmentId: 'b', score: 70 },
    ])
    const a = result.find((r) => r.assignmentId === 'a')!
    const b = result.find((r) => r.assignmentId === 'b')!
    expect(a.allocatedMinutes).toBeCloseTo(30)
    expect(b.allocatedMinutes).toBeCloseTo(70)
    expect(a.excludedByMinimum).toBe(false)
    expect(b.excludedByMinimum).toBe(false)
  })

  it('配分の合計はcapacityと一致する（端数調整込み）', () => {
    const result = allocateCapacity(100, [
      { assignmentId: 'a', score: 33 },
      { assignmentId: 'b', score: 33 },
      { assignmentId: 'c', score: 34 },
    ])
    const total = result.reduce((sum, r) => sum + r.allocatedMinutes, 0)
    expect(total).toBeCloseTo(100)
  })

  it('下限時間未満の宿題は除外され、残りで再按分される', () => {
    // capacity=60分、3件のスコア比率が 1:1:58 だと、均等按分では
    // 上位2件が 60*(1/60)=1分 になり下限(5分)未満で除外される想定
    const result = allocateCapacity(60, [
      { assignmentId: 'small1', score: 1 },
      { assignmentId: 'small2', score: 1 },
      { assignmentId: 'big', score: 58 },
    ])
    const small1 = result.find((r) => r.assignmentId === 'small1')!
    const small2 = result.find((r) => r.assignmentId === 'small2')!
    const big = result.find((r) => r.assignmentId === 'big')!

    expect(small1.excludedByMinimum).toBe(true)
    expect(small2.excludedByMinimum).toBe(true)
    expect(small1.allocatedMinutes).toBe(0)
    expect(small2.allocatedMinutes).toBe(0)
    // 除外された分がbigに再配分され、bigは全capacityを得る
    expect(big.allocatedMinutes).toBeCloseTo(60)
  })

  it('端数は優先度（スコア）最上位の宿題に加算される', () => {
    // 3等分すると割り切れないが、下限時間(5分)は超えるケースで検証する
    const result = allocateCapacity(100, [
      { assignmentId: 'a', score: 1 },
      { assignmentId: 'b', score: 1 },
      { assignmentId: 'c', score: 1 },
    ])
    const total = result.reduce((sum, r) => sum + r.allocatedMinutes, 0)
    expect(total).toBeCloseTo(100)
    // 100/3 = 33.33...なので、端数がどれか1件に乗って合計が100ちょうどになっているはず
    const nonExcluded = result.filter((r) => !r.excludedByMinimum)
    expect(nonExcluded.length).toBe(3)
  })

  it('全員均等按分だと下限時間未満になる場合は全員除外される（3等分で下限割れ）', () => {
    // 10分を3等分すると1件あたり約3.33分となり、下限5分未満なので全員除外される
    const result = allocateCapacity(10, [
      { assignmentId: 'a', score: 1 },
      { assignmentId: 'b', score: 1 },
      { assignmentId: 'c', score: 1 },
    ])
    expect(result.every((r) => r.excludedByMinimum)).toBe(true)
    expect(result.every((r) => r.allocatedMinutes === 0)).toBe(true)
  })

  it('スコアが0以下の宿題は最初から除外される', () => {
    const result = allocateCapacity(50, [
      { assignmentId: 'a', score: 10 },
      { assignmentId: 'zero', score: 0 },
    ])
    const zero = result.find((r) => r.assignmentId === 'zero')!
    expect(zero.excludedByMinimum).toBe(true)
    expect(zero.allocatedMinutes).toBe(0)
  })

  it('capacityが0の場合は全員除外扱いになる', () => {
    const result = allocateCapacity(0, [
      { assignmentId: 'a', score: 10 },
      { assignmentId: 'b', score: 20 },
    ])
    expect(result.every((r) => r.allocatedMinutes === 0)).toBe(true)
    expect(result.every((r) => r.excludedByMinimum)).toBe(true)
  })

  it('入力が空配列なら空配列を返す', () => {
    expect(allocateCapacity(100, [])).toEqual([])
  })

  it('連鎖的な下限除外: 除外後の再按分でさらに下限未満が発生するケース', () => {
    // capacity=30、4件。1回目の按分で一部が下限未満になり除外、
    // 再按分後にさらに別の1件が下限未満になるシナリオ
    const result = allocateCapacity(30, [
      { assignmentId: 'a', score: 1 },
      { assignmentId: 'b', score: 2 },
      { assignmentId: 'c', score: 3 },
      { assignmentId: 'd', score: 94 },
    ])
    const total = result.reduce((sum, r) => sum + r.allocatedMinutes, 0)
    expect(total).toBeCloseTo(30)
    // 全ての非除外項目が下限時間以上であることを確認
    for (const r of result) {
      if (!r.excludedByMinimum) {
        expect(r.allocatedMinutes).toBeGreaterThanOrEqual(5 - 1e-9)
      } else {
        expect(r.allocatedMinutes).toBe(0)
      }
    }
  })

  it('全宿題が下限時間未満になる場合、全員除外される', () => {
    const result = allocateCapacity(3, [
      { assignmentId: 'a', score: 1 },
      { assignmentId: 'b', score: 1 },
    ])
    expect(result.every((r) => r.excludedByMinimum)).toBe(true)
    expect(result.every((r) => r.allocatedMinutes === 0)).toBe(true)
  })
})
