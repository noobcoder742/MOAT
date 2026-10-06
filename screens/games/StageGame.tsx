import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useAppStore } from '../../hooks/useAppStore';
import { Card, ChunkyButton } from '../../components/ui';
import { CodeLine, CodePanel, CodeToken, GameFeedbackSheet, RunConsole, RunStep, tk, useStepPlayer } from '../../components/gameKit';
import { BORDER, C, body, code, heading } from '../../utils/theme';
import { moodImage } from '../../types/models';

interface StageOption { id: string; text: string }
interface StagePiece { id: string; text: string; indent: number }
interface StagePart {
  kind: 'choice' | 'order' | 'run';
  name: string;
  prompt: string;
  seq: string;
  reveal: string[];
  showRatio?: string;
  code: CodeLine[];
  options: StageOption[];
  answer: string;
  why: Record<string, string>;
  pieces: StagePiece[];
  trayOrder: string[];
  hint: string;
  ok: string;
  okTitle: string;
}
interface StageConfig {
  title: string;
  legend: string;
  readoutLabel: string;
  fn: string;
  itemWord: string;
  countVar: string;
  seqs: string[];
  targets: string[];
  tileHeights: Record<string, number>;
  program: CodeLine[];
  printSplit: number;
  parts: StagePart[];
}
interface StageSpec {
  title: string; legend: string; readoutLabel: string; fn: string; param: string; countVar: string; list: string; itemWord: string;
  counts: string[]; seqs: string[]; tileHeights?: Record<string, number>;
  p1seq: string; p1char: string; p1prompt: string; p1opts: string[]; p1ans: string; p1why: Record<string, string>; p1ok: string; p2ok: string;
  p3seq: string; p3prompt: string; p3opts: string[]; p3ans: string; p3pct: string; p3why: Record<string, string>; p3ok: string;
}

const blankPart = (kind: StagePart['kind'], name: string, prompt: string): StagePart => ({ kind, name, prompt, seq: '', reveal: [], code: [], options: [], answer: '', why: {}, pieces: [], trayOrder: [], hint: '', ok: '', okTitle: 'Nice!' });
const opts = (texts: string[]) => texts.map((t, i) => ({ id: 'abcd'[i], text: t }));

