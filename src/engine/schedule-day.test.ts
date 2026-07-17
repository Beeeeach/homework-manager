import { describe, it, expect } from 'vitest'
import { scheduleForDay } from './schedule-day'
import {
  makePageAssignment,
  makeUserSettings,
  makeRepetitionAssignment,
  makeProjectAssignment,
} from '../domain/test-factories'

describe('scheduleForDay（統合）', () => {
  it('単一の宿題のみで、残り時間がcapacity以上なら、その日のcapacityを全て受け取る', () => {
    const settings = makeUserSettings() // 月曜=60分
    const assignment = makePageAssignment({
      id: 'math',
      totalPages: 40,
      currentPage: 0,
      estimatedMinutesPerPage: 4, // 残り160分。capacity60分より十分多い
      deadline: '2026-08-31',
    })
    const result = scheduleForDay('2026-07-20', [assignment], settings)

    expect(result.capacityMinutes).toBe(60)
    expect(result.allocations).toHaveLength(1)
    expect(result.allocations[0].allocatedMinutes).toBeCloseTo(60)
    expect(result.allocations[0].excludedByMinimum).toBe(false)
  })

  it('複数宿題は優先度の高い順に集中配分され、締切が近い方がより多く配分される', () => {
    const settings = makeUserSettings({
      weekdayStudyMinutes: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    })
    // 締切が近い方が優先度が高くなり、先に（より多く）配分されるはず
    const urgent = makePageAssignment({
      id: 'urgent',
      totalPages: 10,
      currentPage: 0,
      estimatedMinutesPerPage: 10, // 残り100分
      deadline: '2026-07-21', // 明日締切
    })
    const relaxed = makePageAssignment({
      id: 'relaxed',
      totalPages: 10,
      currentPage: 0,
      estimatedMinutesPerPage: 10, // 残り100分（同じ残り時間）
      deadline: '2026-08-31', // 締切まで余裕あり
    })
    const result = scheduleForDay('2026-07-20', [urgent, relaxed], settings)

    const urgentAlloc = result.allocations.find((a) => a.assignmentId === 'urgent')!
    const relaxedAlloc = result.allocations.find((a) => a.assignmentId === 'relaxed')!

    // urgentが先に配分され、残り時間100分をまるごと得る（capacity100分ちょうど使い切る）
    expect(urgentAlloc.allocatedMinutes).toBeCloseTo(100)
    expect(urgentAlloc.excludedByMinimum).toBe(false)
    // capacityが尽きたため、relaxedはその日は割り当てなし
    expect(relaxedAlloc.allocatedMinutes).toBe(0)
    expect(relaxedAlloc.excludedByMinimum).toBe(true)
  })

  it('完了済みの宿題は対象から除外される', () => {
    const settings = makeUserSettings()
    const done = makePageAssignment({ id: 'done', isCompleted: true })
    // active: 残り時間40分（10ページ×4分）、capacityは60分
    const active = makePageAssignment({ id: 'active', totalPages: 10, currentPage: 0 })
    const result = scheduleForDay('2026-07-20', [done, active], settings)

    expect(result.allocations.some((a) => a.assignmentId === 'done')).toBe(false)
    const activeAlloc = result.allocations.find((a) => a.assignmentId === 'active')!
    // 集中配分では「残り時間ぶんだけ」配分されるため、capacity(60分)ではなく
    // 残り時間である40分がそのまま割り当てられる（余りは捨てられる）
    expect(activeAlloc.allocatedMinutes).toBeCloseTo(40)
    expect(activeAlloc.excludedByMinimum).toBe(false)
  })

  it('capacityが0の日は全宿題が配分0になる（旅行等）', () => {
    const settings = makeUserSettings({
      specialSchedules: [
        {
          id: 's1',
          title: '旅行',
          startDate: '2026-07-20',
          endDate: '2026-07-20',
          durationMinutesPerDay: 999,
        },
      ],
    })
    const a = makePageAssignment({ id: 'a', totalPages: 10, currentPage: 0 })
    const result = scheduleForDay('2026-07-20', [a], settings)

    expect(result.capacityMinutes).toBe(0)
    expect(result.dayWeight).toBe(0)
    expect(result.allocations[0].allocatedMinutes).toBe(0)
  })

  it('異なるタイプの宿題が混在する場合、それぞれの計算方式で正しく配分される', () => {
    const settings = makeUserSettings({
      weekdayStudyMinutes: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    })
    const pageType = makePageAssignment({
      id: 'page',
      totalPages: 10,
      currentPage: 0,
      estimatedMinutesPerPage: 5, // 残り50分（集中配分の対象）
      deadline: '2026-07-25',
    })
    // repetition型は頻度未指定（デフォルト: 毎日・1周）のため、
    // 「今日1日で終わらせる」のではなく「締切までの日数で均等ペース」の固定枠として扱われる。
    // 総必要量100個、残り日数6日（7/20〜7/25、当日含む）→ 1日あたり 100/6 ≈ 16.67個 × 0.5分 ≈ 8.33分
    const repType = makeRepetitionAssignment({
      id: 'rep',
      totalItems: 100,
      completedItems: 0,
      estimatedMinutesPerItem: 0.5,
      deadline: '2026-07-25',
    })
    const result = scheduleForDay('2026-07-20', [pageType, repType], settings)

    const pageAlloc = result.allocations.find((a) => a.assignmentId === 'page')!
    const repAlloc = result.allocations.find((a) => a.assignmentId === 'rep')!

    // pageは集中配分により残り時間50分をまるごと得る
    expect(pageAlloc.allocatedMinutes).toBeCloseTo(50)
    // repは頻度計算による固定枠（約8.33分）
    expect(repAlloc.allocatedMinutes).toBeCloseTo((100 / 6) * 0.5)

    const total = result.allocations.reduce((s, a) => s + a.allocatedMinutes, 0)
    // 合計はcapacity（100分）を超えない
    expect(total).toBeLessThanOrEqual(100)
  })

  it('頻度指定つき反復型は、実施日でなければ完全に除外され、他の宿題にcapacityが回る', () => {
    const settings = makeUserSettings({
      weekdayStudyMinutes: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    })
    // frequencyDays=2、createdAt=7/20 なので、7/21（1日後）は実施日ではない
    const rep = makeRepetitionAssignment({
      id: 'rep',
      createdAt: '2026-07-20',
      frequencyDays: 2,
      totalItems: 100,
      estimatedMinutesPerItem: 0.5,
      deadline: '2026-08-31',
    })
    const page = makePageAssignment({
      id: 'page',
      totalPages: 10,
      currentPage: 0,
      estimatedMinutesPerPage: 5, // 残り50分
      deadline: '2026-08-31',
    })
    const result = scheduleForDay('2026-07-21', [rep, page], settings)

    // repは実施日でないため、そもそも対象から完全に除外され、allocations配列に登場しない
    const repAlloc = result.allocations.find((a) => a.assignmentId === 'rep')
    expect(repAlloc).toBeUndefined()

    // capacityがrepに使われない分、pageが通常通り配分される
    const pageAlloc = result.allocations.find((a) => a.assignmentId === 'page')!
    expect(pageAlloc.allocatedMinutes).toBeCloseTo(50)
  })

  it('頻度指定つき反復型は、実施日なら固定枠として先に確保され、集中配分の対象から独立する', () => {
    const settings = makeUserSettings({
      weekdayStudyMinutes: { 0: 20, 1: 20, 2: 20, 3: 20, 4: 20, 5: 20, 6: 20 },
    })
    // 20日間で1000単語を毎日3周 → 総必要量3000、20日間で1日150個 × 0.5分 = 75分
    // だがcapacityは20分しかないため、固定枠はcapacity上限（20分）でクリップされる
    const rep = makeRepetitionAssignment({
      id: 'rep',
      createdAt: '2026-07-20',
      deadline: '2026-08-08',
      totalItems: 1000,
      cycleCount: 3,
      frequencyDays: 1,
      estimatedMinutesPerItem: 0.5,
    })
    const result = scheduleForDay('2026-07-20', [rep], settings)

    const repAlloc = result.allocations.find((a) => a.assignmentId === 'rep')!
    // capacity上限でクリップされ、20分がまるごと確保される
    expect(repAlloc.allocatedMinutes).toBeCloseTo(20)
    expect(repAlloc.excludedByMinimum).toBe(false)
  })

  it('必要日数指定つきプロジェクト型は、予約された連続区間内で固定枠を確保する', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-08-31' },
      weekdayStudyMinutes: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    })
    const project = makeProjectAssignment({
      id: 'project',
      createdAt: '2026-07-20',
      deadline: '2026-07-30',
      estimatedTotalMinutes: 600,
      requiredDays: 3,
    })
    // 他に宿題がなければ、期間の最初の3日間のいずれかで固定枠が確保されるはず
    const result = scheduleForDay('2026-07-20', [project], settings)
    const projectAlloc = result.allocations.find((a) => a.assignmentId === 'project')

    // 予約区間に含まれていれば固定枠が確保される（他に宿題がないため専有＝capacity分）
    expect(projectAlloc).toBeDefined()
    expect(projectAlloc!.allocatedMinutes).toBeGreaterThan(0)
  })

  it('requiredDays未指定の創作・プロジェクト型は、従来通り通常の集中配分のみで扱われる', () => {
    const settings = makeUserSettings({
      weekdayStudyMinutes: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    })
    const project = makeProjectAssignment({
      id: 'project',
      estimatedTotalMinutes: 600,
      deadline: '2026-08-31',
      // requiredDaysを指定しない
    })
    const result = scheduleForDay('2026-07-20', [project], settings)
    const projectAlloc = result.allocations.find((a) => a.assignmentId === 'project')!
    // 通常の集中配分により、capacity分（100分）が配分される
    expect(projectAlloc.allocatedMinutes).toBeCloseTo(100)
  })
})
