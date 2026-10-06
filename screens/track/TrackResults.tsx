import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../hooks/useAppStore';
import { useTrackStore } from '../../hooks/useTrackStore';
import { Card, ChunkyButton, DottedBackground } from '../../components/ui';
import { BoltIcon, FlameIcon, ProjectCard, RCodeLine, RobotFace, SegmentBar, StarIcon, StarsRow, WeekStrip, useCountUp } from '../../components/trackKit';
import { BORDER, C, FONTS, body, heading } from '../../utils/theme';
import { RunResult, TrackLesson, TrackPhase, isPerfect } from '../../types/models';
import { DayKey } from '../../utils/dayKey';
import { useReduceMotion } from '../../hooks/useReduceMotion';

const Hero = ({ mood, size, dark = false }: { mood: 'hearts' | 'surprised' | 'wink'; size: number; dark?: boolean }) => {
  const app = useAppStore();
  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: dark ? 0 : 4, height: size, borderRadius: size / 2, backgroundColor: dark ? 'transparent' : C.navy }} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.sky, borderWidth: BORDER, borderColor: dark ? C.cream : C.navy }} />
      <View style={{ position: 'absolute', left: size * 0.04, top: -size * 0.08 }}>
        <RobotFace form={app.progress.currentForm} mood={mood} width={size * 0.92} height={size * 1.1} />
      </View>
    </View>
  );
};

/** Lesson complete: the total counts up, "+N added" slides in, stars pop and shimmer, and a perfect first try shows the +30 tag. */
export function TrackLessonComplete({ phase, lesson, result, onContinue, onReplay }: { phase: TrackPhase; lesson: TrackLesson; result: RunResult; onContinue: () => void; onReplay: () => void }) {
  const app = useAppStore();
  const reduce = useReduceMotion();
  const credited = result.earned + result.bonus;
  const total = useCountUp(app.progress.bolts, { from: app.progress.bolts - credited, duration: 1100, delay: 550, run: !reduce });
  const chip = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const bounce = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduce) return;
    Animated.timing(chip, { toValue: 1, duration: 400, delay: 250, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }).start();
    Animated.sequence([Animated.delay(1600), Animated.timing(bounce, { toValue: 1.1, duration: 180, useNativeDriver: true }), Animated.timing(bounce, { toValue: 1, duration: 270, useNativeDriver: true })]).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
      <DottedBackground />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 8, paddingRight: 16, marginTop: 8 }}>
        <Pressable onPress={onContinue} accessibilityRole="button" accessibilityLabel="Back to Learn" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={24} color={C.navy} />
        </Pressable>
        <SegmentBar total={5} index={5} currentCorrect />
        <Animated.View style={{ transform: [{ scale: bounce }] }} accessible accessibilityLabel={`Total bolts ${app.progress.bolts}. ${credited} added from this lesson.`}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 3, height: 40, borderRadius: 20, backgroundColor: C.navy }} />
          <View style={{ height: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 10, paddingRight: 14, borderRadius: 20, borderWidth: BORDER, borderColor: C.navy, backgroundColor: C.lime }}>
            <BoltIcon size={22} />
            <Text style={heading(24)}>{total}</Text>
          </View>
        </Animated.View>
      </View>
      <Animated.View style={{ alignSelf: 'flex-end', marginRight: 16, marginTop: 6, opacity: chip, transform: [{ translateY: chip.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 8, paddingRight: 12, height: 30, borderRadius: 15, backgroundColor: C.navy }}>
          <BoltIcon size={16} stroke={C.sky} />
          <Text style={[body(15, true), { color: C.cream }]}>+{credited} added</Text>
        </View>
      </Animated.View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, gap: 14 }} showsVerticalScrollIndicator={false}>
        <Hero mood="hearts" size={208} />
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={heading(38)} accessibilityRole="header">Lesson done</Text>
          <Text style={[body(17), { color: C.muted }]}>Phase {phase.number} · part {lesson.part} of 4</Text>
        </View>
        <View>
          <Card radius={20} shadow contentStyle={{ paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}>
            <Text style={body(17, true)}>{result.stars} of {result.total} right first try</Text>
            <StarsRow filled={result.stars} total={result.total} />
          </Card>
          {result.bonus > 0 && (
            <View style={{ position: 'absolute', right: 14, top: -16, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, backgroundColor: C.sun, borderWidth: BORDER, borderColor: C.navy }}>
              <Text style={body(13, true)}>+30 perfect first try</Text>
            </View>
          )}
        </View>
        <Card fill={C.screen} radius={20} shadow contentStyle={{ paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FlameIcon size={24} />
            <Text style={[heading(22), { color: C.cream }]}>{app.displayStreak} day streak</Text>
          </View>
          <WeekStrip streak={app.displayStreak} activeToday={app.progress.lastActiveDay === DayKey.today()} />
        </Card>
      </ScrollView>
      <View style={{ paddingHorizontal: 16 }}>
        <ChunkyButton title="Continue" onPress={onContinue} />
      </View>
      {result.missedIndexes.length > 0 ? (
        <Pressable onPress={onReplay} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[body(17, true), { textDecorationLine: 'underline' }]}>{result.missedIndexes.length === 1 ? 'Review the one I missed' : 'Review the ones I missed'}</Text>
        </Pressable>
      ) : (
        <View style={{ height: 12 }} />
      )}
    </SafeAreaView>
  );
}