/** StageSpec.build() in StageGames.swift. */
function build(s: StageSpec): StageConfig {
  const countTokens: CodeToken[] = [tk(s.countVar, ''), tk('=')];
  s.counts.forEach((ch, i) => {
    if (i > 0) countTokens.push(tk('+'));
    countTokens.push(tk(`${s.param}.count(`, ' '));
    countTokens.push(tk(`"${ch}"`, '', 'string', ch));
    countTokens.push(tk(')', ''));
  });
  const countText = s.countVar + ' = ' + s.counts.map((c) => `${s.param}.count("${c}")`).join(' + ');
  const listTokens: CodeToken[] = [tk(s.list, ''), tk('=')];
  s.seqs.forEach((q, i) => {
    const last = i === s.seqs.length - 1;
    listTokens.push(tk(last ? `"${q}"]` : i === 0 ? `["${q}",` : `"${q}",`, ' ', 'string'));
  });
  const defLine: CodeLine = { indent: 0, tokens: [tk('def', '', 'keyword'), tk(`${s.fn}(`, ' '), tk(s.param, ''), tk('):', '')] };
  const countLine: CodeLine = { indent: 1, tokens: countTokens };
  const returnLine: CodeLine = { indent: 1, tokens: [tk('return', '', 'keyword'), tk(s.countVar, ' '), tk('/'), tk(`len(${s.param})`)] };
  const listLine: CodeLine = { indent: 0, tokens: listTokens };
  const forLine: CodeLine = { indent: 0, tokens: [tk('for', '', 'keyword'), tk(s.param, ' '), tk('in', ' ', 'keyword'), tk(s.list, ' '), tk(':', '')] };
  const printLine: CodeLine = { indent: 1, tokens: [tk('print(', '', 'keyword'), tk(`${s.fn}(`, ''), tk(s.param, ''), tk(')', ''), tk(')', '')] };
  const program = [defLine, countLine, returnLine, listLine, forLine, printLine];

  const p1 = blankPart('choice', 'String method', s.p1prompt);
  Object.assign(p1, { seq: s.p1seq, reveal: [s.p1char], code: [{ indent: 0, tokens: [tk('print(', '', 'keyword'), tk(`"${s.p1seq}"`, '', 'string'), tk('.count(', ''), tk(`"${s.p1char}"`, '', 'string'), tk(')', ''), tk(')', '')] }], options: opts(s.p1opts), answer: s.p1ans, why: s.p1why, ok: s.p1ok, okTitle: 'Nice!' });
  const p2 = blankPart('order', 'Build the function', 'Tap the lines in the right order to build the function.');
  Object.assign(p2, {
    seq: s.seqs[0], reveal: s.counts,
    pieces: [{ id: 'p1', text: `def ${s.fn}(${s.param}):`, indent: 0 }, { id: 'p2', text: countText, indent: 1 }, { id: 'p3', text: `return ${s.countVar} / len(${s.param})`, indent: 1 }],
    trayOrder: ['p3', 'p1', 'p2'], hint: 'The def line comes first. The lines under it are indented, and return goes last.', ok: s.p2ok, okTitle: 'Built!',
  });
  const p3 = blankPart('choice', 'Call it', s.p3prompt);
  Object.assign(p3, { seq: s.p3seq, reveal: s.counts, showRatio: s.p3pct, code: [defLine, countLine, returnLine, { indent: 0, tokens: [tk('print(', '', 'keyword'), tk(`${s.fn}(`, ''), tk(`"${s.p3seq}"`, '', 'string'), tk(')', ''), tk(')', '')] }], options: opts(s.p3opts), answer: s.p3ans, why: s.p3why, ok: s.p3ok, okTitle: 'Right!' });
  const p4 = blankPart('choice', 'Loop it', `Which name goes in the blank so the loop visits every ${s.itemWord}?`);
  Object.assign(p4, {
    seq: s.seqs[0], code: [listLine, { indent: 0, tokens: [tk('for', '', 'keyword'), tk(s.param, ' '), tk('in', ' ', 'keyword'), tk('', ' ', 'input'), tk(':', '')] }, printLine],
    options: opts([s.fn, `"${s.param}"`, s.list, `len(${s.param})`]), answer: 'c',
    why: { a: `${s.fn} is the function. The loop needs the list.`, b: 'In quotes it is just text, so the loop would go letter by letter.', d: 'len gives a number, and a loop cannot walk through a number.' },
    ok: `The loop walks through ${s.list}, one ${s.itemWord} at a time.`, okTitle: 'Looped!',
  });
  const p5 = blankPart('run', 'Run it', `Run the whole program and watch each ${s.itemWord} get counted.`);
  Object.assign(p5, { seq: s.seqs[0], ok: 'A function, a string method and a loop, all working together.' });
  return { title: s.title, legend: s.legend, readoutLabel: s.readoutLabel, fn: s.fn, itemWord: s.itemWord, countVar: s.countVar, seqs: s.seqs, targets: s.counts, tileHeights: s.tileHeights ?? {}, program, printSplit: 3, parts: [p1, p2, p3, p4, p5] };
}

