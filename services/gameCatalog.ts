import { Course, Lesson } from '../types/models';
import { canonicalArea } from '../utils/studyAreas';

type Field = 'health' | 'engineering' | 'business';

/** Fix: the Swift catalog still checked the old names "Health sciences" and "Business" after they were renamed. */
function fieldFor(studyArea: string): Field | null {
  switch (canonicalArea(studyArea)) {
    case 'Healthcare':
      return 'health';
    case 'Engineering':
      return 'engineering';
    case 'Business & finance':
      return 'business';
    default:
      return null;
  }
}

/** Adds the loop game to phase 2 and a Stage phase at the end (GameCatalog.swift). */
export function addingGames(course: Course, studyArea: string): Course {
  const field = fieldFor(studyArea);
  if (!field) return course;
  const names = {
    health: { loopTitle: 'Water the plant', loopGame: 'loop_plant', stageTitle: 'GC content lab', stageGame: 'stage_gc' },
    engineering: { loopTitle: 'Spin the wheel', loopGame: 'loop_wheel', stageTitle: 'Duty cycle lab', stageGame: 'stage_duty' },
    business: { loopTitle: 'Invest each cycle', loopGame: 'loop_fund', stageTitle: 'Conversion lab', stageGame: 'stage_conversion' },
  }[field];
  const phases = course.phases.map((phase) => {
    if (phase.number !== 2) return phase;
    const lessons = [...phase.lessons];
    const game: Lesson = { id: 'p2g1', title: names.loopTitle, questions: [], game: names.loopGame };
    lessons.splice(Math.min(2, lessons.length), 0, game);
    return { ...phase, lessons };
  });
  phases.push({
    id: 'p4',
    number: phases.length + 1,
    title: 'Stage: ' + names.stageTitle,
    subtitle: null,
    unlocksForm: null,
    lessons: [{ id: 'p4g1', title: names.stageTitle, questions: [], game: names.stageGame }],
  });
  return { phases };
}
