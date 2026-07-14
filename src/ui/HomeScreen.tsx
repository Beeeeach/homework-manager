/**
 * ホーム画面（仕様書 16章）
 * 表示内容: 今日やる宿題、今日の予定時間、今日の残り時間、全体進捗
 * 最大ボタン: 「今日の勉強開始」→おすすめ順で宿題を表示
 * 順番変更は当日限りの一時的な並び替え（優先度計算へはフィードバックしない）
 */

import { useState } from 'react'
import type { Assignment, UserSettings } from '../domain'
import { getHomeScreenData } from '../engine/home-screen-data'
import type { TodayTaskView } from '../engine/home-screen-data'
import { RecordPanel } from './RecordPanel'

interface HomeScreenProps {
  date: string
  assignments: Assignment[]
  settings: UserSettings
}

export function HomeScreen({ date, assignments, settings }: HomeScreenProps) {
  const data = getHomeScreenData(date, assignments, settings)
  const [started, setStarted] = useState(false)
  // 当日限りの一時的な並び替え。優先度計算にはフィードバックしない（16章）
  const [order, setOrder] = useState<TodayTaskView[] | null>(null)

  const displayTasks = order ?? data.todayTasks

  function moveTask(index: number, direction: -1 | 1) {
    const base = order ?? data.todayTasks
    const next = [...base]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrder(next)
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">今日の状況</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-slate-800">
              {Math.round(data.totalPlannedMinutes)}
            </div>
            <div className="text-xs text-slate-400">予定時間(分)</div>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-800">
              {Math.round(data.remainingCapacityMinutes)}
            </div>
            <div className="text-xs text-slate-400">残り時間(分)</div>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-800">
              {Math.round(data.overallProgress * 100)}%
            </div>
            <div className="text-xs text-slate-400">全体進捗</div>
          </div>
        </div>
      </div>

      {!started && (
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="w-full rounded-xl bg-indigo-600 py-4 text-lg font-bold text-white shadow-sm"
        >
          今日の勉強開始
        </button>
      )}

      {started && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600">
            今日やる宿題（おすすめ順）
          </h2>
          {displayTasks.length === 0 && (
            <p className="rounded-md bg-slate-100 p-3 text-sm text-slate-500">
              今日やる宿題はありません。
            </p>
          )}
          {displayTasks.map((task, index) => (
            <div key={task.assignmentId} className="space-y-2">
              <div className="flex items-center justify-between rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">
                <span>
                  {task.subject} ・ 予定{Math.round(task.plannedMinutes)}分
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveTask(index, -1)}
                    className="rounded bg-white px-2 py-0.5"
                    aria-label="上に移動"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTask(index, 1)}
                    className="rounded bg-white px-2 py-0.5"
                    aria-label="下に移動"
                  >
                    ↓
                  </button>
                </div>
              </div>
              <RecordPanel
                taskId={task.assignmentId}
                assignmentId={task.assignmentId}
                taskTitle={task.title}
                unitLabel="単位"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