/** StageCatalog in StageGames.swift. */
export const STAGES: Record<string, StageConfig> = {
  stage_gc: build({
    title: 'GC content lab', legend: 'G and C are the letters we count', readoutLabel: 'GC content', fn: 'gc_content', param: 'sequence', countVar: 'gc', list: 'sequences', itemWord: 'strand',
    counts: ['G', 'C'], seqs: ['ATGCGT', 'GGCAAT', 'TTATGC'],
    p1seq: 'ATGCGT', p1char: 'G', p1prompt: 'What does "ATGCGT".count("G") give?', p1opts: ['1', '2', '3', '6'], p1ans: 'b',
    p1why: { a: 'ATGCGT has two Gs. Count them again.', c: '3 is G and C together. count("G") counts only the Gs.', d: '6 is the length of the strand, not the number of Gs.' },
    p1ok: 'There are 2 Gs in ATGCGT, so count("G") gives 2.', p2ok: 'It counts G and C, then divides by the strand length.',
    p3seq: 'GGCAAT', p3prompt: 'What does gc_content("GGCAAT") return?', p3opts: ['3', '6', '0.3333333333333333', '0.5'], p3ans: 'd', p3pct: '50%',
    p3why: { a: 'That is gc, the count. return divides it by the length, 6.', b: 'That is len(sequence). return gives gc / len(sequence).', c: 'That is the ratio for another strand. GGCAAT has 2 Gs and 1 C, so 3 / 6.' },
    p3ok: 'gc is 3 and the length is 6, so it returns 3 / 6 = 0.5.',
  }),
  stage_duty: build({
    title: 'Duty cycle lab', legend: '1 = high, 0 = low', readoutLabel: 'Duty cycle', fn: 'duty_cycle', param: 'signal', countVar: 'highs', list: 'signals', itemWord: 'signal',
    counts: ['1'], seqs: ['1100', '1110', '1000'], tileHeights: { '1': 46, '0': 20 },
    p1seq: '1101', p1char: '1', p1prompt: 'What does "1101".count("1") give?', p1opts: ['1', '2', '3', '4'], p1ans: 'c',
    p1why: { a: '1101 has three 1s. Count them again.', b: '1101 has three 1s, not two.', d: '4 is the length of the signal, not the number of 1s.' },
    p1ok: 'There are three 1s in 1101, so count("1") gives 3.', p2ok: 'It counts the 1s, then divides by the signal length.',
    p3seq: '1110', p3prompt: 'What does duty_cycle("1110") return?', p3opts: ['0.25', '3', '4', '0.75'], p3ans: 'd', p3pct: '75%',
    p3why: { a: 'That is the ratio for "1000". 1110 has three 1s out of 4.', b: 'That is highs, the count. return divides it by the length, 4.', c: 'That is len(signal). return gives highs / len(signal).' },
    p3ok: 'highs is 3 and the length is 4, so it returns 3 / 4 = 0.75.',
  }),
  stage_conversion: build({
    title: 'Conversion lab', legend: 'S = sale, N = no sale', readoutLabel: 'Conversion', fn: 'conversion_rate', param: 'log', countVar: 'sales', list: 'logs', itemWord: 'log',
    counts: ['S'], seqs: ['SNSNN', 'SSSNN', 'NNNNS'],
    p1seq: 'SNSNN', p1char: 'S', p1prompt: 'S = sale, N = no sale. What does "SNSNN".count("S") give?', p1opts: ['1', '2', '3', '5'], p1ans: 'b',
    p1why: { a: 'SNSNN has two Ss. Count them again.', c: 'SNSNN is S, N, S, N, N. That is two Ss, not three.', d: '5 is the length of the log, not the number of Ss.' },
    p1ok: 'There are 2 Ss in SNSNN, so count("S") gives 2.', p2ok: 'It counts the sales, then divides by the log length.',
    p3seq: 'SSSNN', p3prompt: 'What does conversion_rate("SSSNN") return?', p3opts: ['0.4', '3', '5', '0.6'], p3ans: 'd', p3pct: '60%',
    p3why: { a: 'That is the ratio for another log. SSSNN has three Ss out of 5.', b: 'That is sales, the count. return divides it by the length, 5.', c: 'That is len(log). return gives sales / len(log).' },
    p3ok: 'sales is 3 and the length is 5, so it returns 3 / 5 = 0.6.',
  }),
};

