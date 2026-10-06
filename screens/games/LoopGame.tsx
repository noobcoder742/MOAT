import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, ScrollView, Text, TextInput, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useAppStore } from '../../hooks/useAppStore';
import { ChunkyButton } from '../../components/ui';
import { BoltIcon } from '../../components/trackKit';
import { CodeLine, CodePanel, FittedArt, GameFeedbackSheet, RunStep, tk, useStepPlayer } from '../../components/gameKit';
import { BORDER, C, body, code, heading } from '../../utils/theme';
import { moodImage } from '../../types/models';
import { money } from '../../utils/codeJoin';

export type LoopKind = 'loop_plant' | 'loop_wheel' | 'loop_fund';

interface LoopConfig {
  kind: LoopKind;
  title: string;
  intro: string;
  varName: string;
  loopVar: string;
  start: number;
  step: number;
  goal: number;
  stepNoun: string;
  iterWord: string;
  runningLabel: string;
  okMessage: string;
  zeroBody: string;
  trapBody: string;
  format: (n: number) => string;
}

/** LoopGameConfig in LoopGames.swift. */
export const LOOP_CONFIGS: Record<LoopKind, LoopConfig> = {
  loop_plant: {
    kind: 'loop_plant', title: 'Grow the plant to 10 cm',
    intro: 'range(?) is how many times you pour water. Each pour adds 1 cm. What number goes in the box so the plant reaches 10 cm?',
    varName: 'height_of_plant', loopVar: 'single_pour', start: 2, step: 1, goal: 10, stepNoun: 'pour', iterWord: 'Pour', runningLabel: 'Watering…',
    okMessage: 'It started at 2 cm, so 8 pours bring it to exactly 10 cm.',
    zeroBody: 'range(0) runs the loop zero times, so no water was poured.',
    trapBody: 'The plant was already 2 cm tall before any pours, so 10 pours is too many.',
    format: (n) => `${n} cm`,
  },
  loop_wheel: {
    kind: 'loop_wheel', title: 'Spin the wheel to 9 turns',
    intro: 'The wheel has turned 3 times already. range(?) is how many motor pulses to send, and each pulse adds 1 turn. Reach 9 turns.',
    varName: 'wheel_turns', loopVar: 'pulse', start: 3, step: 1, goal: 9, stepNoun: 'pulse', iterWord: 'Pulse', runningLabel: 'Spinning…',
    okMessage: 'It had already turned 3 times, so 6 pulses bring it to exactly 9 turns.',
    zeroBody: 'range(0) runs the loop zero times, so no pulses were sent.',
    trapBody: 'The wheel had already turned 3 times before any pulses, so 9 pulses is too many.',
    format: (n) => `${n} turns`,
  },
  loop_fund: {
    kind: 'loop_fund', title: 'Grow the fund to $4,000',
    intro: 'The fund starts at $1,000. range(?) is how many investment cycles you run, and each cycle adds $500. What number reaches $4,000?',
    varName: 'fund', loopVar: 'cycle', start: 1000, step: 500, goal: 4000, stepNoun: 'cycle', iterWord: 'Cycle', runningLabel: 'Investing…',
    okMessage: 'It started at $1,000, so 6 cycles of $500 bring it to exactly $4,000.',
    zeroBody: 'range(0) runs the loop zero times, so no cycles ran and nothing was invested.',
    trapBody: 'The fund already held $1,000 before the first cycle, so 8 cycles is too many.',
    format: money,
  },
};

const answerOf = (c: LoopConfig) => (c.goal - c.start) / c.step;
const trapOf = (c: LoopConfig) => c.goal / c.step;
function wrongText(c: LoopConfig, total: number, value: number) {
  const noun = total === 1 ? c.stepNoun : c.stepNoun + 's';
  if (total === 0) return { title: `Still ${c.format(c.start)}`, body: c.zeroBody };
  if (total < answerOf(c)) return { title: `Only ${c.format(value)}`, body: `${total} ${noun} took it from ${c.format(c.start)} to ${c.format(value)}. It hasn’t reached ${c.format(c.goal)} yet.` };
  if (total === trapOf(c)) return { title: `Overshot: ${c.format(value)}`, body: c.trapBody };
  return { title: `Overshot: ${c.format(value)}`, body: `${total} ${noun} took it from ${c.format(c.start)} to ${c.format(value)}, past the goal.` };
}

