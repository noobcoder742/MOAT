import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from '../../components/SafeAreaView';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore } from '../../hooks/useAppStore';
import { useTrackStore } from '../../hooks/useTrackStore';
import { Card, ChunkyButton, FullScreenPicture } from '../../components/ui';
import { DoneTick, LockIcon, PhasePicture, StarIcon, StatChipsRow } from '../../components/trackKit';
import { BORDER, C, body, heading } from '../../utils/theme';
import { Track, TrackCycle2, TrackLesson, TrackPhase } from '../../types/models';
import type { RootStackParamList } from '../../navigation/RootNavigator';

/** The phase page (Option A design), opened from the play button on the Learn path. */
export default function TrackHomeScreen() {
  const app = useAppStore();
  const track = useTrackStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TrackPhase'>>();
  const chosenNumber = route.params?.phase;
  const open = (phase: TrackPhase, lesson: TrackLesson | null) => navigation.navigate('TrackFlow', { phase: phase.number, lessonId: lesson?.id ?? null });

  const numberBadge = (n: number, locked = false) => (
    <View style={{ width: locked ? 26 : 30, height: locked ? 26 : 30, borderRadius: 15, backgroundColor: locked ? C.locked : C.sky, borderWidth: BORDER, borderColor: locked ? C.lockedEdge : C.navy, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[heading(locked ? 14 : 16), { color: locked ? C.lockedText : C.navy }]}>{n}</Text>
    </View>
  );
  const rChip = (
    <View style={{ paddingHorizontal: 9, paddingVertical: 2, borderRadius: 9, backgroundColor: C.navy }}>
      <Text style={[body(13, true), { color: C.cream }]}>R</Text>
    </View>
  );
  const laterRow = (n: number, title: string, skill: string) => (
    <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12, borderRadius: 14, backgroundColor: 'rgba(255,253,246,0.94)', borderWidth: BORDER, borderColor: C.lockedEdge }} accessible accessibilityLabel={`Phase ${n}, ${title}, ${skill}, locked`}>
      {numberBadge(n, true)}
      <Text style={[heading(15), { color: '#3D3A33', flex: 1 }]}>{title}</Text>
      <Text style={[body(12, true), { color: C.muted }]}>{skill}</Text>
      <LockIcon />
    </View>
  );

  const ctaFor = (phase: TrackPhase) => {
    const next = track.nextLesson(phase);
    if (next) return { title: next.id === phase.lessons[0]?.id ? 'Start part 1' : `Continue part ${next.part}`, go: () => open(phase, next) };
    const weak = phase.lessons.find((l) => track.stars(l.id) < l.questions.length);
    if (weak) return { title: `Replay part ${weak.part}`, go: () => open(phase, weak) };
    return { title: 'Take the checkpoint', go: () => open(phase, null) };
  };

  const phaseCard = (phase: TrackPhase) => {
    const next = track.nextLesson(phase);
    const cta = ctaFor(phase);
    const cpDone = track.isFinished(phase.checkpoint.id);
    return (
      <Card radius={20} shadow contentStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {numberBadge(phase.number)}
          <Text style={[body(14, true), { color: C.muted, flex: 1 }]}>{phase.area}</Text>
          {rChip}
        </View>
        <Text style={[heading(24), { marginTop: 4, marginBottom: 6 }]}>{phase.project}</Text>
        <PhasePicture kind={phase.picture} />
        <View style={{ marginTop: 6 }}>
          {phase.lessons.map((l) => {
            const finished = track.isFinished(l.id);
            const isNext = l.id === next?.id && track.lessonUnlocked(l, phase);
            const stars = track.stars(l.id);
            return (
              <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 30 }}>
                {finished ? <DoneTick /> : isNext ? <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.sky, borderWidth: 2, borderColor: C.navy }} /> : <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: C.grey }} />}
                <Text style={[body(14, true), { color: finished || isNext ? C.navy : C.lockedText, flex: 1 }]}>Part {l.part} · {l.title}</Text>
                {finished && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <StarIcon />
                    <Text style={body(13, true)}>{stars}/{l.questions.length}</Text>
                  </View>
                )}
                {finished && stars < l.questions.length && (
                  <Pressable onPress={() => open(phase, l)} accessibilityRole="button" accessibilityLabel={`Replay part ${l.part} for 5 stars`} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 1, borderRadius: 8, backgroundColor: C.missSheet, borderWidth: 2, borderColor: C.orange }}>
                      <Text style={body(12, true)}>Replay</Text>
                    </View>
                  </Pressable>
                )}
                {!finished && isNext && (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 1, borderRadius: 8, backgroundColor: C.sky, borderWidth: 2, borderColor: C.navy }}>
                    <Text style={body(12, true)}>Next</Text>
                  </View>
                )}
              </View>
            );
          })}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 30 }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.sun, borderWidth: 2, borderColor: C.navy, alignItems: 'center', justifyContent: 'center' }}>
              <StarIcon size={11} fill={C.navy} stroke={C.navy} strokeWidth={0} />
            </View>
            <Text style={[body(14, true), { color: track.checkpointUnlocked(phase) ? C.navy : C.lockedText, flex: 1 }]}>Checkpoint · {phase.checkpoint.name}</Text>
            {cpDone ? <Text style={body(13, true)}>{track.stars(phase.checkpoint.id)}/{phase.checkpoint.questions.length}</Text> : !track.checkpointUnlocked(phase) ? <LockIcon /> : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, marginBottom: 10 }}>
          <LockIcon color={C.muted} size={13} />
          <Text style={[body(13), { color: C.muted }]}>{phase.number >= 5 ? 'Cycle 2 opens at 5 stars on every lesson.' : `Phase ${phase.number + 1} opens at 5 stars on every lesson.`}</Text>
        </View>
        <ChunkyButton title={cta.title} onPress={cta.go} />
      </Card>
    );
  };

  const cycleTwoCard = (c: TrackCycle2) => (
    <Card radius={20} shadow contentStyle={{ padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {numberBadge(6)}
        <Text style={[body(14, true), { color: C.muted, flex: 1 }]}>{c.area}</Text>
        {rChip}
      </View>
      <Text style={[heading(24), { marginTop: 4, marginBottom: 6 }]}>{c.project}</Text>
      <PhasePicture kind={c.picture} />
      {c.titles.map((t, i) => (
        <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 30 }}>
          <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: C.grey }} />
          <Text style={[body(14, true), { color: C.lockedText }]}>Part {i + 1} · {t}</Text>
        </View>
      ))}
      <ChunkyButton title="Coming soon" enabled={false} style={{ marginTop: 10 }} />
    </Card>
  );

  const content = (t: Track) => {
    const current = chosenNumber !== undefined ? t.phases.find((p) => p.number === chosenNumber) ?? null : track.cycleOneComplete ? null : track.currentPhase;
    const currentNumber = current?.number ?? t.phases.length + 1;
    const count = currentNumber - 1;
    return (
      <View style={{ gap: 8 }}>
        {count > 0 && (
          <Card fill="rgba(228,245,184,0.96)" radius={16} contentStyle={{ minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <DoneTick size={28} />
            <View style={{ flex: 1 }}>
              <Text style={[body(12, true), { color: C.muted }]}>{count === 1 ? `Phase 1 · ${t.phases[0].area}` : count >= t.phases.length ? 'Cycle 1 complete' : count === 2 ? 'Phases 1 and 2' : `Phases 1 to ${count}`}</Text>
              <Text style={heading(16)}>{count === 1 ? t.phases[0].project : `${count} projects built`}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <StarIcon />
              <Text style={body(13, true)}>5/5 on all</Text>
            </View>
          </Card>
        )}
        {current ? phaseCard(current) : cycleTwoCard(t.cycle2)}
        {t.phases.filter((p) => p.number > currentNumber && !track.phaseUnlocked(p)).map((p) => laterRow(p.number, p.project, p.skill))}
        {!current && t.cycle2.later.map((l, i) => laterRow(7 + i, l[1] ?? '', l[2] ?? ''))}
        <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: 'rgba(27,36,114,0.88)' }}>
          <Text style={[body(14, true), { color: C.cream, textAlign: 'center' }]}>{current ? 'Then cycle 2: the same areas, bigger projects' : "Cycle 2: you've done these areas before. Now go further."}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <FullScreenPicture name="world_backdrop.jpg" />
      <SafeAreaView edges={['top']} style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8, gap: 8 }}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back to the path" style={{ alignSelf: 'flex-start' }}>
          <Card radius={22} shadow contentStyle={{ height: 44, paddingLeft: 8, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Ionicons name="chevron-back" size={22} color={C.navy} />
            <Text style={heading(16)}>Path</Text>
          </Card>
        </Pressable>
        <StatChipsRow streak={app.displayStreak} bolts={app.progress.bolts} minutes={track.minutesToday} />
        {track.track ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>{content(track.track)}</ScrollView>
        ) : (
          <Card radius={20} style={{ marginTop: 40 }} contentStyle={{ padding: 20 }}>
            <Text style={body(15)}>The Biology research lessons didn't load. Check that track_bio_r_updated.json is in assets/content.</Text>
          </Card>
        )}
      </SafeAreaView>
    </View>
  );
}
