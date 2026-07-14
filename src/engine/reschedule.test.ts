import { describe, it, expect } from 'vitest'
import { decideRescheduleRange } from './reschedule'
import { makePageAssignment, makeUserSettings } from '../domain/test-factories'

describe('decideRescheduleRange', () => {
  it('NearRange内で収まる場合はlevel1', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-08-31' },
      weekdayStudyMinutes: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    })
    // 残り時間50分、NearRange(3日)だけで十分収まる
    const a = makePageAssignment({ totalPages: 5, currentPage: 0, estimatedMinutesPerPage: 10 })
    const decision = decideRescheduleRange([a], '2026-07-20', settings)

    expect(decision.level).toBe('level1_near')
    expect(decision.targetDates).toHaveLength(3)
    expect(decision.targetDates[0]).toBe('2026-07-20')
  })

  it('NearRangeで収まらずMediumRangeで収まる場合はlevel2', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-08-31' },
      weekdayStudyMinutes: { 0: 50, 1: 50, 2: 50, 3: 50, 4: 50, 5: 50, 6: 50 },
    })
    // NearRange(3日)=150分では足りないが、MediumRange(7日)=350分なら収まる残り時間300分
    const a = makePageAssignment({ totalPages: 30, currentPage: 0, estimatedMinutesPerPage: 10 })
    const decision = decideRescheduleRange([a], '2026-07-20', settings)

    expect(decision.level).toBe('level2_medium')
    expect(decision.targetDates).toHaveLength(7)
  })

  it('MediumRangeでも収まらない場合はlevel3（全期間）', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-07-26' }, // 7日間のみ
      weekdayStudyMinutes: { 0: 30, 1: 30, 2: 30, 3: 30, 4: 30, 5: 30, 6: 30 },
    })
    // MediumRange(7日)=210分では全く足りない残り時間1000分
    const a = makePageAssignment({ totalPages: 100, currentPage: 0, estimatedMinutesPerPage: 10 })
    const decision = decideRescheduleRange([a], '2026-07-20', settings)

    expect(decision.level).toBe('level3_full')
    // 休暇全体は7/20〜7/26の7日間
    expect(decision.targetDates).toHaveLength(7)
  })

  it('対象範囲は休暇終了日を超えて延長されない', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-07-21' }, // 2日間のみ
      weekdayStudyMinutes: { 0: 10, 1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10 },
    })
    const a = makePageAssignment({ totalPages: 100, currentPage: 0, estimatedMinutesPerPage: 10 })
    const decision = decideRescheduleRange([a], '2026-07-20', settings)

    // NearRangeは3日分要求するが、休暇は2日しかないので2日に収まる
    expect(decision.targetDates.length).toBeLessThanOrEqual(2)
  })

  it('残り時間が0（全宿題完了）ならlevel1で即座に収まる', () => {
    const settings = makeUserSettings()
    const a = makePageAssignment({ isCompleted: true })
    const decision = decideRescheduleRange([a], '2026-07-20', settings)

    expect(decision.level).toBe('level1_near')
    expect(decision.totalRemainingMinutes).toBe(0)
  })
})