function steps(n: number): RunStep[] {
  const list: RunStep[] = [];
  for (let t = 0; t < 3; t++) list.push({ line: 0, tok: t, wait: 360 });
  if (n === 0) for (let t = 0; t < 6; t++) list.push({ line: 1, tok: t, wait: 360 });
  for (let i = 1; i <= n; i++) {
    const d = i === 1 ? 360 : i === 2 ? 200 : 90;
    const g = i === 1 ? 560 : i === 2 ? 440 : 300;
    for (let t = 0; t < 6; t++) list.push({ line: 1, tok: t, wait: d, iter: i });
    for (let t = 0; t < 5; t++) list.push({ line: 2, tok: t, wait: d, iter: i });
    list.push({ wait: g, iter: i, grow: true });
  }
  list.push({ wait: 250, finish: true });
  return list;
}

// ---------- Art ----------
const LEAF = 'M0 0 C8 0 16 -4 18 -13 C9 -14 2 -9 0 0 Z';

function PlantArt({ height, pouring }: { height: number; pouring: boolean }) {
  const baseY = 152, cm = 6;
  return (
    <Svg width={345} height={199}>
      <Path d={`M300 20 L300 152 ${Array.from({ length: 23 }, (_, c) => `M300 ${152 - c * 6} L${300 + (c % 5 === 0 ? 9 : 4)} ${152 - c * 6}`).join(' ')}`} stroke={C.navy} strokeWidth={1.5} />
      {[0, 5, 10, 15, 20].map((c) => <SvgText key={c} x={322} y={152 - c * 6 + 4} fontSize={10} fill={C.muted} textAnchor="middle">{c}</SvgText>)}
      <Line x1={20} y1={92} x2={296} y2={92} stroke={C.orange} strokeWidth={2.5} strokeDasharray="6 5" />
      <SvgText x={56} y={86} fontSize={12} fontFamily="AtkinsonHyperlegible-Bold" fill={C.orange} textAnchor="middle">goal: 10 cm</SvgText>
      <Rect x={148} y={baseY - height * cm} width={4} height={height * cm} fill={C.navy} />
      {Array.from({ length: 11 }, (_, i) => i + 1).map((k) => {
        const right = k % 2 === 1;
        const y = baseY - (2 * k - 0.5) * cm;
        if (height < 2 * k) return null;
        return <Path key={k} d={LEAF} fill={C.lime} stroke={C.navy} strokeWidth={1.5} transform={`translate(${right ? 150 : 150} ${y}) scale(${right ? 1 : -1} 1)`} />;
      })}
      <Circle cx={150} cy={baseY - height * cm} r={6} fill={C.lime} stroke={C.navy} strokeWidth={2} />
      <SvgText x={96} y={baseY - height * cm + 6} fontSize={13} fontFamily="Baloo2-ExtraBold" fill={C.navy} textAnchor="middle">{`${height} cm`}</SvgText>
      <Path d="M206 116 L177 101 L175 107 L206 127 Z" fill={C.sky} stroke={C.navy} strokeWidth={2} strokeLinejoin="round" />
      <Rect x={204} y={106} width={42} height={36} rx={6} fill={C.sky} stroke={C.navy} strokeWidth={2.5} />
      <Path d="M244 114 C258 114 258 134 244 134" stroke={C.navy} strokeWidth={3} fill="none" strokeLinecap="round" />
      {pouring && [0, 1, 2].map((i) => <Rect key={i} x={166 + i * 3} y={112 + i * 8} width={3} height={7} rx={1.5} fill={C.sky} />)}
      <Path d="M118 154 L182 154 L176 190 L124 190 Z" fill={C.orange} stroke={C.navy} strokeWidth={2.5} strokeLinejoin="round" />
      <Rect x={114} y={148} width={72} height={9} rx={3} fill={C.orange} stroke={C.navy} strokeWidth={2.5} />
    </Svg>
  );
}

