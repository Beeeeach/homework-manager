import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { useAppDataStore } from '../store/app-data-store'
import { useStudySessionStore } from '../store/study-session-store'

describe('結合テスト(UI): 初回設定 → 宿題登録 → ホーム画面', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useAppDataStore.setState({ settings: null, assignments: [], isSetupComplete: false })
    useStudySessionStore.setState({ sessions: [], running: null })
  })

  it('設定ウィザードを完了し、宿題を登録し、ホーム画面に到達できる', async () => {
    render(<App />)

    // 起動時のhydrate完了を待つ（「読み込み中...」が消えるまで）
    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument()
    })

    // ログイン画面が表示されるため、テストでは「ログインせずにこの端末だけで使う」を選ぶ
    fireEvent.click(await screen.findByText('ログインせずにこの端末だけで使う'))

    // スキップ後、データ読み込みが終わるまで待つ
    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument()
    })

    // ステップ①〜④: 「次へ」を4回押して⑤（締切バッファ設定）まで進む
    fireEvent.click(screen.getByText('次へ')) // ①→②
    fireEvent.click(screen.getByText('次へ')) // ②→③
    fireEvent.click(screen.getByText('次へ')) // ③→④
    fireEvent.click(screen.getByText('次へ')) // ④→⑤
    // ⑤ 締切バッファ設定はデフォルト値のまま「宿題の登録へ」を押す
    fireEvent.click(screen.getByText('宿題の登録へ'))

    // ⑥ 宿題登録フォームが表示される
    expect(await screen.findByText('⑤ 宿題を登録する')).toBeInTheDocument()

    // タイトルと教科を入力して登録
    const titleInput = screen.getByPlaceholderText('例: 数学ワーク')
    const subjectInput = screen.getByPlaceholderText('例: 数学')
    fireEvent.change(titleInput, { target: { value: '数学ワーク' } })
    fireEvent.change(subjectInput, { target: { value: '数学' } })
    fireEvent.click(screen.getByText('この宿題を追加'))

    // 登録済みリストに反映される（「・」と本文が別テキストノードに分かれるため、
    // 該当のspan要素のtextContentで判定する。祖先要素まで拾わないようtagNameで絞る）
    expect(
      await screen.findByText((_, element) => {
        if (element?.tagName.toLowerCase() !== 'span') return false
        return Boolean(element.textContent?.includes('数学ワーク（ページ管理'))
      }),
    ).toBeInTheDocument()

    // 登録を終えてホーム画面へ
    fireEvent.click(screen.getByText('登録を終える'))

    // ホーム画面に到達し、「今日の勉強開始」ボタンが表示される
    expect(await screen.findByText('今日の勉強開始')).toBeInTheDocument()
  })
})
