import { Course } from '../types/models';

/** AppConfig in APIClient_updated.swift. */
export const AppConfig = {
  backendURL: 'http://localhost:8000',
  useBackendLessons: false,
  useAIExplanations: false, // "Explain more" stays hidden until the server exists
};

export interface ExplainRequest {
  questionPrompt: string;
  code: string;
  learnerAnswer: string;
  correctAnswer: string;
  age: number;
  studyArea: string;
}

async function withTimeout(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export const APIClient = {
  /** GET /lessons?area=... (8 second timeout). Returns null on any failure, like the Swift client. */
  async fetchCourse(studyArea = 'Health Sciences'): Promise<Course | null> {
    try {
      const res = await withTimeout(`${AppConfig.backendURL}/lessons?area=${encodeURIComponent(studyArea)}`, {}, 8000);
      if (res.status !== 200) return null;
      return (await res.json()) as Course;
    } catch {
      return null;
    }
  },
  /** POST /explain (15 second timeout). Throws on failure so the caller can show its fallback text. */
  async explain(body: ExplainRequest): Promise<string> {
    const res = await withTimeout(
      `${AppConfig.backendURL}/explain`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      15000,
    );
    if (res.status !== 200) throw new Error('bad server response');
    const data = (await res.json()) as { explanation: string };
    return data.explanation;
  },
};
