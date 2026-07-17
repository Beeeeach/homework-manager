/**
 * ログイン画面。
 * Googleログインのみ対応。ログインすることでFirestoreに保存され、
 * 複数端末（スマホ・PC）で同じデータを見られるようになる。
 */

interface LoginScreenProps {
  onSignIn: () => void
  /** ログイン処理中にエラーが発生した場合のメッセージ */
  errorMessage?: string | null
}

export function LoginScreen({ onSignIn, errorMessage }: LoginScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">宿題マネージャー</h1>
        <p className="mt-2 text-sm text-slate-500">
          Googleアカウントでログインすると、スマホ・PCなど複数の端末で同じ宿題データを見られるようになります。
        </p>

        <button
          type="button"
          onClick={onSignIn}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
            />
            <path
              fill="#FF3D00"
              d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
            />
          </svg>
          Googleでログイン
        </button>

        {errorMessage && (
          <p className="mt-3 text-xs text-red-500">{errorMessage}</p>
        )}

        <p className="mt-4 text-xs text-slate-400">
          ログインせずに使うこともできますが、その場合はこの端末にのみデータが保存されます。
        </p>
        <p className="mt-1 text-xs text-slate-400">
          （ログインをスキップする場合はページをそのまま利用してください）
        </p>
      </div>
    </div>
  )
}
