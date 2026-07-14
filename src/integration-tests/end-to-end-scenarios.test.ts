/**
 * 結合テスト（仕様書 20章5番）
 * 複数フェーズにまたがるシナリオを検証する：
 *   1. 宿題登録 → オーバーロード検出
 *   2. 登録された宿題群 → 複数日のスケジュール生成（優先度・日付重み・割当の連携）
 *   3. 記録 → リスケジュール発火 → 再配分
 *
 * ユニットテストでは個々の関数の正しさを検証済みなので、ここでは
 * 「関数同士が正しく連携し、一貫した結果になるか」に焦点を当てる。
 */

import { describe, it, expect } from 'vitest'
import { checkOverload } from '../engine/overload-check'
import { scheduleForDay } from '../engine/schedule-day'
import { executeReschedule } from '../engine/execute-reschedule'
import { getHomeScreenData } from '../engine/home-screen-data'
import {
  makePageAssignment,
  makeRepetitionAssignment,
  makeCreativeAssignment,
  makeUserSettings,
} from '../domain/test-factories'

describe('結合テスト: 宿題登録〜オーバーロード検出〜スケジュール生成', () => {
  it('現実的な夏休みシナリオ：複数タイプの宿題を登録し、一貫した結果を得る', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-08-31' },
      weekdayStudyMinutes: { 0: 90, 1: 60, 2: 120, 3: 60, 4: 60, 5: 60, 6: 90 },
    })

    const math = makePageAssignment({
      id: 'math',
      title: '数学ワーク',
      subject: '数学',
      totalPages: 40,
      currentPage: 10,
      estimatedMinutesPerPage: 4,
      deadline: '2026-08-31',
    })
    const english = makeRepetitionAssignment({
      id: 'english',
      title: '英単語',
      subject: '英語',
      totalItems: 200,
      completedItems: 50,
      estimatedMinutesPerItem: 0.5,
      deadline: '2026-08-31',
    })
    const essay = makeCreativeAssignment({
      id: 'essay',
      title: '読書感想文',
      subject: '国語',
      estimatedTotalMinutes: 600,
      deadline: '2026-08-20', // 早めの締切
    })

    const assignments = [math, english, essay]

    // ステップ1: 登録直後のオーバーロード検出（このペースなら収まるはず）
    const overload = checkOverload(assignments, '2026-07-20', settings)
    expect(overload.isOverloaded).toBe(false)

    // ステップ2: 初日のスケジュール生成。3件とも対象になり、合計がcapacityと一致する
    const daySchedule = scheduleForDay('2026-07-20', assignments, settings)
    const total = daySchedule.allocations.reduce((s, a) => s + a.allocatedMinutes, 0)
    expect(total).toBeCloseTo(daySchedule.capacityMinutes)

    // 締切が近いessayが最も高いスコアを持つはず
    const essayAlloc = daySchedule.allocations.find((a) => a.assignmentId === 'essay')!
    const mathAlloc = daySchedule.allocations.find((a) => a.assignmentId === 'math')!
    expect(essayAlloc.finalScore).toBeGreaterThan(mathAlloc.finalScore)

    // ステップ3: ホーム画面データも矛盾なく生成される
    const homeData = getHomeScreenData('2026-07-20', assignments, settings)
    expect(homeData.todayTasks.length).toBeGreaterThan(0)
    expect(homeData.todayTasks[0].assignmentId).toBe('essay') // おすすめ順トップ
  })

  it('オーバーロードシナリオ：短期間に大量の宿題を詰め込むと警告が出る', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-07-26' }, // 1週間のみ
      weekdayStudyMinutes: { 0: 30, 1: 30, 2: 30, 3: 30, 4: 30, 5: 30, 6: 30 },
    })
    // 1週間で210分しか使えないのに、大量のページ数を登録する
    const heavy = makePageAssignment({
      totalPages: 200,
      currentPage: 0,
      estimatedMinutesPerPage: 10, // 残り2000分
      deadline: '2026-07-26',
    })

    const overload = checkOverload([heavy], '2026-07-20', settings)
    expect(overload.isOverloaded).toBe(true)
    expect(overload.totalRemainingMinutes).toBeGreaterThan(overload.threshold)

    // オーバーロードでも登録・スケジュール生成自体はブロックされず継続できる
    const daySchedule = scheduleForDay('2026-07-20', [heavy], settings)
    expect(daySchedule.allocations[0].allocatedMinutes).toBeCloseTo(30) // その日のcapacity全部が割り当てられる
  })
})

