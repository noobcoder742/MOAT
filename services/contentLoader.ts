import { Course, Track } from '../types/models';
import { CONTENT } from '../utils/content';
import { canonicalArea } from '../utils/studyAreas';
import { addingGames } from './gameCatalog';

/** "Physics & maths" becomes "lessons_physics_and_maths"; several areas share the life sciences file. */
export function fileName(studyArea: string): string {
  const cleaned = canonicalArea(studyArea).toLowerCase().replace(/&/g, 'and').replace(/ /g, '_');
  const map: Record<string, string> = {
    health_sciences: 'life_sciences',
    healthcare: 'life_sciences',
    biology_research: 'life_sciences',
    business_and_finance: 'business',
  };
  return `lessons_${map[cleaned] ?? cleaned}`;
}

export function languageFileName(language: string): string | null {
  return { R: 'lessons_r', SQL: 'lessons_sql', JavaScript: 'lessons_javascript', MATLAB: 'lessons_matlab', Java: 'lessons_java' }[language] ?? null;
}

function load(name: string): Course | null {
  const data = CONTENT[name] as Course | undefined;
  if (!data || !Array.isArray(data.phases)) {
    if (__DEV__) console.warn(`MOAT warning: ${name}.json is missing or could not be read.`);
    return null;
  }
  return data;
}

/** ContentLoader.loadBundled: language files first, then the study-area file with its games, then the default. */
export function loadBundled(studyArea = 'Health Sciences', language = 'Python'): Course {
  const lang = languageFileName(language);
  if (lang) {
    const course = load(lang);
    if (course) return course;
  }
  const course = load(fileName(studyArea));
  if (course) return addingGames(course, studyArea);
  return load('lessons') ?? { phases: [] };
}

export function loadTrack(): Track | null {
  const t = CONTENT['track_bio_r_updated'] as Track | undefined;
  return t && Array.isArray(t.phases) ? t : null;
}
