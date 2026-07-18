/**
 * 割当ロジック（Allocation Logic）（仕様書 10.2③・改訂版）
 *
 * 【改訂の背景】
 * 旧方式はその日のcapacityを対象宿題全件でスコア比率按分していたため、
 * 「5件あれば5件全部を毎日少しずつ」になり非効率だった。
 * 改訂版は、優先度スコアの高い宿題から順に「blockMinutes以上のまとまった時間」を
 * 割り当てる集中配分方式に変更する。
 *
 * さらに、1つの宿題が1日中capacityを独占してしまう問題（例: 1日中同じ宿題だけ）を
 * 防ぐため、1宿題あたりの1日の上限時間（maxMinutesPerAssignment）を導入した。
 * 上限に達したら、その宿題への配分はそこで打ち切り、余ったcapacityは
 * 次の優先度の宿題に回す。
 *
 * 【設定化】(新規)
 * blockMinutes・maxAssignmentsPerDay・maxMinutesPerAssignmentは、
 * 以前はconfig/constants.tsの固定値だったが、UserSettings.advancedSchedulingから
 * 渡せるようにし、ユーザーが「詳細設定」で調整できるようにした。
 * 呼び出し側（schedule-day.ts）がoptionsとしてまとめて渡す。
 *
 * 【アルゴリズム】
 *   1. スコアの高い順に対象宿題をソートする
 *   2. 上から順に、以下を「残りcapacityが尽きる」「対象がなくなる」
 *      「割当件数がmaxAssignmentsPerDayに達する」のいずれかまで繰り返す:
 *        a. 割当候補 = min(その宿題の残り予想時間, 残りcapacity, maxMinutesPerAssignment)
 *        b. 割当候補 >= blockMinutes なら、その分を配分し、
 *           残りcapacityを減らし、割当件数を1増やして次の宿題へ
 *        c. 割当候補 < blockMinutes の場合:
 *             - 緊急（今日を含め残り1日しかない）なら、候補分をそのまま配分する
 *               （終わらないよりはマシなので、少量でも実行する）
 *             - 緊急でなければこの宿題はスキップ（0分）し、次の宿題を試す
 *               （件数にはカウントしない＝上限を消費しない）
 *   3. 余ったcapacityがあっても、上限件数や候補切れで打ち切られた場合は
 *      次の宿題には回さない（意図的に余らせる。集中配分の趣旨のため）
 *
 * 注意: maxMinutesPerAssignmentは緊急時（isUrgent）でも適用される。
 * 緊急な宿題が1日の上限を超えて残っている場合でも、その日は上限までしか
 * 配分しない（1日に集中させすぎない方針を優先するため）。ただしこれにより
 * 緊急宿題が終わらない可能性はあるため、翌日以降により強く優先される
 * （優先度スコア自体は残り時間ベースで変わらず高いまま）。
 */

export interface AllocationInput {
  assignmentId: string
  /** score(assignment) = 優先度 × 日付重み（呼び出し側で事前に算出しておく） */
  score: number
  /** その宿題の残り予想時間（分）。集中配分では「まとめてどれだけ進められるか」の上限として使う */
  remainingMinutes: number
  /** 緊急フラグ。今日を含め残り1日しかない場合true（isUrgentで判定、呼び出し側で算出） */
  isUrgent: boolean
}

export interface AllocationResult {
  assignmentId: string
  allocatedMinutes: number
  /** 下限ブロック未満のため、その日はスキップされたか */
  excludedByMinimum: boolean
}

export interface AllocateCapacityOptions {
  /** 集中配分の1ブロックあたりの時間（分）。これ未満の端数は原則配分しない */
  blockMinutes: number
  /** 1日に手をつける宿題の最大件数 */
  maxAssignmentsPerDay: number
  /** 1日のうち、1つの宿題に使ってよい時間の上限（分） */
  maxMinutesPerAssignment: number
}

export function allocateCapacity(
  capacityMinutes: number,
  inputs: AllocationInput[],
  options: AllocateCapacityOptions,
): AllocationResult[] {
  const { blockMinutes, maxAssignmentsPerDay, maxMinutesPerAssignment } = options

  if (capacityMinutes <= 0 || inputs.length === 0) {
    return inputs.map((i) => ({
      assignmentId: i.assignmentId,
      allocatedMinutes: 0,
      excludedByMinimum: inputs.length > 0,
    }))
  }

  // スコアが0以下（完了扱い等）のものは対象外
  const scored = inputs.filter((i) => i.score > 0)
  const zeroScored = inputs.filter((i) => i.score <= 0)

  // スコアの高い順にソート（同スコアの場合は入力順を保つ）
  const sorted = [...scored].sort((a, b) => b.score - a.score)

  const results: AllocationResult[] = []
  let remainingCapacity = capacityMinutes
  let assignedCount = 0

  for (const item of sorted) {
    if (remainingCapacity <= 0 || assignedCount >= maxAssignmentsPerDay) {
      results.push({
        assignmentId: item.assignmentId,
        allocatedMinutes: 0,
        excludedByMinimum: true,
      })
      continue
    }

    const candidate = Math.min(
      item.remainingMinutes,
      remainingCapacity,
      maxMinutesPerAssignment,
    )

    if (candidate >= blockMinutes) {
      results.push({
        assignmentId: item.assignmentId,
        allocatedMinutes: candidate,
        excludedByMinimum: false,
      })
      remainingCapacity -= candidate
      assignedCount += 1
    } else if (item.isUrgent && candidate > 0) {
      // 緊急: ブロック未満でも今日やらないと終わらないため実行する
      results.push({
        assignmentId: item.assignmentId,
        allocatedMinutes: candidate,
        excludedByMinimum: false,
      })
      remainingCapacity -= candidate
      assignedCount += 1
    } else {
      // 緊急でなく、まとまった時間も取れない場合はスキップ（次の日に回す）
      results.push({
        assignmentId: item.assignmentId,
        allocatedMinutes: 0,
        excludedByMinimum: true,
      })
    }
  }

  const zeroResults: AllocationResult[] = zeroScored.map((i) => ({
    assignmentId: i.assignmentId,
    allocatedMinutes: 0,
    excludedByMinimum: true,
  }))

  return [...results, ...zeroResults]
}
