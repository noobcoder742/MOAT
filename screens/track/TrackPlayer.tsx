import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../hooks/useAppStore';
import { useTrackStore } from '../../hooks/useTrackStore';
import { Card, ChunkyButton, DottedBackground } from '../../components/ui';
import { BoltPill, CheckIcon, CoachRow, CrossIcon, DoneTick, FeedbackSheet, LiveOutput, ProjectCard, PromptBubble, QuitSheet, RCodeLine, SegmentBar, StarSlots, moodPlan } from '../../components/trackKit';
import { BORDER, C, body, heading, monoBold } from '../../utils/theme';
import { RunResult, TrackLesson, TrackPhase, TrackQuestion, correctMany, correctOne, labelOf, moodImage } from '../../types/models';

interface QState {
  pick: string | null;
  seq: string[];
  order: string[];
  checked: boolean;
}
const fresh = (q: TrackQuestion): QState => ({ pick: null, seq: [], order: q.start ?? [], checked: false });

const STYLE_TAG: Record<string, [string, string]> = {
  plan: ['Plan it', C.sun],
  code: ['Order the code', C.sky],
  predict: ['Predict', C.lime],
  debug: ['Debug', C.orange],
  build: ['Build it', C.hintBlue],
};

/** Plays one lesson (5 questions) or the phase checkpoint (5 questions in navy exam mode). TrackPlayer_updated.swift */
export default function TrackPlayer({ phase, lesson, onFinish, onQuit }: { phase: TrackPhase; lesson: TrackLesson | null; onFinish: (r: RunResult) => void; onQuit: () => void }) {
  const app = useAppStore();
  const track = useTrackStore();
  const isCheckpoint = lesson === null;
  const questions = lesson?.questions ?? phase.checkpoint.questions;
  const itemID = lesson?.id ?? phase.checkpoint.id;
  const [index, setIndex] = useState(0);
  const q = questions[index];
  const [qs, setQs] = useState<QState>(() => fresh(questions[0]));
  const [firstTry, setFirstTry] = useState<Set<string>>(new Set());
  const [missed, setMissed] = useState<Set<string>>(new Set());
  const [hintOpen, setHintOpen] = useState(false);
  const [showQuit, setShowQuit] = useState(false);
  const started = useRef(Date.now());
  const form = app.progress.currentForm;

  const isRight = useMemo(() => {
    switch (q.kind) {
      case 'fill':
      case 'predict':
      case 'bug':
        return qs.pick !== null && qs.pick === correctOne(q);
      case 'build':
        return qs.seq.length > 0 && qs.seq.map((id) => labelOf(q, id)).join('|') === correctMany(q).map((id) => labelOf(q, id)).join('|');
      case 'order':
        return (q.accept ?? []).some((a) => a.join('|') === qs.order.join('|'));
    }
  }, [q, qs]);
  const correct = qs.checked && isRight;
  const earnedNow = correct && firstTry.has(q.id) && track.pays(q);
  const boltBase = 10 * questions.slice(0, index).filter((x) => firstTry.has(x.id) && track.pays(x)).length;
  const canCheck = q.kind === 'build' ? qs.seq.length > 0 : q.kind === 'order' ? true : qs.pick !== null;
  const moods = moodPlan(index + (isCheckpoint ? 0 : lesson?.part ?? 0));
  const mood = !qs.checked ? moods.ask : correct ? moods.ok : moods.bad;

  useEffect(() => {
    if (qs.checked && correct) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [qs.checked]); // eslint-disable-line react-hooks/exhaustive-deps

  const kindLabel = { fill: 'Fill the blank', predict: 'Predict the output', bug: 'Find the bug', build: 'Build the line', order: 'Order' }[q.kind];
  const sub = isCheckpoint ? `Checkpoint ${phase.number} · Q${index + 1} of ${questions.length}` : `Part ${lesson?.part ?? 1} of 4 · ${kindLabel}`;
  const tag = isCheckpoint ? STYLE_TAG[q.style ?? 'predict'] : undefined;
  const okTitle = q.kind === 'bug' ? 'Found it' : q.kind === 'build' ? 'Built' : q.kind === 'order' ? (q.style === 'code' ? 'It runs' : 'Planned') : 'Correct';
  const sheetMessage = correct ? q.ok : q.kind === 'build' ? q.wrongBuild ?? 'Check the order of the pieces.' : q.kind === 'order' ? q.wrong ?? 'Check which steps depend on earlier ones.' : q.fb?.[qs.pick ?? ''] ?? 'Have another look.';
  let combo = 0;
  for (let i = index; i >= 0; i--) {
    if (firstTry.has(questions[i].id)) combo++;
    else break;
  }
  const comboText = combo <= 1 ? 'first try' : `${combo} in a row`;

  const screen = q.screen ?? {};
  const live: LiveOutput =
    q.kind === 'predict'
      ? qs.checked
        ? { label: 'Output', text: screen.done ?? '', color: C.lime }
        : { label: screen.idleLabel ?? 'Output', text: screen.idle ?? '?', color: screen.idle ? C.cream : C.number }
      : q.kind === 'bug'
        ? correct
          ? { label: 'Output after the fix', text: screen.done ?? '', color: C.lime }
          : { label: 'Error', text: screen.err ?? '', color: C.errText }
        : { label: 'Goal', text: screen.goal ?? '', color: C.cream };

  const check = () => {
    if (!canCheck || qs.checked) return;
    if (isRight) {
      if (!missed.has(q.id)) setFirstTry((s) => new Set(s).add(q.id));
    } else setMissed((s) => new Set(s).add(q.id));
    setHintOpen(false);
    setQs((s) => ({ ...s, checked: true }));
  };
  const retry = () => setQs(fresh(q));
  const advance = () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setQs(fresh(questions[index + 1]));
      setHintOpen(false);
    } else {
      const result = track.record(itemID, questions, firstTry);
      app.creditTrack(result.earned + result.bonus);
      track.addTime((Date.now() - started.current) / 1000);
      onFinish(result);
    }
  };
  const move = (i: number, d: number) => {
    if (qs.checked) return;
    const j = i + d;
    if (j < 0 || j >= qs.order.length) return;
    const o = [...qs.order];
    [o[i], o[j]] = [o[j], o[i]];
    setQs({ ...qs, order: o });
  };
  const positionOK = (i: number, id: string) => (q.accept ?? []).some((a) => a[i] === id);
  const toggleSeq = (id: string) => {
    if (qs.checked) return;
    setQs({ ...qs, seq: qs.seq.includes(id) ? qs.seq.filter((x) => x !== id) : [...qs.seq, id] });
  };

  // ---------- shared pieces ----------
  const optionState = (id: string): { fill: string; op: number; ok: boolean; x: boolean } => {
    if (qs.checked) {
      if (id === correctOne(q)) return { fill: C.lime, op: 1, ok: true, x: false };
      if (qs.pick === id) return { fill: C.peach, op: 1, ok: false, x: true };
      return { fill: C.card, op: 0.5, ok: false, x: false };
    }
    return { fill: qs.pick === id ? C.lime : C.card, op: 1, ok: false, x: false };
  };
  const pieces = (dark: boolean) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {(q.opts ?? []).map((o) => {
        const used = qs.seq.includes(o.id);
        return (
          <Pressable key={o.id} onPress={() => toggleSeq(o.id)} accessibilityRole="button" accessibilityState={{ selected: used }}>
            <Card fill={used ? C.locked : C.card} radius={14} shadow shadowColor={dark ? C.shadowDark : C.navy} style={{ opacity: used ? 0.55 : 1 }} contentStyle={{ minWidth: 46, minHeight: dark ? 44 : 46, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={monoBold(16)}>{o.label}</Text>
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
  const bugLine = (i: number, line: { id: string; label: string }, magnifier = false) => {
    const picked = qs.pick === line.id;
    let bg = 'transparent', fg = C.cream, edge = 'transparent';
    if (qs.checked) {
      if (line.id === correctOne(q)) { bg = C.lime; fg = C.navy; edge = C.lime; }
      else if (picked) { bg = C.peach; fg = C.navy; edge = C.peach; }
    } else if (picked) { bg = 'rgba(181,224,74,0.22)'; edge = C.lime; }
    return (
      <Pressable key={line.id} onPress={() => !qs.checked && setQs({ ...qs, pick: line.id })} accessibilityRole="button" accessibilityState={{ selected: picked }} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, borderRadius: 12, borderWidth: 2, borderColor: edge, backgroundColor: bg }}>
        <Text style={[monoBold(13), { color: fg, opacity: 0.6, width: 18, textAlign: 'right' }]}>{i + 1}</Text>
        <Text style={[monoBold(15), { color: fg, flex: 1 }]}>{line.label}</Text>
        {magnifier && <Ionicons name="search" size={14} color={fg} style={{ opacity: 0.7 }} />}
      </Pressable>
    );
  };
  const arrows = (i: number, color: string) => (
    <View style={{ flexDirection: 'row' }}>
      {[-1, 1].map((d) => (
        <Pressable key={d} onPress={() => move(i, d)} accessibilityRole="button" accessibilityLabel={`${d < 0 ? 'Move up' : 'Move down'}: ${labelOf(q, qs.order[i])}`} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: qs.checked || (d < 0 && i === 0) || (d > 0 && i === qs.order.length - 1) ? 0.3 : 1 }}>
          <Ionicons name={d < 0 ? 'chevron-up' : 'chevron-down'} size={18} color={color} />
        </Pressable>
      ))}
    </View>
  );
  const editor = (file: string, trailing: React.ReactNode, children: React.ReactNode) => (
    <View>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 4, bottom: -4, borderRadius: 18, backgroundColor: '#050828' }} />
      <View style={{ borderRadius: 18, borderWidth: BORDER, borderColor: C.sky, backgroundColor: C.editor, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
          {[C.orange, C.sun, C.lime].map((c) => <View key={c} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c }} />)}
          <Text style={[monoBold(13), { color: C.lavender, marginLeft: 6, flex: 1 }]}>{file}</Text>
          {trailing}
        </View>
        {children}
      </View>
    </View>
  );

  // ---------- lesson layout (light) ----------
  const lessonBody = (
    <>
      <ProjectCard phase={phase} part={lesson?.part ?? 1} live={live} />
      <Card fill={C.screen} radius={20} shadow contentStyle={{ paddingHorizontal: 14, paddingVertical: 10, gap: 6 }}>
        <Text style={[body(14, true), { color: C.lavender }]}>R</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ gap: q.kind === 'bug' ? 4 : 0 }}>
            {q.kind === 'bug'
              ? (q.lines ?? []).map((l, i) => bugLine(i, l))
              : (q.code ?? []).map((l, i) => <RCodeLine key={i} text={l} number={i + 1} blankFill={q.kind === 'fill' && qs.pick ? labelOf(q, qs.pick) : null} />)}
            {q.kind === 'build' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 30 }}>
                <Text style={[monoBold(13), { color: C.lilac, width: 18, textAlign: 'right' }]}>{(q.code ?? []).length + 1}</Text>
                {qs.seq.length === 0 ? (
                  <Text style={[body(15), { color: C.lavender }]}>Tap pieces below</Text>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 5 }}>
                    {qs.seq.map((id, k) => (
                      <View key={k} style={{ backgroundColor: C.lime, borderRadius: 8, paddingHorizontal: 7, height: 28, justifyContent: 'center' }}>
                        <Text style={monoBold(16)}>{labelOf(q, id)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </Card>
      {(q.kind === 'fill' || q.kind === 'predict') && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {(q.opts ?? []).map((o) => {
            const st = optionState(o.id);
            return (
              <Pressable key={o.id} style={{ width: '48%' }} onPress={() => !qs.checked && setQs({ ...qs, pick: o.id })} accessibilityRole="button" accessibilityState={{ selected: qs.pick === o.id }}>
                <Card fill={st.fill} radius={16} shadow style={{ opacity: st.op }} contentStyle={{ minHeight: 54, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {st.ok && <CheckIcon size={15} strokeWidth={3} />}
                  {st.x && <CrossIcon size={15} />}
                  <Text style={[monoBold(16), { textAlign: 'center', flexShrink: 1 }]}>{o.label}</Text>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
      {q.kind === 'build' && (
        <View style={{ gap: 8 }}>
          <Text style={[body(14), { color: C.muted }]}>Tap a piece to add it. Tap it again to take it out.</Text>
          {pieces(false)}
        </View>
      )}
      {q.kind === 'bug' && <Text style={[body(15), { color: C.muted }]}>Tap the line that causes the error.</Text>}
    </>
  );

  // ---------- checkpoint layouts (navy) ----------
  const style = q.style ?? 'predict';
  const checkpointBody = (
    <>
      {style === 'plan' && (
        <View style={{ gap: 10 }}>
          <Card fill={C.hintBlue} radius={20} shadow shadowColor={C.shadowDark} contentStyle={{ paddingHorizontal: 14, paddingVertical: 9 }}>
            <Text style={[body(13, true), { color: C.muted }]}>The problem</Text>
            <Text style={body(15)}>{q.task ?? phase.checkpoint.problem}</Text>
          </Card>
          <View>
            <View style={{ position: 'absolute', left: 17, top: 16, bottom: 16, width: 4, borderLeftWidth: 4, borderStyle: 'dashed', borderColor: C.sun }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={{ width: 38, alignItems: 'center' }}><View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: C.sun, borderWidth: 2.5, borderColor: C.cream }} /></View>
              <Text style={[body(13, true), { color: C.sun }]}>Start</Text>
            </View>
            <View style={{ gap: 8 }}>
              {qs.order.map((id, i) => (
                <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.sun, borderWidth: BORDER, borderColor: C.navy, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={heading(17)}>{i + 1}</Text>
                  </View>
                  <Card fill={qs.checked ? (positionOK(i, id) ? C.successSheet : C.peach) : C.card} radius={16} shadow shadowColor={C.shadowDark} style={{ flex: 1 }} contentStyle={{ minHeight: 50, paddingLeft: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[body(15, true), { flex: 1 }]}>{labelOf(q, id)}</Text>
                    {arrows(i, C.navy)}
                  </Card>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <View style={{ width: 38, alignItems: 'center' }}><Ionicons name="flag" size={16} color={C.lime} /></View>
              <Text style={[body(13, true), { color: C.lime }]}>Result</Text>
            </View>
          </View>
        </View>
      )}
      {style === 'code' && (
        <View style={{ gap: 10 }}>
          {editor(
            phase.checkpoint.filename,
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: C.lime }}><Text style={monoBold(12)}>Goal: {q.goal}</Text></View>,
            <View style={{ paddingVertical: 4 }}>
              {qs.order.map((id, i) => (
                <View key={id} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, backgroundColor: qs.checked ? (positionOK(i, id) ? 'rgba(181,224,74,0.28)' : 'rgba(255,138,61,0.34)') : 'transparent' }}>
                  <Text style={[monoBold(13), { color: C.lilac, width: 30, textAlign: 'right' }]}>{i + 1}</Text>
                  <Text style={[monoBold(14), { color: C.cream, paddingLeft: 12, flex: 1 }]}>{labelOf(q, id)}</Text>
                  {arrows(i, C.cream)}
                </View>
              ))}
            </View>,
          )}
          <Text style={[body(14), { color: C.lavender }]}>R runs from top to bottom. A name has to exist before a line uses it.</Text>
        </View>
      )}
      {style === 'predict' && (
        <View style={{ gap: 10 }}>
          {editor(phase.checkpoint.filename, <Text style={[body(12, true), { color: C.lilac }]}>read only</Text>, (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              <View>{(q.code ?? []).map((l, i) => <RCodeLine key={i} text={l} number={i + 1} size={14} />)}</View>
            </ScrollView>
          ))}
          <Card radius={20} shadow shadowColor={C.shadowDark} contentStyle={{ padding: 0 }}>
            <Text style={[monoBold(13), { color: C.cream, backgroundColor: C.navy, paddingHorizontal: 12, paddingVertical: 7 }]}>
              {`> source("${phase.checkpoint.filename}")`}<Text style={{ color: C.lime }}> # what prints?</Text>
            </Text>
            {(q.opts ?? []).map((o) => {
              const st = optionState(o.id);
              return (
                <Pressable key={o.id} onPress={() => !qs.checked && setQs({ ...qs, pick: o.id })} accessibilityRole="button" accessibilityState={{ selected: qs.pick === o.id }} style={{ minHeight: 46, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: st.fill, opacity: st.op, borderTopWidth: 1.5, borderTopColor: C.locked }}>
                  <Text style={[monoBold(15), { color: C.lilac }]}>{'>'}</Text>
                  <Text style={[monoBold(15), { flex: 1 }]}>{o.label}</Text>
                  {st.ok && <CheckIcon size={15} strokeWidth={3} />}
                  {st.x && <CrossIcon size={15} />}
                </Pressable>
              );
            })}
          </Card>
        </View>
      )}
      {style === 'debug' && (
        <View style={{ gap: 10 }}>
          <View style={{ borderRadius: 16, borderWidth: BORDER, borderColor: C.orange, backgroundColor: C.errBg, paddingHorizontal: 14, paddingVertical: 9, gap: 3 }} accessibilityLiveRegion="polite">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="warning" size={18} color={C.orange} />
              <Text style={[body(13, true), { color: C.errText }]}>{live.label}</Text>
            </View>
            <Text style={[monoBold(14), { color: live.color }]}>{live.text}</Text>
          </View>
          {editor(phase.checkpoint.filename, <Text style={[body(12, true), { color: C.lavender }]}>tap the guilty line</Text>, <View style={{ padding: 4 }}>{(q.lines ?? []).map((l, i) => bugLine(i, l, true))}</View>)}
        </View>
      )}
      {style === 'build' && (
        <View style={{ gap: 10 }}>
          <Card radius={20} shadow shadowColor={C.shadowDark} contentStyle={{ paddingHorizontal: 14, paddingVertical: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={heading(18)}>{q.reportTitle ?? 'Report'}</Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 1, borderRadius: 8, backgroundColor: C.sun, borderWidth: 1.5, borderColor: C.navy }}><Text style={body(12, true)}>Last line</Text></View>
            </View>
            {(q.report ?? []).map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 30, borderTopWidth: 1.5, borderTopColor: C.locked }}>
                <DoneTick />
                <Text style={body(14, true)}>{r[0]}</Text>
                <View style={{ flex: 1 }} />
                <Text style={monoBold(14)}>{r[1]}</Text>
              </View>
            ))}
            <View style={{ marginTop: 6, padding: 10, borderRadius: 12, backgroundColor: C.screen, gap: 4 }}>
              {(q.code ?? []).map((l, i) => <Text key={i} style={[monoBold(13), { color: C.lilac }]}>{l}</Text>)}
              <View style={{ minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 6, borderRadius: 9, borderWidth: 2, borderStyle: 'dashed', borderColor: C.lime, flexWrap: 'wrap' }}>
                {qs.seq.length === 0 ? (
                  <Text style={[body(13), { color: C.lavender }]}>{q.slot ?? 'Last line'}: tap pieces below</Text>
                ) : (
                  qs.seq.map((id, k) => (
                    <View key={k} style={{ backgroundColor: C.lime, borderRadius: 7, paddingHorizontal: 6, height: 26, justifyContent: 'center' }}><Text style={monoBold(13)}>{labelOf(q, id)}</Text></View>
                  ))
                )}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <Text style={[body(13, true), { color: C.muted }]}>Goal</Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 1, borderRadius: 8, backgroundColor: C.screen }}><Text style={[monoBold(13), { color: C.lime }]}>{screen.goal}</Text></View>
            </View>
          </Card>
          <View style={{ padding: 10, borderRadius: 18, borderWidth: 2.5, borderStyle: 'dashed', borderColor: C.sun, backgroundColor: 'rgba(255,201,60,0.08)' }}>{pieces(true)}</View>
        </View>
      )}
    </>
  );

  const checkLabel = q.kind === 'order' ? (q.style === 'code' ? 'Run it' : 'Check plan') : 'Check';
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
      <DottedBackground navy={isCheckpoint} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingLeft: 8, paddingRight: 16, marginTop: 8 }}>
        <Pressable onPress={() => setShowQuit(true)} accessibilityRole="button" accessibilityLabel={isCheckpoint ? 'Quit checkpoint' : 'Quit lesson'} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={24} color={isCheckpoint ? C.cream : C.navy} />
        </Pressable>
        {isCheckpoint ? <StarSlots total={questions.length} index={index} currentCorrect={correct} /> : <SegmentBar total={questions.length} index={index} currentCorrect={correct} />}
        <BoltPill key={`bolt-${index}`} base={boltBase} earned={earnedNow} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: qs.checked ? 340 : 24, gap: 10 }} keyboardShouldPersistTaps="handled">
        <CoachRow form={form} mood={mood}>
          <PromptBubble sub={sub} title={q.prompt} hint={q.hint} tag={tag?.[0]} tagColor={tag?.[1]} darkShadow={isCheckpoint} hintOpen={hintOpen} onToggleHint={() => setHintOpen((h) => !h)} />
        </CoachRow>
        {isCheckpoint ? checkpointBody : lessonBody}
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12, opacity: qs.checked ? 0 : 1 }}>
        <ChunkyButton title={checkLabel} enabled={canCheck && !qs.checked} onPress={check} />
      </View>
      {qs.checked && (
        <FeedbackSheet
          key={`${q.id}-${index}`}
          correct={correct}
          title={correct ? okTitle : 'Not quite'}
          message={sheetMessage}
          answerLine={q.kind === 'order' ? undefined : q.answerLine}
          bonusLine={earnedNow ? `+10 bolts, ${comboText}` : undefined}
          note={q.note}
          robot={moodImage(form, correct ? moods.ok : moods.bad)}
          onContinue={advance}
          onRetry={retry}
        />
      )}
      {showQuit && (
        <QuitSheet form={form} questionsDone={index} total={questions.length} bolts={boltBase} onKeep={() => setShowQuit(false)} onLeave={() => { track.addTime((Date.now() - started.current) / 1000); onQuit(); }} />
      )}
    </SafeAreaView>
  );
}
