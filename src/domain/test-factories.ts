/**
 * テスト用のファクトリ関数。
 * 各テストで最小限の差分だけ指定してデータを作れるようにする（Partial + デフォルト値のマージ方式）。
 * 本番コードからは参照しない（テストコードとStorybook的な用途のみを想定）。
 */

import type {
  PageAssignment,
  RepetitionAssignment,
  CreativeAssignment,
  ProjectAssignment,
  Phase,
  Task,
  StudySession,
  UserSettings,
  WeekdayStudyMinutes,
} from '.'

let idCounter = 0
export function nextId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${idCounter}`
}

export function resetIdCounter(): void {
  idCounter = 0
}

export function makePageAssignment(
  overrides: Partial<PageAssignment> = {},
): PageAssignment {
  return {
    id: nextId('assignment'),
    title: 'テスト数学ワーク',
    subject: '数学',
    type: 'page',
    deadline: '2026-08-31',
    createdAt: '2026-07-20',
    isCompleted: false,
    totalPages: 40,
    currentPage: 0,
    estimatedMinutesPerPage: 4,
    ...overrides,
  }
}

export function makeRepetitionAssignment(
  overrides: Partial<RepetitionAssignment> = {},
): RepetitionAssignment {
  return {
    id: nextId('assignment'),
    title: 'テスト英単語',
    subject: '英語',
    type: 'repetition',
    deadline: '2026-08-31',
    createdAt: '2026-07-20',
    isCompleted: false,
    totalItems: 200,
    completedItems: 0,
    estimatedMinutesPerItem: 0.5,
    ...overrides,
  }
}

export function makePhase(overrides: Partial<Phase> = {}): Phase {
  return {
    id: nextId('phase'),
    name: 'テスト工程',
    ratio: 0.25,
    progressRatio: 0,
    isCompleted: false,
    ...overrides,
  }
}

export function makeCreativeAssignment(
  overrides: Partial<CreativeAssignment> = {},
): CreativeAssignment {
  return {
    id: nextId('assignment'),
    title: 'テスト読書感想文',
    subject: '国語',
    type: 'creative',
    deadline: '2026-08-31',
    createdAt: '2026-07-20',
    isCompleted: false,
    targetCharCount: 1200,
    estimatedTotalMinutes: 600,
    isEstimateManual: false,
    phases: [
      makePhase({ name: '読書', ratio: 0.4 }),
      makePhase({ name: 'メモ', ratio: 0.1 }),
      makePhase({ name: '構成', ratio: 0.1 }),
      makePhase({ name: '下書き', ratio: 0.25 }),
      makePhase({ name: '清書', ratio: 0.15 }),
    ],
    ...overrides,
  }
}

export function makeProjectAssignment(
  overrides: Partial<ProjectAssignment> = {},
): ProjectAssignment {
  return {
    id: nextId('assignment'),
    title: 'テスト自由研究',
    subject: '理科',
    type: 'project',
    deadline: '2026-08-31',
    createdAt: '2026-07-20',
    isCompleted: false,
    estimatedTotalMinutes: 540,
    isEstimateManual: false,
    phases: [
      makePhase({ name: 'テーマ決定', ratio: 0.1 }),
      makePhase({ name: '情報収集', ratio: 0.2 }),
      makePhase({ name: '実験', ratio: 0.3 }),
      makePhase({ name: '結果整理', ratio: 0.15 }),
      makePhase({ name: '考察', ratio: 0.15 }),
      makePhase({ name: 'レポート', ratio: 0.1 }),
    ],
    ...overrides,
  }
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: nextId('task'),
    assignmentId: 'assignment-1',
    date: '2026-07-21',
    plannedAmount: 5,
    plannedMinutes: 20,
    isCompleted: false,
    ...overrides,
  }
}

export function makeStudySession(
  overrides: Partial<StudySession> = {},
): StudySession {
  return {
    id: nextId('session'),
    taskId: 'task-1',
    assignmentId: 'assignment-1',
    startedAt: '2026-07-21T16:00:00',
    endedAt: '2026-07-21T16:20:00',
    actualAmount: 5,
    actualMinutes: 20,
    recordMethod: 'stopwatch',
    ...overrides,
  }
}

const defaultWeekdayStudyMinutes: WeekdayStudyMinutes = {
  0: 90, // 日
  1: 60, // 月
  2: 120, // 火
  3: 60, // 水
  4: 60, // 木
  5: 60, // 金
  6: 90, // 土
}

export function makeUserSettings(
  overrides: Partial<UserSettings> = {},
): UserSettings {
  return {
    vacationPeriod: { startDate: '2026-07-20', endDate: '2026-08-31' },
    weekdayStudyMinutes: defaultWeekdayStudyMinutes,
    recurringSchedules: [],
    specialSchedules: [],
    ...overrides,
  }
}
