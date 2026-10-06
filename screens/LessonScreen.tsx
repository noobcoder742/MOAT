import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from '../components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppStore } from '../hooks/useAppStore';
import { BundleImage, Card, ChipLook, ChunkyButton, CodeBlock, FlowWrap, TokenChip } from '../components/ui';
import { BoltIcon, QuitSheet } from '../components/trackKit';
import { BORDER, C, body, code, heading } from '../utils/theme';
import { Question, RobotForm, moodImage } from '../types/models';
import { codeJoin } from '../utils/codeJoin';
import { APIClient, AppConfig } from '../services/apiClient';
import type { RootStackParamList } from '../navigation/RootNavigator';

export const BOLTS_PER_CORRECT = 5;
export const BOLTS_FOR_FINISHING = 10;

/** Shared top bar for the old lesson and game screens. */
export function LessonTopBar({ progress, bolts, finished, onQuit }: { progress: number; bolts: number; finished: boolean; onQuit: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8 }}>
      <Pressable onPress={onQuit} disabled={finished} accessibilityRole="button" accessibilityLabel="Quit lesson" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: finished ? 0 : 1 }}>
        <Ionicons name="close" size={26} color={C.navy} />
      </Pressable>
      <View style={{ flex: 1, height: 16, borderRadius: 8, backgroundColor: C.locked, borderWidth: BORDER, borderColor: C.navy, overflow: 'hidden' }} accessible accessibilityLabel="Lesson progress" accessibilityValue={{ text: `${Math.round(progress * 100)} percent` }}>
        <View style={{ width: `${Math.max(0, progress) * 100}%`, height: '100%', backgroundColor: C.lime }} />
      </View>
      <Card radius={18} contentStyle={{ height: 36, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <BoltIcon size={18} strokeWidth={0} />
        <Text style={heading(18)} accessibilityLabel={`${bolts} bolts earned this lesson`}>+{bolts}</Text>
      </Card>
    </View>
  );
}