describe('結合テスト: リスケジュール発火の連携', () => {
  it('通常ペースならリスケはlevel1（NearRange）で収まる', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-08-31' },
      weekdayStudyMinutes: { 0: 90, 1: 60, 2: 120, 3: 60, 4: 60, 5: 60, 6: 90 },
    })
    const math = makePageAssignment({
      totalPages: 40,
      currentPage: 20, // 半分終わった状態
      estimatedMinutesPerPage: 4,
      deadline: '2026-08-31',
    })

    const result = executeReschedule([math], '2026-07-25', settings)
    expect(result.level).toBe('level1_near')
    expect(result.trigger).toBe('reschedule_l1')
    expect(result.daySchedules.length).toBeGreaterThan(0)
  })

  it('大幅に遅れた場合はlevel3（全期間再計算）まで拡大する', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-07-27' }, // 8日間
      weekdayStudyMinutes: { 0: 20, 1: 20, 2: 20, 3: 20, 4: 20, 5: 20, 6: 20 },
    })
    // 8日間で160分しか使えないのに、大量の未完了作業が残っている状態を再現
    const behind = makePageAssignment({
      totalPages: 100,
      currentPage: 0, // 全く進んでいない
      estimatedMinutesPerPage: 10, // 残り1000分
      deadline: '2026-07-27',
    })

    const result = executeReschedule([behind], '2026-07-24', settings)
    expect(result.level).toBe('level3_full')
    expect(result.trigger).toBe('reschedule_l3')
    // 全期間（残り3〜4日）が対象になっているはず
    expect(result.daySchedules.length).toBeGreaterThan(0)
  })

  it('リスケ後のスケジュールも、各日の配分合計がcapacityを超えない', () => {
    const settings = makeUserSettings({
      vacationPeriod: { startDate: '2026-07-20', endDate: '2026-08-31' },
      weekdayStudyMinutes: { 0: 90, 1: 60, 2: 120, 3: 60, 4: 60, 5: 60, 6: 90 },
    })
    const a = makePageAssignment({
      id: 'a',
      totalPages: 40,
      currentPage: 5,
      estimatedMinutesPerPage: 4,
      deadline: '2026-08-10',
    })
    const b = makeRepetitionAssignment({
      id: 'b',
      totalItems: 150,
      completedItems: 30,
      estimatedMinutesPerItem: 0.5,
      deadline: '2026-08-15',
    })

    const result = executeReschedule([a, b], '2026-07-22', settings)

    for (const day of result.daySchedules) {
      const dayTotal = day.allocations.reduce((s, alloc) => s + alloc.allocatedMinutes, 0)
      expect(dayTotal).toBeLessThanOrEqual(day.capacityMinutes + 1e-9)
    }
  })
})

describe('結合テスト: 完了処理の伝播', () => {
  it('宿題が完了扱いになると、以降のスケジュール・オーバーロード検出から除外される', () => {
    const settings = makeUserSettings()
    const done = makePageAssignment({ id: 'done', isCompleted: true, totalPages: 100, currentPage: 0 })
    const active = makePageAssignment({ id: 'active', totalPages: 10, currentPage: 0 })

    const overload = checkOverload([done, active], '2026-07-20', settings)
    // doneは残り時間計算に含まれないので、activeの分のみが反映される
    expect(overload.totalRemainingMinutes).toBeLessThan(
      done.totalPages * done.estimatedMinutesPerPage,
    )

    const daySchedule = scheduleForDay('2026-07-20', [done, active], settings)
    expect(daySchedule.allocations.some((a) => a.assignmentId === 'done')).toBe(false)

    const homeData = getHomeScreenData('2026-07-20', [done, active], settings)
    expect(homeData.todayTasks.every((t) => t.assignmentId !== 'done')).toBe(true)
  })
})
