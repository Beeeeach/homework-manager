/**
 * 設定変更ビュー（初回設定後に、期間・勉強可能時間・固定予定・特別予定・
 * 締切バッファを後からまとめて編集できるようにする画面）。
 * SetupWizardと違い、ウィザード形式ではなく1画面で全項目を編集できるようにする
 * （「ここだけ直したい」というニーズに対応するため）。
 */

import { useState } from 'react'
import type {
  DeadlineBufferSettings,
  RecurringSchedule,
  SpecialSchedule,
  UserSettings,
  Weekday,
  WeekdayStudyMinutes,
} from '../domain'

const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: '日',
  1: '月',
  2: '火',
  3: '水',
  4: '木',
  5: '金',
  6: '土',
}

const WEEKDAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0]

interface SettingsEditViewProps {
  settings: UserSettings
  onSave: (settings: UserSettings) => void
  onCancel: () => void
}

export function SettingsEditView({ settings, onSave, onCancel }: SettingsEditViewProps) {
  const [startDate, setStartDate] = useState(settings.vacationPeriod.startDate)
  const [endDate, setEndDate] = useState(settings.vacationPeriod.endDate)
  const [weekdayMinutes, setWeekdayMinutes] = useState<WeekdayStudyMinutes>(
    settings.weekdayStudyMinutes,
  )
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>(
    settings.recurringSchedules,
  )
  const [specialSchedules, setSpecialSchedules] = useState<SpecialSchedule[]>(
    settings.specialSchedules,
  )
  const [deadlineBuffer, setDeadlineBuffer] = useState<DeadlineBufferSettings>(
    settings.deadlineBuffer,
  )

  function addRecurring() {
    setRecurringSchedules((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: '', weekday: 1, durationMinutes: 60 },
    ])
  }

  function updateRecurring(id: string, patch: Partial<RecurringSchedule>) {
    setRecurringSchedules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function removeRecurring(id: string) {
    setRecurringSchedules((prev) => prev.filter((r) => r.id !== id))
  }

  function addSpecial() {
    setSpecialSchedules((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: '',
        startDate,
        endDate: startDate,
        durationMinutesPerDay: 999,
      },
    ])
  }

  function updateSpecial(id: string, patch: Partial<SpecialSchedule>) {
    setSpecialSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function removeSpecial(id: string) {
    setSpecialSchedules((prev) => prev.filter((s) => s.id !== id))
  }

  function handleSave() {
    onSave({
      vacationPeriod: { startDate, endDate },
      weekdayStudyMinutes: weekdayMinutes,
      recurringSchedules,
      specialSchedules,
      deadlineBuffer,
    })
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">① 長期休暇期間</h2>
        <div className="mt-3 flex gap-2">
          <label className="flex-1 text-xs text-slate-500">
            開始日
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="flex-1 text-xs text-slate-500">
            終了日
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">② 曜日ごとの勉強可能時間</h2>
        <div className="mt-3 space-y-2">
          {WEEKDAY_ORDER.map((wd) => (
            <div key={wd} className="flex items-center gap-2">
              <span className="w-6 text-sm text-slate-600">{WEEKDAY_LABELS[wd]}</span>
              <input
                type="number"
                value={weekdayMinutes[wd]}
                onChange={(e) =>
                  setWeekdayMinutes((prev) => ({ ...prev, [wd]: Number(e.target.value) }))
                }
                className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
              <span className="text-xs text-slate-400">分</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">③ 固定予定（部活・塾など）</h2>
        <div className="mt-3 space-y-3">
          {recurringSchedules.map((r) => (
            <div key={r.id} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="名称"
                value={r.title}
                onChange={(e) => updateRecurring(r.id, { title: e.target.value })}
                className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
              <select
                value={r.weekday}
                onChange={(e) =>
                  updateRecurring(r.id, { weekday: Number(e.target.value) as Weekday })
                }
                className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              >
                {WEEKDAY_ORDER.map((wd) => (
                  <option key={wd} value={wd}>
                    {WEEKDAY_LABELS[wd]}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={r.durationMinutes}
                onChange={(e) => updateRecurring(r.id, { durationMinutes: Number(e.target.value) })}
                className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => removeRecurring(r.id)}
                className="text-xs text-rose-500"
              >
                削除
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addRecurring}
            className="text-xs font-medium text-indigo-600"
          >
            + 固定予定を追加
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">④ 特別予定（旅行・帰省など）</h2>
        <div className="mt-3 space-y-3">
          {specialSchedules.map((s) => (
            <div key={s.id} className="space-y-1 rounded-md bg-slate-50 p-2">
              <input
                type="text"
                placeholder="名称"
                value={s.title}
                onChange={(e) => updateSpecial(s.id, { title: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={s.startDate}
                  onChange={(e) => updateSpecial(s.id, { startDate: e.target.value })}
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
                <input
                  type="date"
                  value={s.endDate}
                  onChange={(e) => updateSpecial(s.id, { endDate: e.target.value })}
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeSpecial(s.id)}
                className="text-xs text-rose-500"
              >
                削除
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSpecial}
            className="text-xs font-medium text-indigo-600"
          >
            + 特別予定を追加
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">⑤ 締切に対する余裕（バッファ）</h2>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setDeadlineBuffer((prev) => ({ ...prev, mode: 'fixed' }))}
            className={`flex-1 rounded-md py-2 text-xs font-medium ${
              deadlineBuffer.mode === 'fixed'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            固定日数
          </button>
          <button
            type="button"
            onClick={() => setDeadlineBuffer((prev) => ({ ...prev, mode: 'percentage' }))}
            className={`flex-1 rounded-md py-2 text-xs font-medium ${
              deadlineBuffer.mode === 'percentage'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            割合で指定
          </button>
        </div>

        {deadlineBuffer.mode === 'fixed' && (
          <label className="mt-3 block text-xs text-slate-500">
            何日前倒しで終わらせるか
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={deadlineBuffer.fixedDays}
                onChange={(e) =>
                  setDeadlineBuffer((prev) => ({ ...prev, fixedDays: Number(e.target.value) }))
                }
                className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
              <span className="text-xs text-slate-400">日前</span>
            </div>
          </label>
        )}

        {deadlineBuffer.mode === 'percentage' && (
          <label className="mt-3 block text-xs text-slate-500">
            残り日数のうち何%を余裕として残すか
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={90}
                value={Math.round(deadlineBuffer.percentage * 100)}
                onChange={(e) =>
                  setDeadlineBuffer((prev) => ({
                    ...prev,
                    percentage: Number(e.target.value) / 100,
                  }))
                }
                className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
              <span className="text-xs text-slate-400">%</span>
            </div>
          </label>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-md bg-slate-100 py-2 text-sm font-medium text-slate-600"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white"
        >
          保存する
        </button>
      </div>
    </div>
  )
}
