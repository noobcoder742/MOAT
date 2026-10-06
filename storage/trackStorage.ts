import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultTrackProgress, TrackProgress } from '../types/models';

const KEY = 'moat.track.v1';

export const TrackStorage = {
  async load(): Promise<TrackProgress> {
    try {
      const json = await AsyncStorage.getItem(KEY);
      if (!json) return defaultTrackProgress();
      const r = JSON.parse(json);
      return {
        finished: Array.isArray(r.finished) ? r.finished : [],
        bestStars: r.bestStars && typeof r.bestStars === 'object' ? r.bestStars : {},
        paid: Array.isArray(r.paid) ? r.paid : [],
        secondsByDay: r.secondsByDay && typeof r.secondsByDay === 'object' ? r.secondsByDay : {},
      };
    } catch {
      return defaultTrackProgress();
    }
  },
  async save(p: TrackProgress) {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      // best effort
    }
  },
};