function WheelArt({ turns, start, goal, pulsing, spin }: { turns: number; start: number; goal: number; pulsing: boolean; spin: Animated.Value }) {
  const width = (276 * Math.min(turns, 23)) / 23;
  const goalX = 30 + 12 * goal;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={{ width: 345, height: 199 }}>
      <Animated.View style={{ position: 'absolute', left: 100 - 56, top: 76 - 56, width: 112, height: 112, transform: [{ rotate }] }}>
        <Svg width={112} height={112}>
          <Circle cx={56} cy={56} r={55} fill={C.navy} />
          {Array.from({ length: 20 }, (_, k) => {
            const a = (k / 20) * 2 * Math.PI;
            return <Line key={k} x1={56 + 46.5 * Math.sin(a)} y1={56 - 46.5 * Math.cos(a)} x2={56 + 54 * Math.sin(a)} y2={56 - 54 * Math.cos(a)} stroke={C.muted} strokeWidth={3.5} />;
          })}
          <Circle cx={56} cy={56} r={36} fill={C.card} stroke={C.sky} strokeWidth={3} />
          {Array.from({ length: 6 }, (_, k) => {
            const a = (k / 6) * 2 * Math.PI;
            return <Line key={k} x1={56} y1={56} x2={56 + 36 * Math.sin(a)} y2={56 - 36 * Math.cos(a)} stroke={C.navy} strokeWidth={4} strokeLinecap="round" />;
          })}
          <Circle cx={56} cy={56} r={7} fill={C.orange} stroke={C.navy} strokeWidth={2} />
        </Svg>
      </Animated.View>
      {pulsing && <View style={{ position: 'absolute', left: 100 - 64, top: 76 - 64, width: 128, height: 128, borderRadius: 64, borderWidth: 4, borderColor: C.lime }} />}
      <View style={{ position: 'absolute', left: 210, top: 22, width: 80, alignItems: 'center' }}>
        <BoltIcon size={30} fill={pulsing ? C.lime : C.sky} />
        <Text style={[body(12, true), { color: C.muted }]}>motor pulse</Text>
        <Text style={heading(34)}>{turns}</Text>
        <Text style={[body(13, true), { color: C.muted }]}>turns</Text>
      </View>
      <Svg width={345} height={199} style={{ position: 'absolute' }}>
        <Rect x={30} y={156} width={276} height={12} rx={6} fill={C.locked} />
        <Rect x={30} y={156} width={Math.max(width, 1)} height={12} rx={6} fill={C.lime} />
        <Rect x={30} y={156} width={276} height={12} rx={6} fill="none" stroke={C.navy} strokeWidth={2} />
        {[0, 5, 10, 15, 20].map((c) => <SvgText key={c} x={30 + 12 * c} y={192} fontSize={10} fill={C.muted} textAnchor="middle">{c}</SvgText>)}
        <Line x1={goalX} y1={144} x2={goalX} y2={176} stroke={C.orange} strokeWidth={2.5} strokeDasharray="5 4" />
        <SvgText x={goalX + 44} y={150} fontSize={12} fontFamily="AtkinsonHyperlegible-Bold" fill={C.orange} textAnchor="middle">{`goal: ${goal} turns`}</SvgText>
      </Svg>
    </View>
  );
}