/** Python's str(float): 0.5, 0.75, 0.3333333333333333 */
const pyFloat = (v: number) => (Number.isInteger(v) ? v.toFixed(1) : String(v));

function runSteps(c: StageConfig): RunStep[] {
  const prog = c.program;
  const steps: RunStep[] = [];
  prog[0].tokens.forEach((_, t) => steps.push({ line: 0, tok: t, wait: 150, caption: t === 0 ? 'def only saves the recipe. Nothing runs yet.' : undefined }));
  steps.push({ line: 0, tok: 99, wait: 450 });
  prog[3].tokens.forEach((_, t) => steps.push({ line: 3, tok: t, wait: 150, caption: t === 0 ? `The list holds three ${c.itemWord}s.` : undefined }));
  steps.push({ line: 3, tok: 99, wait: 350 });
  c.seqs.forEach((seq, i) => {
    const w = i === 0 ? 170 : i === 1 ? 95 : 55;
    const counts: Record<string, number> = {};
    let total = 0;
    for (const ch of c.targets) {
      const n = seq.split('').filter((x) => x === ch).length;
      counts[ch] = n;
      total += n;
    }
    const ratioText = pyFloat(total / seq.length);
    prog[4].tokens.forEach((_, t) => steps.push(t === 0 ? { line: 4, tok: t, wait: w, seqIndex: i, clearHighlights: true, caption: `Loop ${i + 1} of ${c.seqs.length}: this ${c.itemWord} is "${seq}".` } : { line: 4, tok: t, wait: w }));
    for (let t = 0; t < c.printSplit; t++) steps.push({ line: 5, tok: t, wait: w, caption: t === 0 ? `${c.fn} is called with this ${c.itemWord}.` : undefined });
    prog[1].tokens.forEach((token, t) => steps.push(token.hl ? { line: 1, tok: t, wait: w, highlight: token.hl, caption: `count("${token.hl}") finds ${counts[token.hl] ?? 0}.` } : { line: 1, tok: t, wait: w }));
    steps.push({ line: 1, tok: 99, wait: w * 2 + 150, caption: `${c.countVar} = ${total}` });
    prog[2].tokens.forEach((_, t) => steps.push(t === prog[2].tokens.length - 1 ? { line: 2, tok: t, wait: w, ratio: ratioText, caption: `return ${total} / ${seq.length} = ${ratioText}` } : { line: 2, tok: t, wait: w }));
    for (let t = c.printSplit; t < prog[5].tokens.length; t++) steps.push(t === prog[5].tokens.length - 1 ? { line: 5, tok: t, wait: w, output: ratioText, caption: `print shows ${ratioText}.` } : { line: 5, tok: t, wait: w });
    steps.push({ line: 5, tok: 99, wait: w * 2 + 200 });
  });
  steps.push({ wait: 300, finish: true });
  return steps;
}

