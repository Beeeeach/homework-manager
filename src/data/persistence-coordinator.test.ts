import { describe, it, expect, beforeEach } from 'vitest'
import { hydrateFromRepository, persistToRepository } from './persistence-coordinator'
import { createInMemoryRepository } from './in-memory-repository'
import { useAppDataStore } from '../store/app-data-store'
import { useStudySessionStore } from '../store/study-session-store'
import { makePageAssignment, makeUserSettings, makeStudySession } from '../domain/test-factories'

describe('persistence-coordinator', () => {
  beforeEach(() => {
    // 各ストアを初期状態にリセットしてからテストする
    useAppDataStore.setState({ settings: null, assignments: [], isSetupComplete: false })
    useStudySessionStore.setState({ sessions: [], running: null })
  })

  it('保存→読込の往復でストアの状態が復元される', async () => {
    const repo = createInMemoryRepository()

    const settings = makeUserSettings()
    const assignment = makePageAssignment({ title: '数学ワーク' })
    const session = makeStudySession()

    useAppDataStore.setState({ settings, assignments: [assignment], isSetupComplete: true })
    useStudySessionStore.setState({ sessions: [session], running: null })

    await persistToRepository(repo, { 'page::数学': { homeworkType: 'page', subject: '数学', currentEstimate: 5, sampleCount: 3 } })

    // ストアをクリアしてから復元する
    useAppDataStore.setState({ settings: null, assignments: [], isSetupComplete: false })
    useStudySessionStore.setState({ sessions: [], running: null })

    const learningStore = await hydrateFromRepository(repo)

    expect(useAppDataStore.getState().assignments[0].title).toBe('数学ワーク')
    expect(useAppDataStore.getState().isSetupComplete).toBe(true)
    expect(useStudySessionStore.getState().sessions).toHaveLength(1)
    expect(learningStore['page::数学'].currentEstimate).toBe(5)
  })

  it('保存データがない場合は空のスナップショットで初期化される', async () => {
    const repo = createInMemoryRepository()
    const learningStore = await hydrateFromRepository(repo)

    expect(useAppDataStore.getState().settings).toBeNull()
    expect(useAppDataStore.getState().isSetupComplete).toBe(false)
    expect(learningStore).toEqual({})
  })
})
