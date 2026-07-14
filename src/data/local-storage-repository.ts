/**
 * AppRepositoryのlocalStorage実装。
 * MVPの初期永続化として採用。将来Supabase等に差し替える場合は
 * この実装を入れ替え、AppRepositoryインターフェースだけ満たせばよい。
 */

import type { AppRepository, AppSnapshot } from './repository'

const STORAGE_KEY = 'homework-manager:snapshot:v1'

export function createLocalStorageRepository(): AppRepository {
  return {
    async load() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        return JSON.parse(raw) as AppSnapshot
      } catch {
        // 壊れたデータや非対応環境では「データなし」として扱う
        return null
      }
    },

    async save(snapshot: AppSnapshot) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    },

    async clear() {
      window.localStorage.removeItem(STORAGE_KEY)
    },
  }
}
