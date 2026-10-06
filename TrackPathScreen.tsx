import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore } from '../../hooks/useAppStore';
import { useTrackStore } from '../../hooks/useTrackStore';
import { BundleImage, Card, FullScreenPicture } from '../../components/ui';
import { StatChipsRow } from '../../components/trackKit';
import { BORDER, C, body, heading } from '../../utils/theme';
import { TrackPhase, moodImage } from '../../types/models';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Node = { id: string; kind: 'lesson' | 'checkpoint'; title: string; phase: TrackPhase; step: number };
type Row = { id: string; banner: TrackPhase } | { id: string; node: Node };

/** The Learn home for Biology research: the original climbing path, made of the track's lessons and checkpoints.
 *  Tapping the play button (or any open node) opens that phase's page. */
export default function TrackPathScreen() {
  const app = useAppStore();
  const track = useTrackStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const currentY = useRef<number | null>(null);
  const t = track.track;

  const rows = useMemo(() => {
    const out: Row[] = [];
    let step = 0;
    for (const phase of t?.phases ?? []) {
      out.push({ id: `banner-${phase.number}`, banner: phase });
      for (const l of phase.lessons) out.push({ id: l.id, node: { id: l.id, kind: 'lesson', title: `Part ${l.part} · ${l.title}`, phase, step: step++ } });
      out.push({ id: phase.checkpoint.id, node: { id: phase.checkpoint.id, kind: 'checkpoint', title: `Checkpoint · ${phase.checkpoint.name}`, phase, step: step++ } });
    }
    return out.reverse();
  }, [t]);

  /** The node the play button sits on: the next unfinished lesson, else the checkpoint, else the first lesson under 5 stars. */
  const currentID = useMemo(() => {
    const phase = track.cycleOneComplete ? null : track.currentPhase;
    if (!phase) return null;
    const next = track.nextLesson(phase);
    if (next) return next.id;
    if (track.stars(phase.checkpoint.id) < phase.checkpoint.questions.length) return phase.checkpoint.id;
    return phase.lessons.find((l) => track.stars(l.id) < l.questions.length)?.id ?? null;
  }, [track]);

  const scrollToCurrent = useCallback((animated: boolean) => {
    setTimeout(() => {
      if (currentY.current == null) return scrollRef.current?.scrollToEnd({ animated });
      const h = Dimensions.get('window').height;
      scrollRef.current?.scrollTo({ y: Math.max(0, currentY.current - h / 2 + 85), animated });
    }, 150);
  }, []);
  useEffect(() => scrollToCurrent(true), [currentID, scrollToCurrent]);

  const openPhase = (phase: TrackPhase) => navigation.navigate('TrackPhase', { phase: phase.number });

  const banner = (phase: TrackPhase) => {
    const open = track.phaseUnlocked(phase);
    const done = phase.lessons.filter((l) => track.isFinished(l.id)).length + (track.isFinished(phase.checkpoint.id) ? 1 : 0);
    return (
      <Pressable key={`banner-${phase.number}`} onPress={() => open && openPhase(phase)} accessibilityRole="button" accessibilityLabel={`Phase ${phase.number}, ${phase.project}, ${open ? `${done} of 5 done` : 'locked'}`} style={{ paddingHorizontal: 16, paddingVertical: 14, backgroundColor: open ? 'transparent' : 'rgba(27,36,114,0.55)' }}>
        <Card fill={open ? C.cream : C.premiumBand} radius={20} shadow contentStyle={{ minHeight: 64, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={[body(13, true), { color: open ? C.muted : C.premiumText }]}>Phase {phase.number} · {phase.area}</Text>
            <Text style={[heading(20), { color: open ? C.navy : C.cream }]} numberOfLines={1}>{phase.project}</Text>
          </View>
          {open ? (
            <View style={{ height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: C.sky, borderWidth: 2, borderColor: C.navy, justifyContent: 'center' }}>
              <Text style={body(13, true)}>{done} of 5</Text>
            </View>
          ) : (
            <View style={{ height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: C.orange, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="lock-closed" size={13} color={C.navy} />
              <Text style={body(13, true)}>5 stars to open</Text>
            </View>
          )}
        </Card>
      </Pressable>
    );
  };

  const nodeRow = (n: Node) => {
    const x = [0, 55, 0, -55][n.step % 4];
    const lesson = n.phase.lessons.find((l) => l.id === n.id);
    const finished = track.isFinished(n.id);
    const isCurrent = n.id === currentID;
    const open = lesson ? track.lessonUnlocked(lesson, n.phase) : track.checkpointUnlocked(n.phase);
    const phaseLocked = !track.phaseUnlocked(n.phase);
    const stars = track.stars(n.id);
    const size = isCurrent ? 88 : 64;
    const icon: keyof typeof Ionicons.glyphMap = isCurrent ? 'play' : finished ? 'checkmark' : n.kind === 'checkpoint' ? 'star' : 'lock-closed';
    const fill = isCurrent ? C.sky : finished ? C.lime : n.kind === 'checkpoint' && open ? C.sun : C.locked;
    const state = isCurrent ? 'start' : finished ? `done, ${stars} stars` : open ? 'open' : 'locked';
    return (
      <View key={n.id} onLayout={isCurrent ? (e) => { currentY.current = e.nativeEvent.layout.y; } : undefined} style={{ height: isCurrent ? 170 : 96, alignItems: 'center', justifyContent: 'center' }}>
        {phaseLocked && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(27,36,114,0.55)' }} />}
        <View style={{ alignItems: 'center', gap: 8, transform: [{ translateX: x }] }}>
          <Pressable onPress={() => (open || finished) && openPhase(n.phase)} accessibilityRole="button" accessibilityLabel={`${n.title}, ${state}`}>
            <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
              {isCurrent && <View style={{ position: 'absolute', width: size + 20, height: size + 20, borderRadius: (size + 20) / 2, borderWidth: 3, borderColor: C.cream }} />}
              <View style={{ position: 'absolute', top: 4, width: size, height: size, borderRadius: size / 2, backgroundColor: C.navy }} />
              <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: fill, borderWidth: BORDER, borderColor: C.navy, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon} size={isCurrent ? 32 : 24} color={open || finished ? C.navy : C.lockedText} />
              </View>
              {finished && !isCurrent && (
                <View style={{ position: 'absolute', bottom: -10, paddingHorizontal: 7, height: 20, borderRadius: 10, backgroundColor: stars >= 5 ? C.sun : C.card, borderWidth: 2, borderColor: C.navy, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Ionicons name="star" size={10} color={C.navy} />
                  <Text style={body(11, true)}>{stars}</Text>
                </View>
              )}
            </View>
          </Pressable>
          {isCurrent && (
            <Card radius={16} shadow contentStyle={{ paddingHorizontal: 14, paddingVertical: 6 }}>
              <Text style={heading(16)}>{n.title}</Text>
            </Card>
          )}
        </View>
        {isCurrent && (
          <BundleImage name={moodImage(app.progress.currentForm, app.progress.currentForm === 'blob' ? 'excited' : 'closed')} style={{ position: 'absolute', width: 96, height: 112, transform: [{ translateX: x > 0 ? -110 : 110 }] }} />
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <FullScreenPicture name="world_backdrop.jpg" />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {t ? (
          <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 70, paddingBottom: 30 }} onContentSizeChange={() => scrollToCurrent(false)}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
              <Card fill={C.premiumBand} radius={20} shadow contentStyle={{ minHeight: 64, paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center' }}>
                <Text style={[body(13, true), { color: C.premiumText }]}>Cycle 2 · {t.cycle2.area}</Text>
                <Text style={[heading(20), { color: C.cream }]}>{t.cycle2.project}</Text>
              </Card>
            </View>
            {rows.map((r) => ('banner' in r ? banner(r.banner) : nodeRow(r.node)))}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
            <Card radius={20} contentStyle={{ padding: 20 }}>
              <Text style={body(15)}>The Biology research lessons didn't load. Check that track_bio_r_updated.json is in assets/content.</Text>
            </Card>
          </View>
        )}

      </SafeAreaView>
      <View style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, zIndex: 20 }}>
        <StatChipsRow streak={app.displayStreak} bolts={app.progress.bolts} minutes={track.minutesToday} />
      </View>
    </View>
  );
}
