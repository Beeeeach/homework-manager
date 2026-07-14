import { useEffect, useRef, useState } from 'react'
import { SetupWizard } from './ui/SetupWizard'
import { AssignmentForm } from './ui/AssignmentForm'
import { HomeScreen } from './ui/HomeScreen'
import { useAppDataStore } from './store/app-data-store'
import { useStudySessionStore } from './store/study-session-store'
import { createLocalStorageRepository } from './data/local-storage-repository'
import { hydrateFromRepository, persistToRepository } from './data/persistence-coordinator'
import type { LearningRecordStore } from './engine/learning-store'

const TODAY = '2026-07-20'
const repository = createLocalStorageRepository()

function App() {
  const { settings, assignments, isSetupComplete, setSettings, addAssignment, completeSetup } =
    useAppDataStore()
  const sessions = useStudySessionStore((s) => s.sessions)
  const [settingsDone, setSettingsDone] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
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

  if (isSetupComplete && settings) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mb-4 text-center">
          <h1 className="text-xl font-bold text-slate-800">宿題マネージャー</h1>
        </div>
        <HomeScreen date={TODAY} assignments={assignments} settings={settings} />
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
