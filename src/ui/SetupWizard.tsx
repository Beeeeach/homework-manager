/**
 * 初回設定ウィザード（仕様書 6章 ①〜④、および締切バッファ設定を追加）
 * 目標時間3分以内で完了できることを意識し、入力項目を最小限に絞る。
 *
 * 変更点:
 *   - ②曜日ごとの勉強可能時間に「全曜日へ一括適用」入力欄を追加
 *   - ③固定予定に「平日」「週末」ワンタップ追加ボタンを追加
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
import { DEFAULT_DEADLINE_BUFFER, DEFAULT_MAX_MINUTES_PER_ASSIGNMENT_PER_DAY } from '../domain/settings'
import { getTodayDateString, addDays } from '../engine/date-utils'

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
const WEEKDAYS_ONLY: Weekday[] = [1, 2, 3, 4, 5]
const WEEKEND_ONLY: Weekday[] = [6, 0]

interface SetupWizardProps {
  onComplete: (settings: UserSettings) => void
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1)

  // デフォルトの休暇期間は「今日から40日間」とする（固定日付にすると、実際の日付が
  // それより後になった場合に「休暇期間外」扱いになってしまうため、必ず動的に計算する）
  const today = getTodayDateString()
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(addDays(today, 40))

  const [weekdayMinutes, setWeekdayMinutes] = useState<WeekdayStudyMinutes>({
    0: 60,
    1: 60,
    2: 60,
    3: 60,
    4: 60,
    5: 60,
    6: 60,
  })
  const [bulkMinutes, setBulkMinutes] = useState('60')

  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>([])
  const [specialSchedules, setSpecialSchedules] = useState<SpecialSchedule[]>([])
  const [deadlineBuffer, setDeadlineBuffer] = useState<DeadlineBufferSettings>(
    DEFAULT_DEADLINE_BUFFER,
  )
  const [maxMinutesPerAssignment, setMaxMinutesPerAssignment] = useState(
    String(DEFAULT_MAX_MINUTES_PER_ASSIGNMENT_PER_DAY),
  )

  function applyBulkMinutes() {
    const value = Number(bulkMinutes)
    if (!Number.isFinite(value) || value < 0) return
    setWeekdayMinutes({ 0: value, 1: value, 2: value, 3: value, 4: value, 5: value, 6: value })
  }

  function addRecurring() {
    setRecurringSchedules((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: '', weekday: 1, durationMinutes: 60 },
    ])
  }

  /** 平日（月〜金）または週末（土日）ぶんの固定予定を、同じ名称・時間で一括追加する */
  function addRecurringForGroup(weekdays: Weekday[]) {
    const title = weekdays === WEEKDAYS_ONLY ? '固定予定（平日）' : '固定予定（週末）'
    setRecurringSchedules((prev) => [
      ...prev,
      ...weekdays.map((wd) => ({
        id: crypto.randomUUID(),
        title,
        weekday: wd,
        durationMinutes: 60,
      })),
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
      deadlineBuffer,
      maxMinutesPerAssignmentPerDay: Number(maxMinutesPerAssignment) || undefined,
    })
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center gap-1 text-xs text-slate-400">
        {[1, 2, 3, 4, 5].map((n) => (
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

          <div className="mt-3 flex items-end gap-2 rounded-md bg-slate-50 p-2">
            <label className="flex-1 text-xs text-slate-500">
              全曜日に一括で適用
              <input
                type="number"
                value={bulkMinutes}
                onChange={(e) => setBulkMinutes(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={applyBulkMinutes}
              className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              一括適用
            </button>
          </div>

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

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => addRecurringForGroup(WEEKDAYS_ONLY)}
              className="flex-1 rounded-md bg-slate-100 py-2 text-xs font-medium text-slate-700"
            >
              + 平日（月〜金）に追加
            </button>
            <button
              type="button"
              onClick={() => addRecurringForGroup(WEEKEND_ONLY)}
              className="flex-1 rounded-md bg-slate-100 py-2 text-xs font-medium text-slate-700"
            >
              + 週末（土日）に追加
            </button>
          </div>

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
              + 固定予定を1件追加
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
              onClick={() => setStep(5)}
              className="flex-1 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">⑤ 締切に対する余裕（バッファ）</h2>
          <p className="mt-1 text-xs text-slate-400">
            締切ぎりぎりではなく、少し早めに終わるようにスケジュールを組みます。
          </p>

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
                    setDeadlineBuffer((prev) => ({
                      ...prev,
                      fixedDays: Number(e.target.value),
                    }))
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

          <label className="mt-4 block text-xs text-slate-500">
            1つの宿題に使う時間の上限（1日あたり・分）
            <input
              type="number"
              min={1}
              value={maxMinutesPerAssignment}
              onChange={(e) => setMaxMinutesPerAssignment(e.target.value)}
              className="mt-1 w-32 rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
            <span className="mt-1 block text-xs text-slate-400">
              同じ宿題ばかりに1日中偏らないようにするための上限です。
            </span>
          </label>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setStep(4)}
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
