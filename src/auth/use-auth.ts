/**
 * Googleログインの状態管理とログイン/ログアウト処理を提供するフック。
 * ログインしていない場合はuser=nullとなり、呼び出し側（App.tsx）は
 * localStorageリポジトリにフォールバックする。
 *
 * 変更点: signInWithPopupではなくsignInWithRedirectを使うようにした。
 * signInWithPopupは、ポップアップブロックやプライベートブラウジング、
 * ストレージがパーティショニングされたブラウザ環境で
 * 「Unable to process request due to missing initial state」のような
 * エラーを起こしやすく安定しない。signInWithRedirectはページ全体を
 * Googleのログイン画面へ遷移させる方式のため、そうした制約の影響を受けにくい。
 */
import { useEffect, useState } from 'react'
import {
  signInWithRedirect,
  getRedirectResult,
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
  /** リダイレクトログインの結果処理でエラーが起きた場合のメッセージ */
  redirectError: string | null
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthResolved, setIsAuthResolved] = useState(false)
  const [redirectError, setRedirectError] = useState<string | null>(null)

  useEffect(() => {
    // signInWithRedirectでGoogleログイン画面から戻ってきた際、
    // その結果を一度だけ受け取る（成功時はonAuthStateChangedでもuserが反映される）
    getRedirectResult(auth).catch(() => {
      setRedirectError('ログインに失敗しました。ブラウザの設定（プライベートモードやCookieのブロックなど）をご確認のうえ、もう一度お試しください。')
    })

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setIsAuthResolved(true)
    })
    return unsubscribe
  }, [])

  async function signInWithGoogle() {
    setRedirectError(null)
    await signInWithRedirect(auth, googleProvider)
  }

  async function signOut() {
    await firebaseSignOut(auth)
  }

  return { user, isAuthResolved, signInWithGoogle, signOut, redirectError }
}
