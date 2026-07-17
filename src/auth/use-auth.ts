/**
 * Googleログインの状態管理とログイン/ログアウト処理を提供するフック。
 * ログインしていない場合はuser=nullとなり、呼び出し側（App.tsx）は
 * localStorageリポジトリにフォールバックする。
 */
import { useEffect, useState } from 'react'
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase-config'

interface UseAuthResult {
  user: User | null
  /** 認証状態の初期確認が完了したか（完了するまでローディング表示に使う） */
  isAuthResolved: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthResolved, setIsAuthResolved] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setIsAuthResolved(true)
    })
    return unsubscribe
  }, [])

  async function signInWithGoogle() {
    await signInWithPopup(auth, googleProvider)
  }

  async function signOut() {
    await firebaseSignOut(auth)
  }

  return { user, isAuthResolved, signInWithGoogle, signOut }
}
