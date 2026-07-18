/**
 * 宿題登録フォーム（仕様書 6章⑤、7章の4タイプテンプレート）
 * 登録のたびにオーバーロードチェック（9章）を実行し、警告があれば表示するが
 * 登録自体はブロックしない。
 *
 * 初回設定フロー以外（設定完了後のタブ）からも呼び出せるようにするため、
 * finishLabelで「登録を終える」ボタンの文言を切り替え可能にしている。
 *
 * 変更点:
 *   - ページ型の「単位」（ページ/章/問など）を自由入力できるようにした（unitLabel）
 *   - 1ページ当たり時間をプリセット選択ではなく数値の直接入力にした
 *   - 登録済みリストから宿題を削除できるようにした（即削除、確認なし）
 */

import { useState } from 'react'
import type { Assignment, Id } from '../domain'
import type { UserSettings } from '../domain'
import type { HomeworkType } from '../config/constants'
import { CREATIVE_TEMPLATE_PHASES, PROJECT_TEMPLATE_PHASES } from '../config/constants'
import { checkOverload } from '../engine/overload-check'
import {
  estimateCreativeTotalMinutes,
  estimateProjectTotalMinutes,
} from '../engine/estimate-total-minutes'
import { getPageUnitLabel } from '../domain/assignment'

interface AssignmentFormProps {
  existingAssignments: Assignment[]
  settings: UserSettings
  currentDate: string
  onAdd: (assignment: Assignment) => void
  onFinish: () => void
  /** 宿題を削除する。省略時は削除ボタンを表示しない */
  onDelete?: (assignmentId: Id) => void
  /** 宿題をクリックして詳細編集画面を開く。省略時は一覧はクリック不可 */
  onSelectAssignment?: (assignmentId: Id) => void
  /** 「登録を終える」ボタンの表示文言。省略時は「登録を終える」（初回設定フロー用のデフォルト） */
  finishLabel?: string
}

const TYPE_LABELS: Record<HomeworkType, string> = {
  page: 'ページ型（ワーク・問題集など）',
  repetition: '反復型（英単語・漢字など）',
  creative: '創作型（読書感想文・作文など）',
  project: 'プロジェクト型（自由研究など）',
}

function assignmentSummaryLabel(a: Assignment): string {
  if (a.type === 'page') {
    return `${a.title}（${getPageUnitLabel(a)}管理、締切${a.deadline}）`
  }
  return `${a.title}（${TYPE_LABELS[a.type]}、締切${a.deadline}）`
}

