import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore } from '../hooks/useAppStore';
import { useTrackStore } from '../hooks/useTrackStore';
import { BundleImage, Card, FullScreenPicture } from '../components/ui';
import { StatChipsRow } from '../components/trackKit';
import { BORDER, C, body, heading } from '../utils/theme';
import { Lesson, Phase, moodImage } from '../types/models';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Row = { id: string; kind: 'banner'; phase: Phase } | { id: string; kind: 'lesson'; lesson: Lesson; phase: Phase; step: number };

/** The Learn home: a path that climbs upward, split into phases, with the current lesson kept in view (LearnView). */
export default function LearnScreen() {
  const store = useAppStore();
  const track = useTrackStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const currentY = useRef<number | null>(null);

  const rows = useMemo(() => {
    const out: Row[] = [];
    let step = 0;
    for (const phase of store.course.phases) {
      out.push({ id: `banner-${phase.id}`, kind: 'banner', phase });
      for (const lesson of phase.lessons) out.push({ id: lesson.id, kind: 'lesson', lesson, phase, step: step++ });
    }
    return out.reverse();
  }, [store.course]);

  const scrollToCurrent = useCallback((animated: boolean) => {
    setTimeout(() => {
      if (currentY.current == null) return scrollRef.current?.scrollToEnd({ animated });
      const h = Dimensions.get('window').height;
      scrollRef.current?.scrollTo({ y: Math.max(0, currentY.current - h / 2 + 85), animated });
    }, 150);
  }, []);
  useEffect(() => scrollToCurrent(true), [store.progress.completedLessons.length, scrollToCurrent]);

  // Celebrate an evolution only once the lesson screen has fully closed.
  useFocusEffect(
    useCallback(() => {
      if (store.pendingEvolution) {
        const form = store.pendingEvolution;
        store.clearPendingEvolution();
        navigation.navigate('Evolution', { form });
      }
    }, [store.pendingEvolution]), // eslint-disable-line react-hooks/exhaustive-deps
  );

  const openLesson = (lesson: Lesson) => (lesson.game ? navigation.navigate('GameLesson', { lessonId: lesson.id }) : navigation.navigate('Lesson', { lessonId: lesson.id }));
  const openPremium = () => store.openPaywall('premium');

  const lessonRow = (lesson: Lesson, phase: Phase, step: number) => {
    const x = [0, 55, 0, -55][step % 4];
    const done = store.isCompleted(lesson);
    const unlocked = store.isUnlocked(lesson);
    const isCurrent = store.currentLesson?.id === lesson.id;
    const phaseLocked = !store.isPhaseStarted(phase);
    const isLast = phase.lessons[phase.lessons.length - 1]?.id === lesson.id;
    const size = isCurrent ? 88 : 64;
    const icon: keyof typeof Ionicons.glyphMap = done ? 'checkmark' : isCurrent ? 'play' : isLast ? 'star' : 'lock-closed';
    const fill = done ? C.lime : isCurrent ? C.sky : C.locked;
    const state = done ? 'complete' : unlocked ? 'start' : 'locked';
    const p = store.progress;
    return (
      <View key={lesson.id} onLayout={isCurrent ? (e) => { currentY.current = e.nativeEvent.layout.y; } : undefined} style={{ height: isCurrent ? 170 : 96, alignItems: 'center', justifyContent: 'center' }}>
        {phaseLocked && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(27,36,114,0.55)' }} />}
        <View style={{ alignItems: 'center', gap: 8, transform: [{ translateX: x }] }}>
          <Pressable onPress={() => (unlocked ? openLesson(lesson) : phaseLocked ? openPremium() : undefined)} accessibilityRole="button" accessibilityLabel={`${lesson.title}, ${state}`}>
            <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
              {isCurrent && <View style={{ position: 'absolute', width: size + 20, height: size + 20, borderRadius: (size + 20) / 2, borderWidth: 3, borderColor: C.cream }} />}
              <View style={{ position: 'absolute', top: 4, width: size, height: size, borderRadius: size / 2, backgroundColor: C.navy }} />
              <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: fill, borderWidth: BORDER, borderColor: C.navy, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon} size={isCurrent ? 32 : 24} color={unlocked ? C.navy : C.lockedText} />
              </View>
            </View>
          </Pressable>
          {isCurrent && (
            <Card radius={16} shadow contentStyle={{ paddingHorizontal: 14, paddingVertical: 6 }}>
              <Text style={heading(16)}>{lesson.title}</Text>
            </Card>
          )}
        </View>
        {isCurrent && (
          <BundleImage
            name={moodImage(p.currentForm, p.currentForm === 'blob' ? 'excited' : 'closed')}
            style={{ position: 'absolute', width: 96, height: 112, transform: [{ translateX: x > 0 ? -110 : 110 }] }}
          />
        )}
      </View>
    );
  };

  const banner = (phase: Phase) => {
    const started = store.isPhaseStarted(phase);
    return (
      <Pressable key={`banner-${phase.id}`} onPress={() => (!started ? openPremium() : undefined)} style={{ paddingHorizontal: 16, paddingVertical: 14, backgroundColor: started ? 'transparent' : 'rgba(27,36,114,0.55)' }} accessibilityRole="button">
        <Card fill={started ? C.cream : C.premiumBand} radius={20} shadow contentStyle={{ height: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={[body(13, true), { color: started ? C.muted : C.premiumText }]}>{started ? `Phase ${phase.number}` : `Phase ${phase.number} · skip with Premium`}</Text>
            <Text style={[heading(20), { color: started ? C.navy : C.cream }]} numberOfLines={1}>{phase.title}</Text>
          </View>
          {started ? (
            <View style={{ height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: C.sky, borderWidth: 2, borderColor: C.navy, justifyContent: 'center' }}>
              <Text style={body(13, true)}>{store.completedCount(phase)} of {phase.lessons.length}</Text>
            </View>
          ) : (
            <View style={{ height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: C.orange, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="ribbon" size={14} color={C.navy} />
              <Text style={body(13, true)}>Premium</Text>
            </View>
          )}
        </Card>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <FullScreenPicture name="world_backdrop.jpg" />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {store.course.phases.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
            <Card radius={20} contentStyle={{ padding: 20, gap: 10, alignItems: 'center' }}>
              <Text style={heading(22)}>Lessons didn't load</Text>
              <Text style={[body(15), { textAlign: 'center' }]}>Check that lessons.json is inside the app. See Troubleshooting in the README.</Text>
            </Card>
          </View>
        ) : (
          <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 70, paddingBottom: 30 }} onContentSizeChange={() => scrollToCurrent(false)}>
            {rows.map((r) => (r.kind === 'banner' ? banner(r.phase) : lessonRow(r.lesson, r.phase, r.step)))}
          </ScrollView>
        )}

      </SafeAreaView>
      <View style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, zIndex: 20 }}>
        <StatChipsRow streak={store.displayStreak} bolts={store.progress.bolts} minutes={track.minutesToday} />
      </View>
    </View>
  );
}
