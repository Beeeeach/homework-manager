/**
 * Firebase初期化設定。
 * このファイルの値（apiKey等）はクライアント側で公開される前提の識別子であり、
 * 実際のアクセス制御はFirestoreのセキュリティルール側で行う。秘匿情報ではない。
 */
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyC5Vk_HPVOnQcBDABMldtvObKIQGIR9Rq0',
  authDomain: 'homework-manager-72e91.firebaseapp.com',
  projectId: 'homework-manager-72e91',
  storageBucket: 'homework-manager-72e91.firebasestorage.app',
  messagingSenderId: '361806067835',
  appId: '1:361806067835:web:df57c2b403b916eb224ade',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(firebaseApp)
