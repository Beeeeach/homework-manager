/**
 * 記録機能（仕様書 13章）のUI。
 * ストップウォッチ方式を基本とし、手入力にも対応する。
 * 途中終了でも保存される。
 *
 * 記録と同時に、Assignment本体の進捗（currentPage等）にも反映する（recordProgress）。
 * これをしないと、記録は学習履歴として残るだけで、進捗表示や翌日以降の
 * スケジュールに一切反映されないというバグになる。
 */

import { useEffect, useState } from 'react'
import { useStudySessionStore } from '../store/study-session-store'
import { useAppDataStore } from '../store/app-data-store'
import type { Id } from '../domain'

interface RecordPanelProps {
  taskId: Id
  assignmentId: Id
  taskTitle: string
  /** 単位のラベル（例: "ページ", "個", "%"） */
  unitLabel: string
  /** 創作型・プロジェクト型の場合、進捗を反映する対象工程のID。ページ型・反復型では不要 */
  phaseId?: Id
  onRecorded?: () => void
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function RecordPanel({
  taskId,
  assignmentId,
  taskTitle,
  unitLabel,
  phaseId,
  onRecorded,
}: RecordPanelProps) {
  const running = useStudySessionStore((s) => s.running)
  const startStopwatch = useStudySessionStore((s) => s.startStopwatch)
  const stopStopwatch = useStudySessionStore((s) => s.stopStopwatch)
  const addManualSession = useStudySessionStore((s) => s.addManualSession)
  const recordProgress = useAppDataStore((s) => s.recordProgress)

  const [elapsedMs, setElapsedMs] = useState(0)
  const [mode, setMode] = useState<'stopwatch' | 'manual'>('stopwatch')
  const [amountInput, setAmountInput] = useState('')
  const [manualMinutes, setManualMinutes] = useState('')

  const isRunningThisTask = running?.taskId === taskId

  useEffect(() => {
    if (!isRunningThisTask || !running) return
    const startedMs = new Date(running.startedAt).getTime()
    const tick = () => setElapsedMs(Date.now() - startedMs)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isRunningThisTask, running])

  function handleStart() {
    startStopwatch(taskId, assignmentId)
  }

  function handleStop() {
    const amount = Number(amountInput)
    if (!Number.isFinite(amount) || amount < 0) return
    stopStopwatch(amount)
    // ストップウォッチの経過時間（分）を実測値としてEMA更新に使う
    const actualMinutes = elapsedMs / 60000
    recordProgress(assignmentId, { amount, phaseId, actualMinutes })
    setAmountInput('')
    onRecorded?.()
  }

  function handleManualSubmit() {
    const amount = Number(amountInput)
    const minutes = Number(manualMinutes)
    if (!Number.isFinite(amount) || amount < 0) return
    if (!Number.isFinite(minutes) || minutes <= 0) return
    addManualSession({ taskId, assignmentId, actualAmount: amount, actualMinutes: minutes })
    recordProgress(assignmentId, { amount, phaseId, actualMinutes: minutes })
    setAmountInput('')
    setManualMinutes('')
    onRecorded?.()
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700">{taskTitle}</h3>

      <div className="mt-3 flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode('stopwatch')}
          className={`rounded-full px-3 py-1 ${
            mode === 'stopwatch'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          ストップウォッチ
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`rounded-full px-3 py-1 ${
            mode === 'manual' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          手入力
        </button>
      </div>

      {mode === 'stopwatch' && (
        <div className="mt-4">
          {isRunningThisTask ? (
            <>
              <div className="text-3xl font-mono font-bold text-slate-800 tabular-nums">
                {formatElapsed(elapsedMs)}
              </div>
              <div className="mt-3 flex items-end gap-2">
                <label className="flex-1 text-xs text-slate-500">
                  進んだ量（{unitLabel}）
                  <input
                    type="number"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    placeholder="0"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleStop}
                  className="rounded-md bg-rose-500 px-4 py-1.5 text-sm font-medium text-white"
                >
                  終了して保存
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
            >
              勉強を開始する
            </button>
          )}
        </div>
      )}

      {mode === 'manual' && (
        <div className="mt-4 flex items-end gap-2">
          <label className="flex-1 text-xs text-slate-500">
            進んだ量（{unitLabel}）
            <input
              type="number"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              placeholder="0"
            />
          </label>
          <label className="flex-1 text-xs text-slate-500">
            かかった時間（分）
            <input
              type="number"
              value={manualMinutes}
              onChange={(e) => setManualMinutes(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              placeholder="0"
            />
          </label>
          <button
            type="button"
            onClick={handleManualSubmit}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white"
          >
            記録する
          </button>
        </div>
      )}
    </div>
  )
}
