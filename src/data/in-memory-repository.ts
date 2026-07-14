/**
 * AppRepositoryのインメモリ実装。テスト専用。
 * localStorageに依存せず、ストア層のロジックだけを検証したい場合に使う。
 */

import type { AppRepository, AppSnapshot } from './repository'

export function createInMemoryRepository(): AppRepository {
  let stored: AppSnapshot | null = null

  return {
    async load() {
      return stored
    },
    async save(snapshot: AppSnapshot) {
      stored = snapshot
    },
    async clear() {
      stored = null
    },
  }
}
