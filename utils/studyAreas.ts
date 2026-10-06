export const STUDY_AREAS = ['Healthcare', 'Biology research', 'Engineering', 'Business & finance', 'Physics & maths', 'Arts & humanities', 'General'];

/** Turns a study area saved by an older version into today's name (StudyAreas_updated.swift). */
export function canonicalArea(name: string): string {
  switch (name) {
    case 'Life sciences':
    case 'Health sciences':
    case 'Health Sciences':
      return 'Healthcare';
    case 'Business':
      return 'Business & finance';
    case 'Computing':
      return 'General';
    default:
      return name;
  }
}