export function AssignmentForm({
  existingAssignments,
  settings,
  currentDate,
  onAdd,
  onFinish,
  onDelete,
  onSelectAssignment,
  finishLabel = '登録を終える',
}: AssignmentFormProps) {
  const [type, setType] = useState<HomeworkType>('page')
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [deadline, setDeadline] = useState(settings.vacationPeriod.endDate)

  // ページ型
  const [unitLabel, setUnitLabel] = useState('ページ')
  const [totalPages, setTotalPages] = useState('40')
  const [currentPage, setCurrentPage] = useState('0')
  const [minutesPerPage, setMinutesPerPage] = useState('4')

  // 反復型
  const [totalItems, setTotalItems] = useState('100')
  const [minutesPerItem, setMinutesPerItem] = useState('0.5')
  const [cycleCount, setCycleCount] = useState('1')
  const [frequencyDays, setFrequencyDays] = useState('1')

  // 創作型
  const [targetCharCount, setTargetCharCount] = useState('1200')
  const [creativeRequiredDays, setCreativeRequiredDays] = useState('')

  // プロジェクト型
  const [projectRequiredDays, setProjectRequiredDays] = useState('')

  const [warning, setWarning] = useState<string | null>(null)

  function buildAssignment(): Assignment {
    const base = {
      id: crypto.randomUUID(),
      title,
      subject,
      deadline,
      createdAt: currentDate,
      isCompleted: false,
    }

    if (type === 'page') {
      return {
        ...base,
        type: 'page',
        totalPages: Number(totalPages),
        currentPage: Number(currentPage),
        estimatedMinutesPerPage: Number(minutesPerPage),
        unitLabel: unitLabel.trim() || 'ページ',
      }
    }
    if (type === 'repetition') {
      return {
        ...base,
        type: 'repetition',
        totalItems: Number(totalItems),
        completedItems: 0,
        estimatedMinutesPerItem: Number(minutesPerItem),
        cycleCount: Number(cycleCount) || 1,
        frequencyDays: Number(frequencyDays) || 1,
      }
    }
    if (type === 'creative') {
      const charCount = Number(targetCharCount)
      const requiredDays = creativeRequiredDays ? Number(creativeRequiredDays) : undefined
      return {
        ...base,
        type: 'creative',
        targetCharCount: charCount,
        estimatedTotalMinutes: estimateCreativeTotalMinutes(charCount),
        isEstimateManual: false,
        phases: CREATIVE_TEMPLATE_PHASES.map((p) => ({
          id: crypto.randomUUID(),
          name: p.name,
          ratio: p.ratio,
          progressRatio: 0,
          isCompleted: false,
        })),
        ...(requiredDays ? { requiredDays } : {}),
      }
    }
    // project
    {
      const requiredDays = projectRequiredDays ? Number(projectRequiredDays) : undefined
      return {
        ...base,
        type: 'project',
        estimatedTotalMinutes: estimateProjectTotalMinutes(PROJECT_TEMPLATE_PHASES.length),
        isEstimateManual: false,
        phases: PROJECT_TEMPLATE_PHASES.map((p) => ({
          id: crypto.randomUUID(),
          name: p.name,
          ratio: p.ratio,
          progressRatio: 0,
          isCompleted: false,
        })),
        ...(requiredDays ? { requiredDays } : {}),
      }
    }
  }

  function handleAdd() {
    if (!title.trim()) return
    const assignment = buildAssignment()
    const updatedList = [...existingAssignments, assignment]

    const result = checkOverload(updatedList, currentDate, settings)
    setWarning(
      result.isOverloaded
        ? 'このペースだと終わらない可能性があります（登録は完了しています）'
        : null,
    )

    onAdd(assignment)
    setTitle('')
    setSubject('')
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700">⑤ 宿題を登録する</h2>

      <label className="mt-3 block text-xs text-slate-500">
        宿題タイプ
        <select
          value={type}
          onChange={(e) => setType(e.target.value as HomeworkType)}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        >
          {(Object.keys(TYPE_LABELS) as HomeworkType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-2 flex gap-2">
        <label className="flex-1 text-xs text-slate-500">
          タイトル
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 数学ワーク"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="flex-1 text-xs text-slate-500">
          教科
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="例: 数学"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </label>
      </div>

      <label className="mt-2 block text-xs text-slate-500">
        締切
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
      </label>

      {type === 'page' && (
        <div className="mt-2 space-y-2">
          <label className="block text-xs text-slate-500">
            数える単位（例: ページ、章、問、回）
            <input
              type="text"
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              placeholder="ページ"
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <label className="flex-1 text-xs text-slate-500">
              総{unitLabel || 'ページ'}数
              <input
                type="number"
                value={totalPages}
                onChange={(e) => setTotalPages(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="flex-1 text-xs text-slate-500">
              現在の{unitLabel || 'ページ'}
              <input
                type="number"
                value={currentPage}
                onChange={(e) => setCurrentPage(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
          </div>
          <label className="block text-xs text-slate-500">
            1{unitLabel || 'ページ'}あたりの予想時間（分）
            <input
              type="number"
              step="0.5"
              min="0"
              value={minutesPerPage}
              onChange={(e) => setMinutesPerPage(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
        </div>
      )}

      {type === 'repetition' && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <label className="flex-1 text-xs text-slate-500">
              総単語数（1周分）
              <input
                type="number"
                value={totalItems}
                onChange={(e) => setTotalItems(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="flex-1 text-xs text-slate-500">
              1個あたり時間（分）
              <input
                type="number"
                step="0.1"
                value={minutesPerItem}
                onChange={(e) => setMinutesPerItem(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <label className="flex-1 text-xs text-slate-500">
              何周したいか
              <input
                type="number"
                min="1"
                value={cycleCount}
                onChange={(e) => setCycleCount(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="flex-1 text-xs text-slate-500">
              何日に1回やるか
              <input
                type="number"
                min="1"
                value={frequencyDays}
                onChange={(e) => setFrequencyDays(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
          </div>
          <p className="text-xs text-slate-400">
            例: 1000単語を毎日（1日に1回）3周したい場合 →
            総単語数1000・何周3・何日に1回1 として登録すると、休みの期間から自動で1日あたりの量が計算されます。
          </p>
        </div>
      )}

      {type === 'creative' && (
        <div className="mt-2 space-y-2">
          <label className="block text-xs text-slate-500">
            目標文字数
            <input
              type="number"
              value={targetCharCount}
              onChange={(e) => setTargetCharCount(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
            <span className="mt-1 block text-xs text-slate-400">
              推定合計時間: 約{estimateCreativeTotalMinutes(Number(targetCharCount) || 0)}分（自動推定）
            </span>
          </label>
          <label className="block text-xs text-slate-500">
            必要日数（任意。空欄なら通常配分のみ）
            <input
              type="number"
              min="1"
              value={creativeRequiredDays}
              onChange={(e) => setCreativeRequiredDays(e.target.value)}
              placeholder="例: 5"
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
            <span className="mt-1 block text-xs text-slate-400">
              入力すると、できるだけ連続した日でその日数分を優先的に確保します。
            </span>
          </label>
        </div>
      )}

      {type === 'project' && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-slate-400">
            工程（テーマ決定・情報収集・実験・結果整理・考察・レポート）は自動生成されます。
            推定合計時間: 約{estimateProjectTotalMinutes(PROJECT_TEMPLATE_PHASES.length)}分（自動推定）
          </p>
          <label className="block text-xs text-slate-500">
            必要日数（任意。空欄なら通常配分のみ）
            <input
              type="number"
              min="1"
              value={projectRequiredDays}
              onChange={(e) => setProjectRequiredDays(e.target.value)}
              placeholder="例: 5"
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
            <span className="mt-1 block text-xs text-slate-400">
              入力すると、できるだけ連続した日でその日数分を優先的に確保します。
            </span>
          </label>
        </div>
      )}

      {warning && (
        <div className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-700">
          ⚠️ {warning}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleAdd}
          className="flex-1 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white"
        >
          この宿題を追加
        </button>
        <button
          type="button"
          onClick={onFinish}
          className="flex-1 rounded-md bg-slate-100 py-2 text-sm font-medium text-slate-600"
        >
          {finishLabel}
        </button>
      </div>

      {existingAssignments.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-slate-500">
          {existingAssignments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2">
              {onSelectAssignment ? (
                <button
                  type="button"
                  onClick={() => onSelectAssignment(a.id)}
                  className="text-left underline decoration-dotted underline-offset-2 hover:text-indigo-600"
                >
                  ・{assignmentSummaryLabel(a)}
                </button>
              ) : (
                <span>・{assignmentSummaryLabel(a)}</span>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(a.id)}
                  className="shrink-0 text-rose-500"
                  aria-label={`${a.title}を削除`}
                >
                  削除
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
