import { describe, it, expect } from 'vitest'
import { getHomeScreenData } from './home-screen-data'
import { makePageAssignment, makeUserSettings } from '../domain/test-factories'

describe('getHomeScreenData', () => {
  it('今日やる宿題がスコアの高い順（おすすめ順）に並ぶ（1宿題あたりの1日上限を超えない）', () => {
    const settings = makeUserSettings({
      weekdayStudyMinutes: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 },
    })
    const urgent = makePageAssignment({
      id: 'urgent',
      title: '締切間近',
      totalPages: 10,
      currentPage: 0,
      estimatedMinutesPerPage: 10,
      deadline: '2026-07-21',
    })
    const relaxed = makePageAssignment({
      id: 'relaxed',
      title: '余裕あり',
      totalPages: 10,
      currentPage: 0,
      estimatedMinutesPerPage: 10,
      deadline: '2026-08-31',
    })
    const data = getHomeScreenData('2026-07-20', [urgent, relaxed], settings)
    expect(data.todayTasks[0].assignmentId).toBe('urgent')
    // urgentは1宿題あたりの1日上限（デフォルト90分）で頭打ちになり、
    // 余った10分がrelaxedに回るため、合計はcapacity100分ちょうどになる
    expect(data.totalPlannedMinutes).toBeCloseTo(100)
    expect(data.remainingCapacityMinutes).toBeCloseTo(0)
  })

  it('全宿題完了なら進捗は1', () => {
    const settings = makeUserSettings()
    const a = makePageAssignment({ isCompleted: true })
    const data = getHomeScreenData('2026-07-20', [a], settings)
    expect(data.overallProgress).toBe(1)
  })

  it('宿題がなければ今日のタスクは空', () => {
    const settings = makeUserSettings()
    const data = getHomeScreenData('2026-07-20', [], settings)
    expect(data.todayTasks).toEqual([])
    expect(data.overallProgress).toBe(0)
  })
})
