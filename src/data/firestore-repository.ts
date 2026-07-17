/**
 * AppRepositoryのFirestore実装。
 * ユーザー1人につき1ドキュメント（users/{uid}）にAppSnapshotを丸ごと保存する。
 * localStorage実装と同じインターフェース（load/save/clear）に準拠しているため、
 * 呼び出し側（persistence-coordinator.ts）はどちらの実装かを意識しない。
 *
 * オフライン時の方針: Firestoreの標準のオフラインキャッシュ機構は使わず、
 * 明示的にオフライン時は読み込み専用として扱う（saveはネットワークエラーで失敗しうる）。
 * これは意図的なシンプルさの選択であり、呼び出し側で保存失敗時のハンドリングが必要。
 */

import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase-config'
import type { AppRepository, AppSnapshot } from './repository'

const COLLECTION_NAME = 'users'

export function createFirestoreRepository(uid: string): AppRepository {
  const docRef = doc(db, COLLECTION_NAME, uid)

  return {
    async load() {
      try {
        const snapshot = await getDoc(docRef)
        if (!snapshot.exists()) return null
        return snapshot.data() as AppSnapshot
      } catch {
        // オフライン時やネットワークエラー時は「データなし」として扱う
        // （呼び出し側でエラーを吸収し、読み込み専用扱いにする想定）
        return null
      }
    },

    async save(snapshot: AppSnapshot) {
      await setDoc(docRef, snapshot)
    },

    async clear() {
      await deleteDoc(docRef)
    },
  }
}