/** LessonCompleteView in LessonView.swift. */
export function SimpleLessonComplete({ bolts, form, onContinue }: { bolts: number; form: RobotForm; onContinue: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 20 }}>
      <View style={{ flex: 1 }} />
      <BundleImage name={moodImage(form, 'excited')} style={{ width: 160, height: 190 }} />
      <Text style={heading(32)} accessibilityRole="header">Lesson done!</Text>
      <Card radius={24} shadow contentStyle={{ height: 48, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <BoltIcon size={22} strokeWidth={0} />
        <Text style={heading(22)}>+{bolts} bolts</Text>
      </Card>
      <View style={{ flex: 1 }} />
      <View style={{ alignSelf: 'stretch', padding: 16 }}>
        <ChunkyButton title="Continue" onPress={onContinue} />
      </View>
    </View>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, 'Lesson'>;

export default function LessonScreen({ route, navigation }: Props) {
  const store = useAppStore();
  const lesson = useMemo(() => store.orderedLessons.find((l) => l.id === route.params.lessonId), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [queue, setQueue] = useState<Question[]>(lesson?.questions ?? []);
  const [position, setPosition] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [placed, setPlaced] = useState<number[]>([]);
  const [outcome, setOutcome] = useState<null | 'correct' | 'wrong'>(null);
  const [retried, setRetried] = useState<Set<string>>(new Set());
  const [finishedIDs, setFinishedIDs] = useState<Set<string>>(new Set());
  const [firstTryMisses, setMisses] = useState<Set<string>>(new Set());
  const [bolts, setBolts] = useState(0);
  const [finished, setFinished] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [pairs, setPairs] = useState<Record<number, number>>({});
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const aiRequest = useRef(0);

  if (!lesson) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.cream, padding: 20 }}>
        <Text style={body(16)}>This lesson isn't available.</Text>
        <ChunkyButton title="Back" onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }
  const q: Question | undefined = queue[position];
  const progress = lesson.questions.length ? finishedIDs.size / lesson.questions.length : 1;
  const p = store.progress;

  const look = (option: string): ChipLook => {
    if (!q) return 'normal';
    if (outcome) return option === q.answer[0] ? 'correct' : option === choice ? 'wrong' : 'normal';
    return option === choice ? 'selected' : 'normal';
  };
  const fill = (l: ChipLook) => ({ correct: C.lime, wrong: C.wrongChip, selected: C.hintBlue, normal: C.card, used: C.card }[l]);
  const partners = q ? q.right ?? q.answer : [];
  const currentRow = (count: number) => (activeRow !== null && pairs[activeRow] === undefined ? activeRow : [...Array(count).keys()].find((i) => pairs[i] === undefined) ?? null);

  const canCheck = !q ? false : q.kind === 'build' ? placed.length > 0 : q.kind === 'match' ? Object.keys(pairs).length === q.options.length : choice !== null;

  const check = () => {
    if (!q) return;
    let isRight: boolean;
    if (q.kind === 'build') isRight = codeJoin(placed.map((i) => q.options[i])) === codeJoin(q.answer) && placed.length === q.answer.length && placed.every((i, k) => q.options[i] === q.answer[k]);
    else if (q.kind === 'match') isRight = q.options.every((_, row) => pairs[row] !== undefined && partners[pairs[row]] === q.answer[row]);
    else isRight = choice === q.answer[0];
    if (isRight) {
      if (!firstTryMisses.has(q.id) && !finishedIDs.has(q.id)) setBolts((b) => b + BOLTS_PER_CORRECT);
      setFinishedIDs((s) => new Set(s).add(q.id));
    } else {
      setMisses((s) => new Set(s).add(q.id));
      if (retried.has(q.id)) setFinishedIDs((s) => new Set(s).add(q.id));
      else {
        setRetried((s) => new Set(s).add(q.id));
        setQueue((qq) => [...qq, q]);
      }
    }
    setOutcome(isRight ? 'correct' : 'wrong');
    Haptics.notificationAsync(isRight ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
  };

  const next = () => {
    setChoice(null);
    setPlaced([]);
    setPairs({});
    setActiveRow(null);
    setShowHint(false);
    setOutcome(null);
    setAiText(null);
    setAiLoading(false);
    aiRequest.current++;
    const nextPos = position + 1;
    setPosition(nextPos);
    if (nextPos >= queue.length) {
      setBolts((b) => b + BOLTS_FOR_FINISHING);
      setFinished(true);
    }
  };

  const finish = () => {
    const form = store.completeLesson(lesson, bolts);
    if (form) store.setPendingEvolution(form);
    navigation.goBack();
  };

  const answerText = (qq: Question) => {
    if (qq.kind === 'build') return `Answer: ${codeJoin(qq.answer)}`;
    if (qq.kind === 'bug') return `The mistake: ${(qq.answer[0] ?? '').trim()}`;
    if (qq.kind === 'match') return qq.options.map((o, i) => `${o} -> ${qq.answer[i]}`).join('\n');
    return `Answer: ${qq.answer[0] ?? ''}`;
  };

  const explainMore = async (qq: Question) => {
    const id = ++aiRequest.current;
    setAiLoading(true);
    const learnerAnswer = qq.kind === 'build' ? codeJoin(placed.map((i) => qq.options[i])) : qq.kind === 'match' ? qq.options.map((o, r) => `${o} -> ${pairs[r] !== undefined ? partners[pairs[r]] : '?'}`).join('; ') : choice ?? '';
    let text: string;
    try {
      text = await APIClient.explain({
        questionPrompt: qq.prompt,
        code: qq.kind === 'bug' ? qq.options.join('\n') : qq.code ?? '',
        learnerAnswer,
        correctAnswer: qq.kind === 'match' ? qq.options.map((o, i) => `${o} -> ${qq.answer[i]}`).join('; ') : codeJoin(qq.answer),
        age: p.age,
        studyArea: p.studyArea,
      });
    } catch {
      text = "Couldn't reach the explainer right now. The note above covers the key idea.";
    }
    if (aiRequest.current !== id) return;
    setAiText(text);
    setAiLoading(false);
  };

  const questionBody = (qq: Question) => (
    <View style={{ gap: 16 }}>
      <Text style={heading(24)} accessibilityRole="header">{qq.prompt}</Text>
      {qq.hint ? (
        p.age < 13 || showHint ? (
          <Card fill={C.hintBlue} radius={16} contentStyle={{ padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Ionicons name="bulb" size={18} color={C.navy} />
            <Text style={[body(15), { flex: 1 }]}>{qq.hint}</Text>
          </Card>
        ) : (
          <Pressable onPress={() => setShowHint(true)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}>
            <Ionicons name="bulb-outline" size={18} color={C.navy} />
            <Text style={[body(15, true), { textDecorationLine: 'underline' }]}>Need a hint?</Text>
          </Pressable>
        )
      ) : null}
      {qq.picture ? <Text style={{ fontSize: 56, textAlign: 'center' }} accessibilityElementsHidden>{qq.picture}</Text> : null}
      {qq.code ? <CodeBlock codeText={qq.kind === 'choice' && qq.code.includes('___') ? qq.code.replace('___', choice ?? '____') : qq.code} /> : null}
      {(qq.kind === 'choice') && (
        <FlowWrap style={{ marginTop: 8 }}>
          {qq.options.map((o) => (
            <Pressable key={o} onPress={() => !outcome && setChoice(o)} accessibilityRole="button" accessibilityState={{ selected: choice === o }}>
              <TokenChip text={o} look={look(o)} />
            </Pressable>
          ))}
        </FlowWrap>
      )}
      {qq.kind === 'judge' && (
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          {qq.options.map((o) => (
            <Pressable key={o} style={{ flex: 1 }} onPress={() => !outcome && setChoice(o)} accessibilityRole="button" accessibilityState={{ selected: choice === o }}>
              <Card fill={fill(look(o))} radius={16} shadow contentStyle={{ minHeight: 64, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={heading(22)}>{o}</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
      {qq.kind === 'bug' && (
        <View style={{ gap: 10, marginTop: 8 }}>
          {qq.options.map((line, i) => {
            const indent = line.length - line.trimStart().length;
            return (
              <Pressable key={i} onPress={() => !outcome && setChoice(line)} accessibilityRole="button" accessibilityLabel={`Line ${i + 1}: ${line.trim()}`} accessibilityState={{ selected: choice === line }}>
                <Card fill={fill(look(line))} radius={14} shadow contentStyle={{ minHeight: 52, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={[code(14), { color: C.muted, width: 20 }]}>{i + 1}</Text>
                  <Text style={[code(17), { paddingLeft: indent * 8, flexShrink: 1 }]}>{line.trim()}</Text>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
      {qq.kind === 'build' && (
        <View style={{ gap: 12, marginTop: 8 }}>
          <Card radius={16} contentStyle={{ padding: 10, minHeight: 72 }}>
            <FlowWrap spacing={8}>
              {placed.map((idx, k) => (
                <Pressable key={k} onPress={() => !outcome && setPlaced((pl) => pl.filter((_, j) => j !== k))} accessibilityHint="Tap to take it out">
                  <TokenChip text={qq.options[idx]} look={outcome ? (outcome === 'correct' ? 'correct' : 'wrong') : 'normal'} />
                </Pressable>
              ))}
            </FlowWrap>
          </Card>
          <Text style={[body(14), { color: C.muted, textAlign: 'center' }]}>Tap a piece to add it. Tap it again to take it out.</Text>
          <FlowWrap>
            {qq.options.map((o, idx) => {
              const used = placed.includes(idx);
              return (
                <Pressable key={idx} disabled={used} onPress={() => !outcome && !used && setPlaced((pl) => [...pl, idx])} accessibilityRole="button">
                  <TokenChip text={o} look={used ? 'used' : 'normal'} />
                </Pressable>
              );
            })}
          </FlowWrap>
        </View>
      )}
      {qq.kind === 'match' && (() => {
        const current = outcome ? null : currentRow(qq.options.length);
        return (
          <View style={{ gap: 14, marginTop: 8 }}>
            <View style={{ gap: 10 }}>
              {qq.options.map((text, row) => {
                const partner = pairs[row] !== undefined ? partners[pairs[row]] : null;
                const rl = outcome ? (pairs[row] !== undefined && partners[pairs[row]] === qq.answer[row] ? 'correct' : 'wrong') : row === current ? 'active' : partner ? 'paired' : 'normal';
                const f = { normal: C.card, active: 'rgba(89,180,255,0.45)', paired: C.hintBlue, correct: C.lime, wrong: C.wrongChip }[rl];
                return (
                  <Pressable key={row} onPress={() => { if (outcome) return; setPairs((pp) => { const n = { ...pp }; delete n[row]; return n; }); setActiveRow(row); }} accessibilityLabel={`${text}, matched with ${partner ?? 'nothing yet'}`}>
                    <Card fill={f} radius={14} shadow contentStyle={{ paddingHorizontal: 14, paddingVertical: 10, minHeight: 64, gap: 6 }}>
                      <Text style={code(17)}>{text}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="arrow-forward" size={13} color={partner ? C.navy : C.muted} />
                        <Text style={[code(15), { color: partner ? C.navy : C.muted }]}>{partner ?? 'pick a partner'}</Text>
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[body(14), { color: C.muted, textAlign: 'center' }]}>Pick a partner for the highlighted line. Tap a matched line to change it.</Text>
            <FlowWrap spacing={10}>
              {partners.map((t, j) => {
                const used = Object.values(pairs).includes(j);
                return (
                  <Pressable key={j} disabled={used} onPress={() => { const r = currentRow(qq.options.length); if (outcome || r === null) return; setPairs((pp) => ({ ...pp, [r]: j })); setActiveRow(null); }}>
                    <TokenChip text={t} look={used ? 'used' : 'normal'} />
                  </Pressable>
                );
              })}
            </FlowWrap>
          </View>
        );
      })()}
    </View>
  );

  const feedback = (qq: Question, correct: boolean) => (
    <View style={{ padding: 20, gap: 12, backgroundColor: correct ? C.successSheet : C.missSheet, borderTopWidth: BORDER, borderTopColor: C.navy }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={heading(26)}>{correct ? 'Nice!' : 'Not quite'}</Text>
          {!correct && <Text style={code(15)}>{answerText(qq)}</Text>}
          <Text style={body(16)}>{qq.explanation}</Text>
          {!correct && AppConfig.useAIExplanations && (aiText ? (
            <Card radius={12} contentStyle={{ padding: 12 }}><Text style={body(15)}>{aiText}</Text></Card>
          ) : aiLoading ? (
            <ActivityIndicator color={C.navy} accessibilityLabel="Getting an explanation" />
          ) : (
            <Pressable onPress={() => explainMore(qq)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}>
              <Ionicons name="sparkles" size={16} color={C.navy} />
              <Text style={[body(15, true), { textDecorationLine: 'underline' }]}>Explain more</Text>
            </Pressable>
          ))}
        </View>
        <BundleImage name={moodImage(p.currentForm, correct ? 'excited' : 'surprised')} style={{ width: 72, height: 84 }} />
      </View>
      <ChunkyButton title={correct ? 'Continue' : 'Got it'} fill={correct ? C.lime : C.orange} onPress={next} />
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: C.cream }}>
      <LessonTopBar progress={progress} bolts={bolts} finished={finished} onQuit={() => setConfirmQuit(true)} />
      {finished ? (
        <SimpleLessonComplete bolts={bolts} form={p.currentForm} onContinue={finish} />
      ) : q ? (
        <>
          <ScrollView contentContainerStyle={{ padding: 20 }}>{questionBody(q)}</ScrollView>
          {outcome ? feedback(q, outcome === 'correct') : (
            <View style={{ padding: 16 }}>
              <ChunkyButton title="Check" enabled={canCheck} onPress={check} />
            </View>
          )}
        </>
      ) : null}
      {confirmQuit && (
        <QuitSheet form={p.currentForm} questionsDone={finishedIDs.size} total={lesson.questions.length} bolts={bolts} onKeep={() => setConfirmQuit(false)} onLeave={() => navigation.goBack()} />
      )}
    </SafeAreaView>
  );
}
