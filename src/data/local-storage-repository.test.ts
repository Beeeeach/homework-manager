import { describe, it, expect, beforeEach } from 'vitest'
import { createLocalStorageRepository } from './local-storage-repository'
import { createEmptySnapshot } from './repository'
import { makePageAssignment } from '../domain/test-factories'

describe('AppRepository (localStorage)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('保存前はloadがnullを返す', async () => {
    const repo = createLocalStorageRepository()
    expect(await repo.load()).toBeNull()
  })

  it('saveしたスナップショットをloadで復元できる', async () => {
    const repo = createLocalStorageRepository()
    const snapshot = {
      ...createEmptySnapshot(),
      assignments: [makePageAssignment({ title: '数学ワーク' })],
      isSetupComplete: true,
    }
    await repo.save(snapshot)
    const loaded = await repo.load()

    expect(loaded!.assignments[0].title).toBe('数学ワーク')
    expect(loaded!.isSetupComplete).toBe(true)
  })

  it('clearで保存内容が消える', async () => {
    const repo = createLocalStorageRepository()
    await repo.save({ ...createEmptySnapshot(), isSetupComplete: true })
    await repo.clear()
    expect(await repo.load()).toBeNull()
  })

  it('壊れたJSONが保存されていてもクラッシュせずnullを返す', async () => {
    window.localStorage.setItem('homework-manager:snapshot:v1', '{invalid json')
    const repo = createLocalStorageRepository()
    expect(await repo.load()).toBeNull()
  })
})
