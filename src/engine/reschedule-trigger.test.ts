import { describe, it, expect } from 'vitest'
import { shouldTriggerReschedule } from './reschedule-trigger'

describe('shouldTriggerReschedule', () => {
  it('「今日はここまで」操作は発火対象', () => {
    expect(shouldTriggerReschedule('end_of_day_action')).toBe(true)
  })

  it('日付変更は発火対象', () => {
    expect(shouldTriggerReschedule('date_changed')).toBe(true)
  })
})
