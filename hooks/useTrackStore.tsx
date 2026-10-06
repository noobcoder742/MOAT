import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { RunResult, Track, TrackLesson, TrackPhase, TrackProgress, TrackQuestion, defaultTrackProgress } from '../types/models';
import { TrackStorage } from '../storage/trackStorage';
import { loadTrack } from '../services/contentLoader';
import { DayKey } from '../utils/dayKey';

export const DAILY_GOAL_MINUTES = 10;

interface TrackStoreValue {
  track: Track | null;
  progress: TrackProgress;
  isFinished: (id: string) => boolean;
  stars: (id: string) => number;
  phaseComplete: (phase: TrackPhase) => boolean;
  phaseUnlocked: (phase: TrackPhase) => boolean;
  lessonUnlocked: (lesson: TrackLesson, phase: TrackPhase) => boolean;
  checkpointUnlocked: (phase: TrackPhase) => boolean;
  currentPhase: TrackPhase | null;
  cycleOneComplete: boolean;
  nextLesson: (phase: TrackPhase) => TrackLesson | null;
  pays: (q: TrackQuestion) => boolean;
  record: (itemID: string, questions: TrackQuestion[], firstTry: Set<string>) => RunResult;
  addTime: (seconds: number) => void;
  minutesToday: number;
  reset: () => void;
}

const Ctx = createContext<TrackStoreValue | null>(null);

export function TrackStoreProvider({ children }: { children: React.ReactNode }) {
  const track = useMemo(() => loadTrack(), []);
  const [progress, setState] = useState<TrackProgress>(defaultTrackProgress());
  const ref = useRef(progress);
  const set = useCallback((p: TrackProgress) => {
    ref.current = p;
    setState(p);
    TrackStorage.save(p);
  }, []);
  useEffect(() => {
    TrackStorage.load().then((p) => {
      ref.current = p;
      setState(p);
    });
  }, []);

  const isFinished = useCallback((id: string) => progress.finished.includes(id), [progress.finished]);
  const stars = useCallback((id: string) => progress.bestStars[id] ?? 0, [progress.bestStars]);
  /** Every lesson in a phase, plus its checkpoint, needs 5 stars to open the next phase. */
  const phaseComplete = useCallback(
    (phase: TrackPhase) =>
      phase.lessons.every((l) => stars(l.id) >= l.questions.length) && stars(phase.checkpoint.id) >= phase.checkpoint.questions.length,
    [stars],
  );
  const phaseUnlocked = useCallback(
    (phase: TrackPhase) => {
      const phases = track?.phases ?? [];
      const i = phases.findIndex((p) => p.number === phase.number);
      return i === 0 || (i > 0 && phaseComplete(phases[i - 1]));
    },
    [track, phaseComplete],
  );
  /** The next lesson opens once the one before it is finished, with any number of stars. */
  const lessonUnlocked = useCallback(
    (lesson: TrackLesson, phase: TrackPhase) => {
      if (!phaseUnlocked(phase)) return false;
      const i = phase.lessons.findIndex((l) => l.id === lesson.id);
      return i === 0 || (i > 0 && isFinished(phase.lessons[i - 1].id));
    },
    [phaseUnlocked, isFinished],
  );
  const checkpointUnlocked = useCallback(
    (phase: TrackPhase) => phaseUnlocked(phase) && phase.lessons.every((l) => isFinished(l.id)),
    [phaseUnlocked, isFinished],
  );
  const currentPhase = useMemo(() => {
    const phases = track?.phases ?? [];
    for (let i = phases.length - 1; i >= 0; i--) if (phaseUnlocked(phases[i])) return phases[i];
    return null;
  }, [track, phaseUnlocked]);
  const cycleOneComplete = useMemo(() => !!track && track.phases.every((p) => phaseComplete(p)), [track, phaseComplete]);
  const nextLesson = useCallback((phase: TrackPhase) => phase.lessons.find((l) => !isFinished(l.id)) ?? null, [isFinished]);
  const pays = useCallback((q: TrackQuestion) => !ref.current.paid.includes(q.id), []);

  /** 10 bolts per question right on the first try (only if it never paid before); +30 for a perfect first attempt. */
  const record = useCallback(
    (itemID: string, questions: TrackQuestion[], firstTry: Set<string>): RunResult => {
      const p = ref.current;
      const firstAttempt = !p.finished.includes(itemID);
      const newPaid = [...firstTry].filter((id) => !p.paid.includes(id));
      const starCount = firstTry.size;
      const bonus = firstAttempt && starCount === questions.length ? 30 : 0;
      set({
        ...p,
        finished: p.finished.includes(itemID) ? p.finished : [...p.finished, itemID],
        bestStars: { ...p.bestStars, [itemID]: Math.max(p.bestStars[itemID] ?? 0, starCount) },
        paid: Array.from(new Set([...p.paid, ...firstTry])),
      });
      const missedIndexes = questions.map((q, i) => (firstTry.has(q.id) ? -1 : i)).filter((i) => i >= 0);
      return { itemID, stars: starCount, total: questions.length, earned: newPaid.length * 10, bonus, firstAttempt, missedIndexes };
    },
    [set],
  );

  const addTime = useCallback(
    (seconds: number) => {
      if (seconds <= 0) return;
      const p = ref.current;
      const key = DayKey.today();
      set({ ...p, secondsByDay: { ...p.secondsByDay, [key]: (p.secondsByDay[key] ?? 0) + seconds } });
    },
    [set],
  );
  const minutesToday = Math.floor((progress.secondsByDay[DayKey.today()] ?? 0) / 60);

  const value: TrackStoreValue = {
    track,
    progress,
    isFinished,
    stars,
    phaseComplete,
    phaseUnlocked,
    lessonUnlocked,
    checkpointUnlocked,
    currentPhase,
    cycleOneComplete,
    nextLesson,
    pays,
    record,
    addTime,
    minutesToday,
    reset: () => set(defaultTrackProgress()),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTrackStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTrackStore must be used inside TrackStoreProvider');
  return v;
}
