import { useEffect, useRef, useState } from 'react'
import { SetupWizard } from './ui/SetupWizard'
import { AssignmentForm } from './ui/AssignmentForm'
import { HomeScreen } from './ui/HomeScreen'
import { UpcomingView } from './ui/UpcomingView'
import { ProgressView } from './ui/ProgressView'
import { ResetConfirmView } from './ui/ResetConfirmView'
import { SettingsEditView } from './ui/SettingsEditView'
import { LoginScreen } from './ui/LoginScreen'
import { useAppDataStore } from './store/app-data-store'
import { useStudySessionStore } from './store/study-session-store'
import { createLocalStorageRepository } from './data/local-storage-repository'
import { createFirestoreRepository } from './data/firestore-repository'
import { hydrateFromRepository, persistToRepository } from './data/persistence-coordinator'
import type { LearningRecordStore } from './engine/learning-store'
import type { AppRepository } from './data/repository'
import { useAuth } from './auth/use-auth'

const TODAY = '2026-07-20'
const localRepository = createLocalStorageRepository()

type Tab = 'home' | 'upcoming' | 'progress' | 'add' | 'settings' | 'reset'

const TAB_LABELS: Record<Exclude<Tab, 'reset'>, string> = {
  home: '今日',
  upcoming: '予定',
  progress: '進捗',
  add: '宿題追加',
  settings: '設定',
}

function App() {
  const {
    settings,
    assignments,
    isSetupComplete,
    setSettings,
    updateSettings,
    addAssignment,
    deleteAssignment,
    completeSetup,
  } = useAppDataStore()
  const resetAllAppData = useAppDataStore((s) => s.resetAll)
  const resetAllSessions = useStudySessionStore((s) => s.resetAll)
  const sessions = useStudySessionStore((s) => s.sessions)
  const [settingsDone, setSettingsDone] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [skipLogin, setSkipLogin] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const learningStoreRef = useRef<LearningRecordStore>({})
  const repositoryRef = useRef<AppRepository>(localRepository)

  const { user, isAuthResolved, signInWithGoogle, signOut } = useAuth()

  // ログイン状態が確定したら、使うリポジトリを決めてデータを読み込む
  // （ログイン中はFirestore、未ログイン・スキップ時はlocalStorage）
  useEffect(() => {
    if (!isAuthResolved) return
    if (!user && !skipLogin) return // ログイン画面を表示中はまだ読み込まない

    repositoryRef.current = user ? createFirestoreRepository(user.uid) : localRepository
    setIsHydrated(false)
    hydrateFromRepository(repositoryRef.current).then((learningStore) => {
      learningStoreRef.current = learningStore
      setIsHydrated(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthResolved, user, skipLogin])

  // settings/assignments/isSetupComplete/sessionsが変わるたびに自動保存する
  useEffect(() => {
    if (!isHydrated) return
    persistToRepository(repositoryRef.current, learningStoreRef.current)
  }, [isHydrated, settings, assignments, isSetupComplete, sessions])

  async function handleSignIn() {
    setAuthError(null)
    try {
      await signInWithGoogle()
    } catch {
      setAuthError('ログインに失敗しました。もう一度お試しください。')
    }
  }

  // 認証状態の確認中
  if (!isAuthResolved) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        読み込み中...
      </div>
    )
  }

  // 未ログインかつスキップもしていない場合は、ログイン画面を表示する
  if (!user && !skipLogin) {
    return (
      <div>
        <LoginScreen onSignIn={handleSignIn} errorMessage={authError} />
        <div className="mx-auto -mt-2 max-w-sm px-6 pb-6 text-center">
          <button
            type="button"
            onClick={() => setSkipLogin(true)}
            className="text-xs text-slate-400 underline"
          >
            ログインせずにこの端末だけで使う
          </button>
        </div>
      </div>
    )
  }

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        読み込み中...
      </div>
    )
  }

  function handleResetConfirm() {
    resetAllAppData()
    resetAllSessions()
    learningStoreRef.current = {}
    repositoryRef.current.clear()
    setSettingsDone(false)
    setActiveTab('home')
  }

  async function handleSignOut() {
    await signOut()
    setSkipLogin(false)
    // ログアウト後はローカルの状態も一旦初期化しておく（次のログインで正しいデータに差し替わる）
    resetAllAppData()
    resetAllSessions()
  }

  if (isSetupComplete && settings) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mb-4 text-center">
          <h1 className="text-xl font-bold text-slate-800">宿題マネージャー</h1>
          {user && (
            <p className="mt-1 text-xs text-slate-400">
              {user.displayName ?? user.email} としてログイン中・
              <button type="button" onClick={handleSignOut} className="underline">
                ログアウト
              </button>
            </p>
          )}
          {!user && (
            <p className="mt-1 text-xs text-slate-400">
              この端末のみに保存中・
              <button type="button" onClick={() => setSkipLogin(false)} className="underline">
                ログインして同期する
              </button>
            </p>
          )}
        </div>

        <nav className="mx-auto mb-4 flex max-w-md flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {(Object.keys(TAB_LABELS) as Exclude<Tab, 'reset'>[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${
                activeTab === tab
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setActiveTab('reset')}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
              activeTab === 'reset' ? 'bg-white text-red-600 shadow-sm' : 'text-red-400'
            }`}
            aria-label="全データリセット"
          >
            削除
          </button>
        </nav>

        {activeTab === 'home' && (
          <HomeScreen date={TODAY} assignments={assignments} settings={settings} />
        )}
        {activeTab === 'upcoming' && (
          <UpcomingView date={TODAY} assignments={assignments} settings={settings} />
        )}
        {activeTab === 'progress' && (
          <ProgressView date={TODAY} assignments={assignments} />
        )}
        {activeTab === 'add' && (
          <AssignmentForm
            existingAssignments={assignments}
            settings={settings}
            currentDate={TODAY}
            onAdd={addAssignment}
            onDelete={deleteAssignment}
            onFinish={() => setActiveTab('home')}
            finishLabel="ホームに戻る"
          />
        )}
        {activeTab === 'settings' && (
          <SettingsEditView
            settings={settings}
            onSave={(next) => {
              updateSettings(next)
              setActiveTab('home')
            }}
            onCancel={() => setActiveTab('home')}
          />
        )}
        {activeTab === 'reset' && (
          <ResetConfirmView
            onConfirm={handleResetConfirm}
            onCancel={() => setActiveTab('home')}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mb-4 text-center">
        <h1 className="text-xl font-bold text-slate-800">宿題マネージャー</h1>
        <p className="mt-1 text-sm text-slate-500">初回設定（目標3分）</p>
      </div>
      {!settingsDone && (
        <SetupWizard
          onComplete={(s) => {
            setSettings(s)
            setSettingsDone(true)
          }}
        />
      )}
      {settingsDone && settings && (
        <AssignmentForm
          existingAssignments={assignments}
          settings={settings}
          currentDate={TODAY}
          onAdd={addAssignment}
          onDelete={deleteAssignment}
          onFinish={completeSetup}
        />
      )}
    </div>
  )
}

export default App