function FundArt({ fund, cycles, fx }: { fund: number; cycles: number; fx: boolean }) {
  const baseY = 170, cap = 6000;
  const barH = (Math.min(fund, cap) / 1000) * 20;
  return (
    <Svg width={345} height={199}>
      <Path d={`M52 50 L52 ${baseY} L216 ${baseY} ${[0, 1, 2, 3, 4, 5, 6].map((k) => `M${k % 2 === 0 ? 46 : 48} ${baseY - k * 20} L52 ${baseY - k * 20}`).join(' ')}`} stroke={C.navy} strokeWidth={1.5} fill="none" />
      {[0, 2, 4, 6].map((k) => <SvgText key={k} x={28} y={baseY - k * 20 + 4} fontSize={10} fill={C.muted} textAnchor="middle">{k === 0 ? '$0' : `$${k}k`}</SvgText>)}
      <Rect x={80} y={baseY - barH} width={48} height={barH} fill={C.lime} stroke={C.navy} strokeWidth={2} />
      <Line x1={52} y1={90} x2={216} y2={90} stroke={C.orange} strokeWidth={2.5} strokeDasharray="6 5" />
      <SvgText x={186} y={84} fontSize={12} fontFamily="AtkinsonHyperlegible-Bold" fill={C.orange} textAnchor="middle">goal: $4,000</SvgText>
      <SvgText x={104} y={baseY - barH - 11} fontSize={12} fontFamily="Baloo2-ExtraBold" fill={C.navy} textAnchor="middle">{(fund > cap ? '▲ ' : '') + money(fund)}</SvgText>
      <Circle cx={104} cy={baseY - barH - 40} r={fx ? 11 : 9} fill={C.sun} stroke={C.navy} strokeWidth={2} />
      <SvgText x={104} y={193} fontSize={12} fontFamily="AtkinsonHyperlegible-Bold" fill={C.muted} textAnchor="middle">Fund</SvgText>
      <SvgText x={278} y={58} fontSize={12} fontFamily="AtkinsonHyperlegible-Bold" fill={C.muted} textAnchor="middle">Cycles</SvgText>
      <G>
        {Array.from({ length: 20 }, (_, i) => (
          <Rect key={i} x={278 - 50 + (i % 5) * 20} y={70 + Math.floor(i / 5) * 20} width={16} height={16} rx={4} fill={i < cycles ? C.lime : C.locked} stroke={C.navy} strokeWidth={1.5} />
        ))}
      </G>
    </Svg>
  );
}

