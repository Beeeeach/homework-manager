import { useEffect, useRef, useState } from 'react'
import { SetupWizard } from './ui/SetupWizard'
import { AssignmentForm } from './ui/AssignmentForm'
import { HomeScreen } from './ui/HomeScreen'
import { UpcomingView } from './ui/UpcomingView'
import { ProgressView } from './ui/ProgressView'
import { ResetConfirmView } from './ui/ResetConfirmView'
import { useAppDataStore } from './store/app-data-store'
import { useStudySessionStore } from './store/study-session-store'
import { createLocalStorageRepository } from './data/local-storage-repository'
import { hydrateFromRepository, persistToRepository } from './data/persistence-coordinator'
import type { LearningRecordStore } from './engine/learning-store'

const TODAY = '2026-07-20'
const repository = createLocalStorageRepository()

type Tab = 'home' | 'upcoming' | 'progress' | 'add' | 'reset'

const TAB_LABELS: Record<Exclude<Tab, 'reset'>, string> = {
  home: '今日',
  upcoming: '予定',
  progress: '進捗',
  add: '宿題追加',
}

function App() {
  const { settings, assignments, isSetupComplete, setSettings, addAssignment, completeSetup } =
    useAppDataStore()
  const resetAllAppData = useAppDataStore((s) => s.resetAll)
  const resetAllSessions = useStudySessionStore((s) => s.resetAll)
  const sessions = useStudySessionStore((s) => s.sessions)
  const [settingsDone, setSettingsDone] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const learningStoreRef = useRef<LearningRecordStore>({})

  // 起動時に一度だけ、保存済みデータを読み込む
  useEffect(() => {
    hydrateFromRepository(repository).then((learningStore) => {
      learningStoreRef.current = learningStore
      setIsHydrated(true)
    })
  }, [])

  // settings/assignments/isSetupComplete/sessionsが変わるたびに自動保存する
  useEffect(() => {
    if (!isHydrated) return
    persistToRepository(repository, learningStoreRef.current)
  }, [isHydrated, settings, assignments, isSetupComplete, sessions])

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
    repository.clear()
    setSettingsDone(false)
    setActiveTab('home')
  }

  if (isSetupComplete && settings) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mb-4 text-center">
          <h1 className="text-xl font-bold text-slate-800">宿題マネージャー</h1>
        </div>

        <nav className="mx-auto mb-4 flex max-w-md gap-1 rounded-xl bg-slate-100 p-1">
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
            onFinish={() => setActiveTab('home')}
            finishLabel="ホームに戻る"
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
          onFinish={completeSetup}
        />
      )}
    </div>
  )
}

export default App
