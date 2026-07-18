/**
 * 宿題の詳細編集画面。
 * 「宿題追加」タブの一覧から宿題をクリックすると開く。
 *
 * 2つの機能を持つ:
 *   1. 内容編集: ページ数・締切・単位ラベルなどを後から修正できる
 *      （登録時に間違えた場合や、状況が変わった場合の修正用）
 *   2. 簡易記録: 「進んだ量」だけをその場で記録できる（時間の記録はしない）。
 *      休暇期間外や、予定にない日でも「ちょっと進めた」を記録したい場合のための、
 *      ストップウォッチ不要のシンプルな入力。
 */

import { useState } from 'react'
import type { Assignment } from '../domain'
import { getPageUnitLabel } from '../domain/assignment'

interface AssignmentDetailViewProps {
  assignment: Assignment
  onSave: (updated: Assignment) => void
  onRecordAmount: (assignmentId: string, amount: number, phaseId?: string) => void
  onDelete: (assignmentId: string) => void
  onClose: () => void
}

export function AssignmentDetailView({
  assignment,
  onSave,
  onRecordAmount,
  onDelete,
  onClose,
}: AssignmentDetailViewProps) {
  const [title, setTitle] = useState(assignment.title)
  const [subject, setSubject] = useState(assignment.subject)
  const [deadline, setDeadline] = useState(assignment.deadline)

  // page型用の編集state
  const [unitLabel, setUnitLabel] = useState(
    assignment.type === 'page' ? getPageUnitLabel(assignment) : '',
  )
  const [totalPages, setTotalPages] = useState(
    assignment.type === 'page' ? String(assignment.totalPages) : '',
  )
  const [currentPage, setCurrentPage] = useState(
    assignment.type === 'page' ? String(assignment.currentPage) : '',
  )
  const [minutesPerPage, setMinutesPerPage] = useState(
    assignment.type === 'page' ? String(assignment.estimatedMinutesPerPage) : '',
  )

  // repetition型用の編集state
  const [totalItems, setTotalItems] = useState(
    assignment.type === 'repetition' ? String(assignment.totalItems) : '',
  )
  const [completedItems, setCompletedItems] = useState(
    assignment.type === 'repetition' ? String(assignment.completedItems) : '',
  )

  // 簡易記録用の入力
  const [recordAmountInput, setRecordAmountInput] = useState('')
  const [selectedPhaseId, setSelectedPhaseId] = useState(
    assignment.type === 'creative' || assignment.type === 'project'
      ? assignment.phases.find((p) => !p.isCompleted)?.id
      : undefined,
  )

  function handleSaveContent() {
    if (!title.trim()) return

    const base = { ...assignment, title, subject, deadline }

    if (base.type === 'page') {
      onSave({
        ...base,
        totalPages: Number(totalPages) || base.totalPages,
        currentPage: Number(currentPage) || 0,
        estimatedMinutesPerPage: Number(minutesPerPage) || base.estimatedMinutesPerPage,
        unitLabel: unitLabel.trim() || 'ページ',
      })
      return
    }
    if (base.type === 'repetition') {
      onSave({
        ...base,
        totalItems: Number(totalItems) || base.totalItems,
        completedItems: Number(completedItems) || 0,
      })
      return
    }
    // creative/projectは締切・タイトル・教科のみ編集可能（工程構成の変更は非対応）
    onSave(base)
  }

  function handleRecord() {
    const amount = Number(recordAmountInput)
    if (!Number.isFinite(amount) || amount <= 0) return
    onRecordAmount(assignment.id, amount, selectedPhaseId)
    setRecordAmountInput('')
  }

  const recordUnitLabel =
    assignment.type === 'page'
      ? unitLabel || 'ページ'
      : assignment.type === 'repetition'
        ? '個'
        : '進捗（0〜1の割合）'

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">宿題の詳細</h2>
        <button type="button" onClick={onClose} className="text-xs text-slate-400 underline">
          一覧に戻る
        </button>
      </div>

      {/* 簡易記録セクション：時間の入力は不要、進んだ量だけを記録する */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-indigo-800">今日ここまで進んだ分を記録</h3>
        <p className="mt-1 text-xs text-indigo-600">
          予定日でなくても、進んだ分だけ記録できます（時間の記録は不要です）。
        </p>

        {(assignment.type === 'creative' || assignment.type === 'project') &&
          assignment.phases.length > 0 && (
            <label className="mt-2 block text-xs text-indigo-700">
              対象の工程
              <select
                value={selectedPhaseId}
                onChange={(e) => setSelectedPhaseId(e.target.value)}
                className="mt-1 w-full rounded-md border border-indigo-300 px-2 py-1 text-sm"
              >
                {assignment.phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.isCompleted ? '（完了済み）' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

        <div className="mt-2 flex items-end gap-2">
          <label className="flex-1 text-xs text-indigo-700">
            進んだ量（{recordUnitLabel}）
            <input
              type="number"
              step="any"
              value={recordAmountInput}
              onChange={(e) => setRecordAmountInput(e.target.value)}
              placeholder="0"
              className="mt-1 w-full rounded-md border border-indigo-300 px-2 py-1 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={handleRecord}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white"
          >
            記録する
          </button>
        </div>
      </div>

      {/* 内容編集セクション */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">内容を編集</h3>

        <div className="mt-2 flex gap-2">
          <label className="flex-1 text-xs text-slate-500">
            タイトル
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="flex-1 text-xs text-slate-500">
            教科
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
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

        {assignment.type === 'page' && (
          <div className="mt-2 space-y-2">
            <label className="block text-xs text-slate-500">
              数える単位
              <input
                type="text"
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
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
                value={minutesPerPage}
                onChange={(e) => setMinutesPerPage(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
          </div>
        )}

        {assignment.type === 'repetition' && (
          <div className="mt-2 flex gap-2">
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
              これまでの累積実施量
              <input
                type="number"
                value={completedItems}
                onChange={(e) => setCompletedItems(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
          </div>
        )}

        {(assignment.type === 'creative' || assignment.type === 'project') && (
          <p className="mt-2 text-xs text-slate-400">
            工程の構成（テーマ決定・下書き等）は編集できません。タイトル・教科・締切のみ変更可能です。
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleSaveContent}
            className="flex-1 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white"
          >
            保存する
          </button>
          <button
            type="button"
            onClick={() => onDelete(assignment.id)}
            className="rounded-md bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  )
}