export function LoopGame({ kind, onProgress, onBolts, onDone }: { kind: LoopKind; onProgress: (p: number) => void; onBolts: (n: number) => void; onDone: () => void }) {
  const config = LOOP_CONFIGS[kind];
  const store = useAppStore();
  const player = useStepPlayer();
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [value, setValue] = useState(config.start);
  const [iter, setIter] = useState(0);
  const [total, setTotal] = useState(0);
  const [line, setLine] = useState(-1);
  const [tok, setTok] = useState(-1);
  const [fx, setFx] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [awarded, setAwarded] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;
  const iterRef = useRef(0);

  const parsed = /^\d{1,2}$/.test(input) && Number(input) <= 20 ? Number(input) : null;
  const canRun = phase === 'idle' && parsed !== null;
  const isCorrect = phase === 'done' && total === answerOf(config);
  const isWrong = phase === 'done' && total !== answerOf(config);
  const cycles = (value - config.start) / config.step;

  useEffect(() => {
    if (isCorrect && !awarded) {
      setAwarded(true);
      if (attempts === 1) onBolts(5);
      onProgress(1);
    }
  }, [isCorrect]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    if (!canRun || parsed === null) return;
    Keyboard.dismiss();
    setTotal(parsed);
    setValue(config.start);
    setIter(0);
    iterRef.current = 0;
    setLine(-1);
    setTok(-1);
    setFx(false);
    spin.setValue(0);
    setPhase('running');
    player.play(steps(parsed), (s) => {
      if (s.finish) {
        setAttempts((a) => a + 1);
        setPhase('done');
        setLine(-1);
        setTok(-1);
        setFx(false);
        return;
      }
      if (s.iter !== undefined) {
        setIter(s.iter);
        iterRef.current = s.iter;
      }
      if (s.grow) {
        const i = iterRef.current;
        const dur = i <= 1 ? 500 : i === 2 ? 380 : 260;
        setValue((v) => v + config.step);
        Animated.timing(spin, { toValue: i, duration: dur, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
        setFx(true);
        setLine(2);
        setTok(99);
        setTimeout(() => setFx(false), Math.min((s.wait ?? 300) - 20, 420));
      } else if (s.line !== undefined) {
        setLine(s.line);
        setTok(s.tok ?? 0);
      }
    });
  };
  const retry = () => {
    player.cancel();
    setPhase('idle');
    setValue(config.start);
    setIter(0);
    setLine(-1);
    setTok(-1);
    setFx(false);
    spin.setValue(0);
  };

  const lines: CodeLine[] = [
    { indent: 0, tokens: [tk(config.varName, ''), tk('='), tk(String(config.start), ' ', 'number')] },
    { indent: 0, tokens: [tk('for', '', 'keyword'), tk(config.loopVar), tk('in', ' ', 'keyword'), tk('range(', ' '), tk('______', '', 'input'), tk('):', '')] },
    { indent: 1, tokens: [tk(config.varName, ''), tk('='), tk(config.varName), tk('+'), tk(String(config.step), ' ', 'number')] },
  ];
  const inputFill = phase === 'running' && line === 1 && tok === 4 ? C.lime : phase === 'running' && line === 1 && tok > 4 ? C.successSheet : '#FFFFFF';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView keyboardDismissMode="interactive" contentContainerStyle={{ padding: 20, gap: 14 }}>
        <Text style={heading(24)} accessibilityRole="header">{config.title}</Text>
        <Text style={body(16)}>{config.intro}</Text>
        <FittedArt>
          {kind === 'loop_plant' && <PlantArt height={value} pouring={fx} />}
          {kind === 'loop_wheel' && <WheelArt turns={value} start={config.start} goal={config.goal} pulsing={fx} spin={spin} />}
          {kind === 'loop_fund' && <FundArt fund={value} cycles={cycles} fx={fx} />}
        </FittedArt>
        <CodePanel
          lines={lines}
          activeLine={phase === 'running' ? line : null}
          activeTok={tok}
          input={(size) => (
            <TextInput
              value={input}
              onChangeText={(t) => setInput(t.replace(/[^0-9]/g, '').slice(0, 2))}
              editable={phase === 'idle'}
              keyboardType="number-pad"
              placeholder="?"
              placeholderTextColor={C.muted}
              accessibilityLabel="How many times the loop runs"
              style={[code(size), { minWidth: 40, textAlign: 'center', color: C.codeNumber, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6, borderWidth: 2, borderColor: C.navy, backgroundColor: inputFill }]}
            />
          )}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {phase !== 'idle' && (
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: C.hintBlue, borderWidth: 2, borderColor: C.navy }}>
              <Text style={body(13, true)}>{config.iterWord} {iter} of {total}</Text>
            </View>
          )}
          <Text style={code(14)}>{config.varName} = {value}</Text>
        </View>
      </ScrollView>
      {isCorrect ? (
        <GameFeedbackSheet correct title="Nice!" message={config.okMessage} buttonTitle="Continue" robotName={moodImage(store.progress.currentForm, 'excited')} action={onDone} />
      ) : isWrong ? (
        (() => {
          const w = wrongText(config, total, value);
          return <GameFeedbackSheet correct={false} title={w.title} message={w.body} buttonTitle="Try again" action={retry} />;
        })()
      ) : (
        <View style={{ padding: 16, borderTopWidth: 0, borderColor: C.navy, borderTopLeftRadius: BORDER }}>
          <ChunkyButton title={phase === 'running' ? config.runningLabel : 'Test!'} enabled={canRun} onPress={start} />
        </View>
      )}
    </View>
  );
}
