/**
 * ホーム画面（仕様書 16章）
 * 表示内容: 今日やる宿題、今日の予定時間、今日の残り時間、全体進捗
 * 最大ボタン: 「今日の勉強開始」→おすすめ順で宿題を表示
 * 順番変更は当日限りの一時的な並び替え（優先度計算へはフィードバックしない）
 *
 * 変更点:
 *   - 「今日の勉強開始」を押した時点のtodayTasksを、app-data-store（永続化される）の
 *     todaySnapshotとして保存するようにした。これにより、記録して残り時間が変化しても、
 *     またページの再読み込みやブラウザの再起動をまたいでも、その日のうちは同じ予定が
 *     保持される（翌日になれば persistence-coordinator が自動的に無効化する）。
 *   - 各カードに「今日Xページ中Yページ」の進捗バーを表示するようにした
 *   - 今日の目標（plannedAmount）を達成した宿題には達成バッジを表示するが、
 *     記録UI自体は残し、余分にやりたい場合も引き続き記録できるようにした
 */

import { useState } from 'react'
import type { Assignment, UserSettings } from '../domain'
import { getHomeScreenData } from '../engine/home-screen-data'
import type { TodayTaskView } from '../engine/home-screen-data'
import { RecordPanel } from './RecordPanel'
import { getPageUnitLabel } from '../domain/assignment'
import { useStudySessionStore } from '../store/study-session-store'
import { useAppDataStore } from '../store/app-data-store'
import { calculateTodayRecordedAmount } from '../engine/today-progress'
import { isWithinVacationPeriod } from '../engine/day-weight'

interface HomeScreenProps {
  date: string
  assignments: Assignment[]
  settings: UserSettings
}

/** 宿題タイプごとの、記録画面に表示する単位ラベル */
function getUnitLabel(assignment: Assignment | undefined): string {
  if (!assignment) return '単位'
  switch (assignment.type) {
    case 'page':
      // 宿題ごとにカスタマイズされた単位（例:「章」「問」）を使う。未指定なら「ページ」
      return getPageUnitLabel(assignment)
    case 'repetition':
      return '個'
    case 'creative':
    case 'project':
      return '進捗（0〜1の割合）'
  }
}

/** 創作型・プロジェクト型の場合、進捗を反映する対象工程（未完了の最初の工程）のIDを返す */
function getActivePhaseId(assignment: Assignment | undefined): string | undefined {
  if (!assignment) return undefined
  if (assignment.type !== 'creative' && assignment.type !== 'project') return undefined
  const activePhase = assignment.phases.find((p) => !p.isCompleted)
  return activePhase?.id
}

/** 今日の目標・実績量を、宿題タイプに応じた読みやすい表示文字列にする */
function formatAmount(amount: number, assignment: Assignment | undefined): string {
  if (assignment?.type === 'creative' || assignment?.type === 'project') {
    return `${Math.round(amount * 100)}%`
  }
  // ページ・項目は小数第1位までで丸めて表示（1ページ未満の端数も見えるように）
  return `${Math.round(amount * 10) / 10}`
}

/** creative/project型は割合(%)表示のため、量の後ろに単位ラベルを付けない */
function isPercentageType(assignment: Assignment | undefined): boolean {
  return assignment?.type === 'creative' || assignment?.type === 'project'
}

export function HomeScreen({ date, assignments, settings }: HomeScreenProps) {
  const isVacationActive = isWithinVacationPeriod(date, settings)

  if (!isVacationActive) {
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center shadow-sm">
          <h2 className="text-sm font-semibold text-amber-800">
            現在、長期休暇期間外です
          </h2>
          <p className="mt-2 text-xs text-amber-700">
            設定されている休暇期間: {settings.vacationPeriod.startDate} 〜{' '}
            {settings.vacationPeriod.endDate}
          </p>
          <p className="mt-1 text-xs text-amber-600">
            この期間の外では宿題の予定は組まれません。休暇期間は「設定」タブから変更できます。
          </p>
        </div>
      </div>
    )
  }

  return <HomeScreenContent date={date} assignments={assignments} settings={settings} />
}

function HomeScreenContent({ date, assignments, settings }: HomeScreenProps) {
  const data = getHomeScreenData(date, assignments, settings)
  const sessions = useStudySessionStore((s) => s.sessions)
  const todaySnapshot = useAppDataStore((s) => s.todaySnapshot)
  const setTodaySnapshot = useAppDataStore((s) => s.setTodaySnapshot)
  // 当日限りの一時的な並び替え。優先度計算にはフィードバックしない（16章）
  // （並び替えは永続化しない仕様のため、こちらはuseStateのままでよい）
  const [order, setOrder] = useState<TodayTaskView[] | null>(null)

  const started = todaySnapshot !== null && todaySnapshot.date === date

  function handleStart() {
    setTodaySnapshot({ date, tasks: data.todayTasks })
  }

  const baseTasks = started ? todaySnapshot.tasks : []
  const displayTasks = order ?? baseTasks

  function moveTask(index: number, direction: -1 | 1) {
    const base = order ?? baseTasks
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
          onClick={handleStart}
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
          {displayTasks.map((task, index) => {
            const assignment = assignments.find((a) => a.id === task.assignmentId)
            const goalAmount = task.plannedAmount
            const recordedAmount = calculateTodayRecordedAmount(
              sessions,
              task.assignmentId,
              date,
            )
            const isGoalReached = goalAmount !== undefined && recordedAmount >= goalAmount
            const progressPercent =
              goalAmount !== undefined && goalAmount > 0
                ? Math.min(100, Math.round((recordedAmount / goalAmount) * 100))
                : null

            return (
              <div key={task.assignmentId} className="space-y-2">
                <div className="flex items-center justify-between rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">
                  <span>
                    {task.subject} ・ 予定{Math.round(task.plannedMinutes)}分
                    {task.plannedAmount !== undefined && task.unitLabel && (
                      <>
                        {' '}
                        （約{Math.ceil(task.plannedAmount)}
                        {task.unitLabel}）
                      </>
                    )}
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

                {/* 今日の進捗バー：予定量に対する記録量の割合を表示する */}
                {goalAmount !== undefined && task.unitLabel && (
                  <div className="rounded-md bg-white px-3 py-2 shadow-sm">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        今日: {formatAmount(recordedAmount, assignment)}
                        {!isPercentageType(assignment) && task.unitLabel}
                        {' / '}
                        {formatAmount(goalAmount, assignment)}
                        {!isPercentageType(assignment) && task.unitLabel}
                      </span>
                      {isGoalReached && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                          今日の分は完了！
                        </span>
                      )}
                    </div>
                    {progressPercent !== null && (
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            isGoalReached ? 'bg-emerald-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                <RecordPanel
                  taskId={task.assignmentId}
                  assignmentId={task.assignmentId}
                  taskTitle={task.title}
                  unitLabel={getUnitLabel(assignment)}
                  phaseId={getActivePhaseId(assignment)}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
