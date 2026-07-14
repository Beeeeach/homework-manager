import { describe, it, expect } from 'vitest'
import { TYPE_COEFFICIENT, EMA_ALPHA_BY_SAMPLE_COUNT } from './constants'

describe('constants (setup sanity check)', () => {
  it('タイプ係数が仕様書どおりの初期値である', () => {
    expect(TYPE_COEFFICIENT.page).toBe(1.0)
    expect(TYPE_COEFFICIENT.repetition).toBe(1.0)
    expect(TYPE_COEFFICIENT.creative).toBe(1.2)
    expect(TYPE_COEFFICIENT.project).toBe(1.3)
  })

  it('EMAのαが測定回数に応じて小さくなっていく', () => {
    const a1 = EMA_ALPHA_BY_SAMPLE_COUNT(1)
    const a5 = EMA_ALPHA_BY_SAMPLE_COUNT(5)
    const a10 = EMA_ALPHA_BY_SAMPLE_COUNT(10)
    expect(a1).toBeGreaterThan(a5)
    expect(a5).toBeGreaterThan(a10)
  })
})