export function ProjectBuilt({ phase, onCheckpoint, onBack }: { phase: TrackPhase; onCheckpoint: () => void; onBack: () => void }) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
      <DottedBackground />
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to Learn" style={{ width: 44, height: 44, marginLeft: 8, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="chevron-back" size={24} color={C.navy} />
      </Pressable>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }} showsVerticalScrollIndicator={false}>
        <Hero mood="hearts" size={100} />
        <Text style={[heading(32), { textAlign: 'center' }]} accessibilityRole="header">Project built</Text>
        <Text style={[body(15), { color: C.muted, textAlign: 'center' }]}>Phase {phase.number} · {phase.area} · R</Text>
        <ProjectCard phase={phase} part={5} />
        <Card fill={C.screen} radius={20} shadow contentStyle={{ paddingHorizontal: 14, paddingVertical: 10, gap: 4 }}>
          <Text style={[body(14, true), { color: C.lavender }]}>Your code, {phase.code.length} lines</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>{phase.code.map((l, i) => <RCodeLine key={i} text={l} number={i + 1} size={13} />)}</View>
          </ScrollView>
        </Card>
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <ChunkyButton title={`Take the phase ${phase.number} checkpoint`} onPress={onCheckpoint} />
      </View>
      <Pressable onPress={onBack} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[body(16, true), { textDecorationLine: 'underline' }]}>Back to Learn</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const TYPES: [string, string, keyof typeof Ionicons.glyphMap][] = [
  ['Plan it', C.sun, 'flag'],
  ['Order the code', C.sky, 'code-slash'],
  ['Predict', C.lime, 'terminal'],
  ['Debug', C.orange, 'search'],
  ['Build it', C.hintBlue, 'cube'],
];

export function CheckpointIntro({ phase, onStart, onClose }: { phase: TrackPhase; onStart: () => void; onClose: () => void }) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
      <DottedBackground navy />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={24} color={C.cream} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10, backgroundColor: C.sun, borderWidth: 2, borderColor: C.navy }}>
            <Text style={body(14, true)}>Checkpoint {phase.number}</Text>
          </View>
        </View>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
        <Hero mood="surprised" size={100} dark />
        <Text style={[heading(32), { color: C.cream, textAlign: 'center' }]} accessibilityRole="header">{phase.checkpoint.name}</Text>
        <Text style={[body(15), { color: C.lavender, textAlign: 'center' }]}>5 harder questions. A new problem, using everything from phase {phase.number}.</Text>
        <Card fill={C.hintBlue} radius={20} shadow shadowColor="#050828" contentStyle={{ padding: 14, gap: 3 }}>
          <Text style={heading(18)}>The problem</Text>
          <Text style={body(15)}>{phase.checkpoint.problem}</Text>
        </Card>
        <Card radius={20} shadow shadowColor="#050828" contentStyle={{ padding: 14, gap: 4 }}>
          <Text style={heading(18)}>What's inside</Text>
          {TYPES.map(([name, color, icon], i) => (
            <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 38 }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: color, borderWidth: 2, borderColor: C.navy, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon} size={14} color={C.navy} />
              </View>
              <Text style={[body(15), { flex: 1 }]}>
                <Text style={{ fontFamily: FONTS.bodyBold }}>{name}</Text> · {phase.checkpoint.questions[i]?.prompt ?? ''}
              </Text>
            </View>
          ))}
        </Card>
        <Text style={[body(14), { color: C.lavender, textAlign: 'center' }]}>
          {phase.number >= 5 ? 'Cycle 2 opens at 5 stars here and on every lesson.' : `Phase ${phase.number + 1} opens at 5 stars here and on every lesson.`}
        </Text>
      </ScrollView>
      <View style={{ padding: 16 }}>
        <ChunkyButton title="Start checkpoint" onPress={onStart} />
      </View>
    </SafeAreaView>
  );
}

