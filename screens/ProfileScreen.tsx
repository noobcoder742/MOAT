import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from '../components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../hooks/useAppStore';
import { DAILY_GOAL_MINUTES, useTrackStore } from '../hooks/useTrackStore';
import { BundleImage, Card, ChunkyButton, DottedBackground } from '../components/ui';
import { FlameIcon, WeekStrip } from '../components/trackKit';
import { C, body, heading } from '../utils/theme';
import { moodImage } from '../types/models';
import { DayKey } from '../utils/dayKey';

/** Profile v2 (ProfileView_updated.swift): streak hero, stats row, 3 by 3 badges, then every setting from the old Profile. */
export default function ProfileScreen() {
  const store = useAppStore();
  const track = useTrackStore();
  const p = store.progress;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const language = p.studyArea === 'Biology research' ? 'R' : p.language;
  const openEditor = () => { setDraft(p.name); setEditing(true); };
  const saveName = () => { store.setName(draft); setEditing(false); };
  const streak = store.displayStreak;
  const activeToday = p.lastActiveDay === DayKey.today();
  const lessonsDone = p.completedLessons.length + track.progress.finished.filter((id) => !id.includes('_cp')).length;
  const concepts = track.track?.phases.filter((ph) => track.isFinished(ph.lessons[0]?.id ?? '')).length ?? 0;
  const anyPerfect = Object.values(track.progress.bestStars).some((s) => s >= 5);
  const loops = track.track?.phases.find((ph) => ph.number === 4)?.lessons.filter((l) => track.isFinished(l.id)).length ?? 0;
  const bugIDs = new Set(track.track?.phases.flatMap((ph) => [...ph.lessons.flatMap((l) => l.questions), ...ph.checkpoint.questions]).filter((q) => q.kind === 'bug').map((q) => q.id) ?? []);
  const bugs = track.progress.paid.filter((id) => bugIDs.has(id)).length;
  const badges: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; done: boolean; progress: string }[] = [
    { id: 'hello', label: 'First hello', icon: 'checkmark', color: C.lime, done: lessonsDone > 0, progress: lessonsDone > 0 ? 'done' : '0 of 1' },
    { id: 'hatched', label: 'Hatched', icon: 'star', color: C.sky, done: p.unlockedForms.length > 1, progress: p.unlockedForms.length > 1 ? 'done' : '0 of 1' },
    { id: 's7', label: '7 day streak', icon: 'flame', color: C.orange, done: streak >= 7, progress: streak >= 7 ? 'done' : `${streak} of 7` },
    { id: 'perfect', label: 'Perfect lesson', icon: 'star', color: C.sun, done: anyPerfect, progress: anyPerfect ? 'done' : '0 of 1' },
    { id: 'loops', label: 'Loop master', icon: 'repeat', color: C.lime, done: loops >= 4, progress: loops >= 4 ? 'done' : `${loops} of 4` },
    { id: 'bugs', label: 'Bug hunter', icon: 'search', color: C.sky, done: bugs >= 10, progress: bugs >= 10 ? 'done' : `${bugs} of 10` },
    { id: 's30', label: '30 day streak', icon: 'flame', color: C.orange, done: streak >= 30, progress: streak >= 30 ? 'done' : `${streak} of 30` },
    { id: 'bolts', label: 'Bolt collector', icon: 'flash', color: C.sun, done: p.bolts >= 1000, progress: p.bolts >= 1000 ? 'done' : `${p.bolts} of 1000` },
    { id: 'l50', label: '50 lessons', icon: 'layers', color: C.lime, done: lessonsDone >= 50, progress: lessonsDone >= 50 ? 'done' : `${lessonsDone} of 50` },
  ];
  const confirmReset = () =>
    Alert.alert('Reset all progress?', 'This clears lessons, bolts, streak and robot forms on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset progress', style: 'destructive', onPress: () => { store.resetProgress(); track.reset(); } },
    ]);
  const row = (label: string, value: string) => (
    <View key={label} style={{ height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderTopWidth: 2, borderTopColor: C.locked }}>
      <Text style={body(16, true)}>{label}</Text>
      <Text style={[body(16), { color: C.muted }]}>{value}</Text>
    </View>
  );
  const stat = (value: string, label: string) => (
    <View style={{ flex: 1, alignItems: 'center' }} accessible>
      <Text style={heading(26)}>{value}</Text>
      <Text style={[body(14), { color: C.muted }]}>{label}</Text>
    </View>
  );
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <DottedBackground />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BundleImage name={moodImage(p.currentForm, 'wink')} style={{ width: 76, height: 80 }} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[heading(30), { flexShrink: 1 }]} accessibilityRole="header" numberOfLines={1}>{p.name || 'Your profile'}</Text>
              <Pressable onPress={openEditor} accessibilityRole="button" accessibilityLabel={p.name ? 'Change your name' : 'Add your name'} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="pencil" size={20} color={C.muted} />
              </Pressable>
            </View>
            <Text style={[body(16), { color: C.muted }]}>{language}, {p.studyArea}</Text>
          </View>
        </View>
        <Card fill={C.screen} radius={20} shadow contentStyle={{ paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <FlameIcon size={40} />
            <Text style={[heading(54), { color: C.cream }]}>{streak}</Text>
            <Text style={[body(17, true), { color: C.lavender, paddingBottom: 8 }]}>day streak</Text>
          </View>
          <WeekStrip streak={streak} activeToday={activeToday} />
          <Text style={[body(15), { color: C.lavender }]}>{activeToday ? 'Today is done. Come back tomorrow to keep it going.' : `One lesson today makes it ${streak + 1}.`}</Text>
        </Card>
        <Card radius={20} contentStyle={{ height: 72, flexDirection: 'row', alignItems: 'center' }}>
          {stat(String(lessonsDone), 'lessons done')}
          <View style={{ width: 2.5, alignSelf: 'stretch', marginVertical: 10, backgroundColor: C.navy }} />
          {stat(String(concepts), 'concepts')}
          <View style={{ width: 2.5, alignSelf: 'stretch', marginVertical: 10, backgroundColor: C.navy }} />
          {stat(String(p.bolts), 'bolts')}
        </Card>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text style={heading(22)} accessibilityRole="header">Badges</Text>
          <Text style={[body(16, true), { color: C.muted }]}>{badges.filter((b) => b.done).length} of {badges.length}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 }}>
          {badges.map((b) => (
            <View key={b.id} style={{ width: '33.33%', alignItems: 'center', gap: 4 }} accessible accessibilityLabel={`${b.label}, ${b.progress}`}>
              <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: b.done ? b.color : C.locked, borderWidth: 2.5, borderColor: b.done ? C.navy : C.grey, borderStyle: b.done ? 'solid' : 'dashed' }}>
                <Ionicons name={b.icon} size={26} color={b.done ? C.navy : C.lockedText} />
              </View>
              <Text style={[body(15, true), { textAlign: 'center' }]}>{b.label}</Text>
              <Text style={[body(14), { color: C.muted }]}>{b.progress}</Text>
            </View>
          ))}
        </View>
        <Card radius={20}>
          <Text style={[heading(20), { paddingHorizontal: 16, paddingVertical: 10 }]}>Settings</Text>
          {row('Daily goal', `${DAILY_GOAL_MINUTES} min`)}
          {row('Age', p.age >= 70 ? '70+' : String(p.age))}
          {row('Education', p.education)}
          {row('Area of study', p.studyArea)}
          {row('Language', language)}
        </Card>
        <ChunkyButton title="Edit my answers" fill={C.card} onPress={store.editAnswers} />
        <ChunkyButton title="Reset all progress" fill={C.missSheet} onPress={confirmReset} />
        <ChunkyButton title="Subscriptions" fill={C.sky} onPress={() => store.openPaywall('premium')} />
        <Text style={[body(14), { color: C.muted }]}>Sign in and account deletion come in a later build. Progress is saved on this phone only.</Text>
      </ScrollView>
      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(27,36,114,0.35)', justifyContent: 'center', padding: 24 }}>
          <Card radius={20} shadow contentStyle={{ padding: 20, gap: 14 }}>
            <Text style={heading(22)} accessibilityRole="header">Your name</Text>
            <Card radius={14} contentStyle={{ minHeight: 52, justifyContent: 'center', paddingHorizontal: 14 }}>
              <TextInput
                value={draft}
                onChangeText={(t) => setDraft(t.slice(0, 30))}
                placeholder="Your first name"
                placeholderTextColor={C.muted}
                autoFocus
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={saveName}
                accessibilityLabel="Your first name"
                style={[body(16, true), { paddingVertical: 12 }]}
              />
            </Card>
            <ChunkyButton title="Save" onPress={saveName} />
            <Pressable onPress={() => setEditing(false)} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[body(16, true), { textDecorationLine: 'underline' }]}>Cancel</Text>
            </Pressable>
          </Card>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
