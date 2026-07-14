/**
 * 初回設定ウィザード（仕様書 6章 ①〜④）
 * 目標時間3分以内で完了できることを意識し、入力項目を最小限に絞る。
 */

import { useState } from 'react'
import type {
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

interface SetupWizardProps {
  onComplete: (settings: UserSettings) => void
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1)

  const [startDate, setStartDate] = useState('2026-07-20')
  const [endDate, setEndDate] = useState('2026-08-31')

  const [weekdayMinutes, setWeekdayMinutes] = useState<WeekdayStudyMinutes>({
    0: 60,
    1: 60,
    2: 60,
    3: 60,
    4: 60,
    5: 60,
    6: 60,
  })

  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>([])
  const [specialSchedules, setSpecialSchedules] = useState<SpecialSchedule[]>([])

  function addRecurring() {
    setRecurringSchedules((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: '', weekday: 1, durationMinutes: 60 },
    ])
  }

  function updateRecurring(id: string, patch: Partial<RecurringSchedule>) {
    setRecurringSchedules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    )
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
    setSpecialSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    )
  }

  function removeSpecial(id: string) {
    setSpecialSchedules((prev) => prev.filter((s) => s.id !== id))
  }

  function handleFinish() {
    onComplete({
      vacationPeriod: { startDate, endDate },
      weekdayStudyMinutes: weekdayMinutes,
      recurringSchedules,
      specialSchedules,
    })
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center gap-1 text-xs text-slate-400">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full ${
              n <= step ? 'bg-indigo-500' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {step === 1 && (
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
          <button
            type="button"
            onClick={() => setStep(2)}
            className="mt-4 w-full rounded-md bg-indigo-600 py-2 text-sm font-medium text-white"
          >
            次へ
          </button>
        </div>
      )}

      {step === 2 && (
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
                    setWeekdayMinutes((prev) => ({
                      ...prev,
                      [wd]: Number(e.target.value),
                    }))
                  }
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
                <span className="text-xs text-slate-400">分</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-md bg-slate-100 py-2 text-sm font-medium text-slate-600"
            >
              戻る
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
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
                  onChange={(e) =>
                    updateRecurring(r.id, { durationMinutes: Number(e.target.value) })
                  }
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
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-md bg-slate-100 py-2 text-sm font-medium text-slate-600"
            >
              戻る
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex-1 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
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
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 rounded-md bg-slate-100 py-2 text-sm font-medium text-slate-600"
            >
              戻る
            </button>
            <button
              type="button"
              onClick={handleFinish}
              className="flex-1 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white"
            >
              宿題の登録へ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