export function CheckpointResult({ phase, result, onReplay, onDone }: { phase: TrackPhase; result: RunResult; onReplay: () => void; onDone: () => void }) {
  const track = useTrackStore();
  const complete = track.phaseComplete(phase);
  const perfect = isPerfect(result);
  const u = phase.checkpoint.unlock;
  const weak = [
    ...phase.lessons.filter((l) => track.stars(l.id) < l.questions.length).map((l) => [`Part ${l.part} · ${l.title}`, track.stars(l.id)] as [string, number]),
    ...(track.stars(phase.checkpoint.id) < phase.checkpoint.questions.length ? [[`Checkpoint · ${phase.checkpoint.name}`, track.stars(phase.checkpoint.id)] as [string, number]] : []),
  ];
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
      <DottedBackground navy />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 }}>
        <Pressable onPress={onDone} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={24} color={C.cream} />
        </Pressable>
        <View style={{ height: 36, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 8, paddingRight: 12, borderRadius: 18, backgroundColor: C.lime, borderWidth: BORDER, borderColor: C.navy }}>
          <BoltIcon size={18} />
          <Text style={heading(18)}>+{result.earned + result.bonus}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
        <Hero mood={perfect ? 'hearts' : 'wink'} size={100} dark />
        <Text style={[heading(34), { color: C.cream, textAlign: 'center' }]} accessibilityRole="header">
          {complete && phase.number >= 5 ? 'Cycle 1 complete' : perfect ? 'Perfect checkpoint' : 'Checkpoint done'}
        </Text>
        <Text style={[body(16), { color: C.lavender, textAlign: 'center' }]}>Phase {phase.number} · {phase.checkpoint.name}{perfect && result.firstAttempt ? ' · first try' : ''}</Text>
        <Card radius={20} shadow shadowColor="#050828" contentStyle={{ padding: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={body(17, true)}>{result.stars} of {result.total} right first try</Text>
            {result.bonus > 0 && (
              <View style={{ paddingHorizontal: 9, paddingVertical: 2, borderRadius: 9, backgroundColor: C.sun, borderWidth: 2, borderColor: C.navy }}>
                <Text style={body(13, true)}>+30 perfect bonus</Text>
              </View>
            )}
          </View>
          <StarsRow filled={result.stars} total={result.total} size={44} />
        </Card>
        {complete ? (
          <Card radius={20} shadow shadowColor="#050828" contentStyle={{ padding: 16, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="lock-open" size={18} color={C.navy} />
              <View style={{ paddingHorizontal: 8, paddingVertical: 1, borderRadius: 8, backgroundColor: C.lime, borderWidth: 1.5, borderColor: C.navy }}><Text style={body(13, true)}>{u[0]}</Text></View>
            </View>
            <Text style={heading(24)}>{u[1]}</Text>
            <Text style={body(15)}>{u[2]}</Text>
          </Card>
        ) : (
          <Card radius={20} shadow shadowColor="#050828" contentStyle={{ padding: 16, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="lock-closed" size={16} color={C.muted} />
              <Text style={[body(14, true), { color: C.muted }]}>{phase.number >= 5 ? 'Cycle 2 is still locked' : `Phase ${phase.number + 1} is still locked`}</Text>
            </View>
            <Text style={body(15)}>Get 5 stars on every lesson in this phase to open it. Still to fix:</Text>
            {weak.map(([t, s]) => (
              <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 30 }}>
                <StarIcon />
                <Text style={[body(15, true), { flex: 1 }]}>{t}</Text>
                <Text style={body(14, true)}>{s}/5</Text>
              </View>
            ))}
            <Text style={[body(13), { color: C.muted }]}>Replays only pay bolts for questions you missed the first time.</Text>
          </Card>
        )}
      </ScrollView>
      {complete ? (
        <View style={{ padding: 16 }}>
          <ChunkyButton title={phase.number >= 5 ? 'Start cycle 2' : `Start phase ${phase.number + 1}`} onPress={onDone} />
        </View>
      ) : (
        <>
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <ChunkyButton title="Replay the checkpoint" onPress={onReplay} />
          </View>
          <Pressable onPress={onDone} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[body(16, true), { color: C.cream, textDecorationLine: 'underline' }]}>Back to Learn</Text>
          </Pressable>
        </>
      )}
    </SafeAreaView>
  );
}
