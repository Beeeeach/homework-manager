import { describe, it, expect } from 'vitest'
import { createInMemoryRepository } from './in-memory-repository'
import { createEmptySnapshot } from './repository'
import { makePageAssignment, makeUserSettings } from '../domain/test-factories'

describe('AppRepository (in-memory)', () => {
  it('保存前はloadがnullを返す', async () => {
    const repo = createInMemoryRepository()
    expect(await repo.load()).toBeNull()
  })

  it('saveしたスナップショットをloadで復元できる', async () => {
    const repo = createInMemoryRepository()
    const snapshot = {
      ...createEmptySnapshot(),
      settings: makeUserSettings(),
      assignments: [makePageAssignment()],
      isSetupComplete: true,
    }
    await repo.save(snapshot)
    const loaded = await repo.load()

    expect(loaded).not.toBeNull()
    expect(loaded!.isSetupComplete).toBe(true)
    expect(loaded!.assignments).toHaveLength(1)
  })

  it('clearで保存内容が消える', async () => {
    const repo = createInMemoryRepository()
    await repo.save({ ...createEmptySnapshot(), isSetupComplete: true })
    await repo.clear()
    expect(await repo.load()).toBeNull()
  })
})
