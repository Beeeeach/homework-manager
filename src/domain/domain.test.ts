import { describe, it, expect } from 'vitest'
import {
  makePageAssignment,
  makeRepetitionAssignment,
  makeCreativeAssignment,
  makeProjectAssignment,
  makeTask,
  makeStudySession,
  makeUserSettings,
  resetIdCounter,
} from './test-factories'
import type { Assignment } from '.'

describe('domain models (setup sanity check)', () => {
  it('ページ型のAssignmentを生成できる', () => {
    const a = makePageAssignment({ totalPages: 40, currentPage: 10 })
    expect(a.type).toBe('page')
    expect(a.totalPages).toBe(40)
    expect(a.currentPage).toBe(10)
  })

  it('反復型のAssignmentを生成できる', () => {
    const a = makeRepetitionAssignment({ totalItems: 200 })
    expect(a.type).toBe('repetition')
    expect(a.totalItems).toBe(200)
  })

  it('創作型のAssignmentは工程比率の合計が1になる', () => {
    const a = makeCreativeAssignment()
    const sum = a.phases.reduce((s, p) => s + p.ratio, 0)
    expect(sum).toBeCloseTo(1.0)
  })

  it('プロジェクト型のAssignmentは工程比率の合計が1になる', () => {
    const a = makeProjectAssignment()
    const sum = a.phases.reduce((s, p) => s + p.ratio, 0)
    expect(sum).toBeCloseTo(1.0)
  })

  it('discriminated unionとしてtypeで判別できる', () => {
    resetIdCounter()
    const assignments: Assignment[] = [
      makePageAssignment(),
      makeRepetitionAssignment(),
    ]
    for (const a of assignments) {
      if (a.type === 'page') {
        expect(typeof a.totalPages).toBe('number')
      } else if (a.type === 'repetition') {
        expect(typeof a.totalItems).toBe('number')
      }
    }
  })

  it('Taskを生成できる', () => {
    const t = makeTask({ plannedMinutes: 30 })
    expect(t.plannedMinutes).toBe(30)
    expect(t.isCompleted).toBe(false)
  })

  it('StudySessionを生成できる', () => {
    const s = makeStudySession({ actualMinutes: 25 })
    expect(s.actualMinutes).toBe(25)
    expect(s.recordMethod).toBe('stopwatch')
  })

  it('UserSettingsのweekdayStudyMinutesが7曜日分ある', () => {
    const settings = makeUserSettings()
    const keys = Object.keys(settings.weekdayStudyMinutes)
    expect(keys.length).toBe(7)
  })
})
