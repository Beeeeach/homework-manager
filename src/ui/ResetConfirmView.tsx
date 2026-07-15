/**
 * 全データリセットの確認画面。
 * 誤操作防止のため「削除」という文字列を入力させ、一致した場合のみ実行ボタンを有効化する。
 */

import { useState } from 'react'

interface ResetConfirmViewProps {
  onConfirm: () => void
  onCancel: () => void
}

const CONFIRM_WORD = '削除'

export function ResetConfirmView({ onConfirm, onCancel }: ResetConfirmViewProps) {
  const [input, setInput] = useState('')
  const isMatch = input === CONFIRM_WORD

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="rounded-xl border border-red-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-red-600">全ての宿題データを削除します</h2>
        <p className="mt-2 text-xs text-slate-500">
          登録されている宿題、進捗、学習記録、設定がすべて削除されます。
          この操作は取り消せません。
        </p>

        <label className="mt-4 block text-xs text-slate-500">
          確認のため「{CONFIRM_WORD}」と入力してください
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={CONFIRM_WORD}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </label>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isMatch}
            className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-red-200"
          >
            完全に削除する
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-md bg-slate-100 py-2 text-sm font-medium text-slate-600"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}