export function StageGame({ game, onProgress, onBolts, onDone }: { game: string; onProgress: (p: number) => void; onBolts: (n: number) => void; onDone: () => void }) {
  const config = STAGES[game];
  const store = useAppStore();
  const player = useStepPlayer();
  const [partIndex, setPartIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [placed, setPlaced] = useState<string[]>([]);
  const [slotBad, setSlotBad] = useState<boolean[]>([]);
  const [result, setResult] = useState<'pending' | 'correct' | 'wrong'>('pending');
  const [runPhase, setRunPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [line, setLine] = useState(-1);
  const [tok, setTok] = useState(-1);
  const [seqIndex, setSeqIndex] = useState(-1);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [ratio, setRatio] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [missed, setMissed] = useState<Set<number>>(new Set());

  const part = config.parts[partIndex];
  const isLast = partIndex === config.parts.length - 1;
  useEffect(() => {
    if (result === 'correct') {
      if (!missed.has(partIndex)) onBolts(5);
      onProgress((partIndex + 1) / config.parts.length);
    }
  }, [result]); // eslint-disable-line react-hooks/exhaustive-deps

  const tiles = (part.kind === 'run' ? config.seqs[Math.max(0, seqIndex)] : part.seq).split('');
  const lit = part.kind === 'run' ? highlights : result === 'correct' ? part.reveal : [];
  const readout = part.kind === 'run' ? (ratio !== null ? `${Math.round(Number(ratio) * 100)}%` : '—') : (result === 'correct' ? part.showRatio : undefined) ?? '—';
  const wrongMessage = part.kind === 'order' ? part.hint : part.why[picked ?? ''] ?? 'Have another look.';

  const pick = (id: string) => {
    if (result !== 'pending' || part.kind !== 'choice') return;
    setPicked(id);
    if (id === part.answer) setResult('correct');
    else {
      setResult('wrong');
      setMissed((m) => new Set(m).add(partIndex));
    }
  };
  const place = (id: string) => {
    if (result !== 'pending' || part.kind !== 'order' || placed.includes(id)) return;
    const next = [...placed, id];
    setPlaced(next);
    if (next.length !== part.pieces.length) return;
    const bad = next.map((pid, i) => pid !== part.pieces[i].id);
    setSlotBad(bad);
    if (bad.includes(true)) {
      setResult('wrong');
      setMissed((m) => new Set(m).add(partIndex));
    } else setResult('correct');
  };
  const unplace = (i: number) => {
    if (result !== 'pending' || i >= placed.length) return;
    setPlaced(placed.filter((_, j) => j !== i));
  };
  const clearRun = () => {
    setLine(-1); setTok(-1); setSeqIndex(-1); setHighlights([]); setRatio(null); setOutputs([]); setCaption('');
  };
  const retry = () => {
    player.cancel();
    setPicked(null); setPlaced([]); setSlotBad([]); setResult('pending');
  };
  const next = () => {
    player.cancel();
    setPartIndex((i) => i + 1);
    setPicked(null); setPlaced([]); setSlotBad([]); setResult('pending'); setRunPhase('idle');
    clearRun();
  };
  const startRun = () => {
    if (part.kind !== 'run' || runPhase !== 'idle') return;
    clearRun();
    setRunPhase('running');
    player.play(runSteps(config), (s) => {
      if (s.finish) {
        setLine(-1); setTok(-1); setRunPhase('done'); setResult('correct');
        return;
      }
      if (s.line !== undefined) { setLine(s.line); setTok(s.tok ?? 0); }
      if (s.seqIndex !== undefined) setSeqIndex(s.seqIndex);
      if (s.clearHighlights) { setHighlights([]); setRatio(null); }
      if (s.highlight) setHighlights((h) => [...h, s.highlight as string]);
      if (s.ratio) setRatio(s.ratio);
      if (s.output) setOutputs((o) => [...o, s.output as string]);
      if (s.caption) setCaption(s.caption);
    });
  };

  const optionFill = (id: string) => (picked !== id ? C.card : result === 'correct' ? C.lime : C.wrongChip);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Text style={heading(24)} accessibilityRole="header">{config.title}</Text>
        <Text style={[body(14, true), { color: C.muted }]}>Part {partIndex + 1} of {config.parts.length} · {part.name}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {config.parts.map((_, i) => {
            const done = i < partIndex || (i === partIndex && result === 'correct');
            const current = i === partIndex && !done;
            return <View key={i} style={{ flex: 1, height: 10, borderRadius: 5, borderWidth: 2, borderColor: C.navy, backgroundColor: done ? C.lime : current ? C.card : C.locked }} />;
          })}
        </View>
        <Card radius={16} shadow contentStyle={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, flexWrap: 'wrap' }}>
              {tiles.map((t, i) => {
                const on = lit.includes(t);
                return (
                  <View key={i} style={{ width: 30, height: config.tileHeights[t] ?? 34, borderRadius: 6, borderWidth: 2, borderColor: C.navy, backgroundColor: on ? C.lime : C.card, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={code(15)}>{t}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={[body(12), { color: C.muted }]}>{config.legend}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={[body(12, true), { color: C.muted }]}>{config.readoutLabel}</Text>
            <Text style={heading(26)}>{readout}</Text>
          </View>
        </Card>
        <Text style={heading(18)}>{part.prompt}</Text>
        {part.kind === 'choice' && (
          <View style={{ gap: 8 }}>
            <CodePanel
              lines={part.code}
              input={(size) => {
                const chosen = part.options.find((o) => o.id === picked);
                const color = !chosen ? C.muted : result === 'correct' ? C.codeString : C.codeNumber;
                return <Text style={[code(size), { color }]}>{chosen?.text ?? '_______'}</Text>;
              }}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {part.options.map((o) => (
                <Pressable key={o.id} onPress={() => pick(o.id)} style={{ width: '48.5%' }} accessibilityRole="button" accessibilityState={{ selected: picked === o.id }}>
                  <Card fill={optionFill(o.id)} radius={14} shadow contentStyle={{ minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
                    <Text style={code(15)} numberOfLines={1} adjustsFontSizeToFit>{o.text}</Text>
                  </Card>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {part.kind === 'order' && (
          <View style={{ gap: 8 }}>
            <View style={{ gap: 6 }}>
              {part.pieces.map((_, i) => {
                const id = placed[i];
                const piece = part.pieces.find((p) => p.id === id);
                const bad = result === 'wrong' && slotBad[i];
                const fill = !piece ? C.locked : result === 'pending' ? C.card : bad ? C.missSheet : C.successSheet;
                const edge = !piece ? C.lockedEdge : bad ? C.orange : C.navy;
                return (
                  <Pressable key={i} onPress={() => unplace(i)} accessibilityRole="button">
                    <View style={{ minHeight: 44, borderRadius: 10, borderWidth: BORDER, borderColor: edge, borderStyle: piece ? 'solid' : 'dashed', backgroundColor: fill, justifyContent: 'center', paddingHorizontal: 10, paddingLeft: 10 + (piece?.indent ?? 0) * 18 }}>
                      <Text style={[code(14), { color: piece ? C.navy : C.lockedText }]}>{piece?.text ?? `${i + 1}`}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[body(13), { color: C.muted }]}>Tap a line to place it. Tap a placed line to take it back.</Text>
            <View style={{ gap: 6 }}>
              {part.trayOrder.filter((id) => !placed.includes(id)).map((id) => {
                const piece = part.pieces.find((p) => p.id === id);
                return (
                  <Pressable key={id} onPress={() => place(id)} accessibilityRole="button">
                    <Card radius={10} shadow contentStyle={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 }}>
                      <Text style={code(14)}>{piece?.text}</Text>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
        {part.kind === 'run' && (
          <View style={{ gap: 6 }}>
            <CodePanel lines={config.program} activeLine={runPhase === 'running' ? line : null} activeTok={tok} />
            <Text style={[body(14, true), { minHeight: 20 }]}>{caption}</Text>
            <RunConsole lines={outputs} />
          </View>
        )}
      </ScrollView>
      {result === 'correct' ? (
        <GameFeedbackSheet correct title={part.kind === 'run' ? 'Stage complete!' : part.okTitle} message={part.ok} buttonTitle={isLast ? 'Continue' : 'Next part'} robotName={moodImage(store.progress.currentForm, 'excited')} action={() => (isLast ? onDone() : next())} />
      ) : result === 'wrong' ? (
        <GameFeedbackSheet correct={false} title="Not quite" message={wrongMessage} buttonTitle="Try again" action={retry} />
      ) : part.kind === 'run' ? (
        <View style={{ padding: 16 }}>
          <ChunkyButton title={runPhase === 'running' ? 'Running…' : 'Run it!'} enabled={runPhase === 'idle'} onPress={startRun} />
        </View>
      ) : null}
    </View>
  );
}
