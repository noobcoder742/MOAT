// Mirrors the Swift models (CourseModels.swift, UserProgress.swift, TrackData_updated.swift).

export type RobotForm = 'blob' | 'builder' | 'rover' | 'gardener' | 'orb' | 'cat';
export const ROBOT_FORMS: RobotForm[] = ['blob', 'builder', 'rover', 'gardener', 'orb', 'cat'];
export const ROBOT_NAMES: Record<RobotForm, string> = {
  blob: 'Blob',
  builder: 'Builder Bot',
  rover: 'Rover',
  gardener: 'Gardener',
  orb: 'Orb',
  cat: 'Cat Bot',
};
/** Only the blob and Builder Bot can be earned in version 1. */
export const isInVersionOne = (form: RobotForm) => form === 'blob' || form === 'builder';

export type RobotMood = 'neutral' | 'excited' | 'surprised' | 'wink' | 'closed' | 'hearts' | 'confused';
/** The picture file for a form with a given expression, for example "blob_excited". */
export const moodImage = (form: RobotForm, mood: RobotMood) => `${form}_${mood}`;

// ---------- Course (lessons_*.json) ----------
export type QuestionKind = 'choice' | 'build' | 'judge' | 'bug' | 'match';

export interface Question {
  id: string;
  kind: QuestionKind;
  prompt: string;
  hint?: string | null;
  code?: string | null;
  picture?: string | null;
  options: string[];
  answer: string[];
  right?: string[] | null;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  questions: Question[];
  game?: string | null;
}

export interface Phase {
  id: string;
  number: number;
  title: string;
  subtitle?: string | null;
  unlocksForm?: RobotForm | null;
  lessons: Lesson[];
}

export interface Course {
  phases: Phase[];
}

// ---------- Progress (saved on the phone) ----------
export interface UserProgress {
  hasOnboarded: boolean;
  /** The learner's first name, shown on the profile. Empty until they add it. */
  name: string;
  age: number;
  education: string;
  studyArea: string;
  language: string;
  completedLessons: string[];
  bolts: number;
  streak: number;
  lastActiveDay?: string | null;
  todayKey?: string | null;
  todayLessons: number;
  dailyGoalLessons: number;
  unlockedForms: RobotForm[];
  currentForm: RobotForm;
}

export const defaultProgress = (): UserProgress => ({
  hasOnboarded: false,
  name: '',
  age: 18,
  education: 'Secondary school',
  studyArea: 'Health Sciences',
  language: 'Python',
  completedLessons: [],
  bolts: 0,
  streak: 0,
  lastActiveDay: null,
  todayKey: null,
  todayLessons: 0,
  dailyGoalLessons: 3,
  unlockedForms: ['blob'],
  currentForm: 'blob',
});

// ---------- Biology research track (track_bio_r_updated.json) ----------
export type TrackKind = 'fill' | 'predict' | 'bug' | 'build' | 'order';
export type CheckpointStyle = 'plan' | 'code' | 'predict' | 'debug' | 'build';

export interface TrackOption {
  id: string;
  label: string;
}

export interface TrackScreen {
  goal?: string;
  done?: string;
  err?: string;
  idle?: string;
  idleLabel?: string;
}

export interface TrackQuestion {
  id: string;
  kind: TrackKind;
  prompt: string;
  hint: string;
  ok: string;
  code?: string[];
  opts?: TrackOption[];
  lines?: TrackOption[];
  correct?: string | string[];
  screen?: TrackScreen;
  fb?: Record<string, string>;
  wrongBuild?: string;
  answerLine?: string;
  note?: string;
  style?: CheckpointStyle;
  task?: string;
  steps?: Record<string, string>;
  accept?: string[][];
  start?: string[];
  goal?: string;
  wrong?: string;
  report?: string[][];
  reportTitle?: string;
  slot?: string;
}

export interface TrackLesson {
  id: string;
  part: number;
  title: string;
  questions: TrackQuestion[];
}

export interface TrackCheckpoint {
  id: string;
  name: string;
  filename: string;
  problem: string;
  unlock: string[];
  questions: TrackQuestion[];
}

export interface TrackPhase {
  number: number;
  area: string;
  project: string;
  picture: string;
  skill: string;
  parts: string[][];
  code: string[];
  lessons: TrackLesson[];
  checkpoint: TrackCheckpoint;
}

export interface TrackCycle2 {
  area: string;
  project: string;
  picture: string;
  titles: string[];
  later: string[][];
}

export interface Track {
  id: string;
  title: string;
  language: string;
  phases: TrackPhase[];
  cycle2: TrackCycle2;
}

export interface TrackProgress {
  finished: string[];
  bestStars: Record<string, number>;
  paid: string[];
  secondsByDay: Record<string, number>;
}

export const defaultTrackProgress = (): TrackProgress => ({ finished: [], bestStars: {}, paid: [], secondsByDay: {} });

export interface RunResult {
  itemID: string;
  stars: number;
  total: number;
  earned: number;
  bonus: number;
  firstAttempt: boolean;
  missedIndexes: number[];
}
export const isPerfect = (r: RunResult) => r.stars === r.total;

// Helpers that mirror TrackQuestion's Swift computed values
export const correctOne = (q: TrackQuestion) => (typeof q.correct === 'string' ? q.correct : undefined);
export const correctMany = (q: TrackQuestion) => (Array.isArray(q.correct) ? q.correct : []);
export const labelOf = (q: TrackQuestion, id: string) =>
  q.opts?.find((o) => o.id === id)?.label ?? q.lines?.find((o) => o.id === id)?.label ?? q.steps?.[id] ?? '';
