import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { BORDER, C, body, heading, monoBold } from '../utils/theme';
import { BundleImage, Card, ChunkyButton } from './ui';
import { RobotForm, RobotMood, TrackPhase, moodImage } from '../types/models';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { DAILY_GOAL_MINUTES } from '../hooks/useTrackStore';

const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

// ---------- Icons ----------
export const BoltIcon = ({ size = 18, fill = C.sky, stroke = C.navy, strokeWidth = 1.6 }: { size?: number; fill?: string; stroke?: string; strokeWidth?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M13 2L4 14h7l-1 8 9-12h-7z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
  </Svg>
);
const ZapIcon = ({ fill, rotate }: { fill: string; rotate: number }) => (
  <Svg width={16} height={18} viewBox="0 0 16 18">
    <Path d="M9.5 1 L3.5 9.5 H7.5 L5.5 17 L12.5 7.5 H8.5 Z" fill={fill} stroke={C.navy} strokeWidth={1.4} strokeLinejoin="round" transform={`rotate(${rotate} 8 9)`} />
  </Svg>
);
const STAR = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.2 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z';
export const StarIcon = ({ size = 15, fill = C.sun, stroke = C.navy, strokeWidth = 1.6 }: { size?: number; fill?: string; stroke?: string; strokeWidth?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d={STAR} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
  </Svg>
);
const Sparkle = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 0 L15.4 8.6 L24 12 L15.4 15.4 L12 24 L8.6 15.4 L0 12 L8.6 8.6 Z" fill="#FFFFFF" />
  </Svg>
);
export const LockIcon = ({ color = C.lockedText, size = 15 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke={color} strokeWidth={2.6} />
    <Path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
  </Svg>
);
export const CheckIcon = ({ size = 12, color = C.navy, strokeWidth = 4 }: { size?: number; color?: string; strokeWidth?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
export const CrossIcon = ({ size = 18, color = C.navy, strokeWidth = 3 }: { size?: number; color?: string; strokeWidth?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6 6l12 12M18 6L6 18" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);
export const FlameIcon = ({ size = 22, fill = C.orange, stroke = C.orange }: { size?: number; fill?: string; stroke?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" fill={fill} stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
  </Svg>
);
const BulbIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 18h6" />
    <Path d="M10 22h4" />
    <Path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.7A7 7 0 0 0 12 2z" />
  </Svg>
);

// ---------- Counting number ----------
export function useCountUp(target: number, opts: { from?: number; duration?: number; delay?: number; run?: boolean } = {}) {
  const { from = target, duration = 900, delay = 0, run = true } = opts;
  const v = useRef(new Animated.Value(from)).current;
  const [shown, setShown] = useState(from);
  useEffect(() => {
    const id = v.addListener(({ value }) => setShown(Math.round(value)));
    return () => v.removeListener(id);
  }, [v]);
  useEffect(() => {
    if (!run) {
      v.setValue(target);
      setShown(target);
      return;
    }
    v.setValue(from);
    const a = Animated.timing(v, { toValue: target, duration, delay, easing: EASE, useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [target, from, run]); // eslint-disable-line react-hooks/exhaustive-deps
  return shown;
}

// ---------- Bolt counter (top right of every question) ----------
const SPARKS = [
  { x: -34, y: -22, r: -25, c: C.sun, d: 150 },
  { x: 34, y: -23, r: 25, c: C.sky, d: 300 },
  { x: -35, y: 20, r: 200, c: C.sky, d: 450 },
  { x: 33, y: 21, r: 160, c: C.sun, d: 600 },
];
const FLICKER = [1, 0.15, 1, 0.3, 1, 0];

/** White "+N" while answering; after a right answer it turns lime, counts up by 10, glows, bounces and flickers four sparks twice. */
export function BoltPill({ base, earned }: { base: number; earned: boolean }) {
  const reduce = useReduceMotion();
  const shown = useCountUp(earned ? base + 10 : base, { from: base, duration: 900, delay: 150, run: earned && !reduce });
  const glow = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const sparks = useRef(SPARKS.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (!earned || reduce) return;
    Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 780, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.delay(950),
      Animated.timing(scale, { toValue: 1.14, duration: 180, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 270, useNativeDriver: true }),
    ]).start();
    sparks.forEach((s, i) => {
      const flick = FLICKER.map((o) => Animated.timing(s, { toValue: o, duration: 80, useNativeDriver: true }));
      Animated.sequence([Animated.delay(SPARKS[i].d / 6), ...flick, ...flick]).start();
    });
  }, [earned, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View
      accessible
      accessibilityLabel={earned ? `10 bolts earned. ${base + 10} this lesson.` : `${base} bolts earned this lesson`}
      style={{ transform: [{ scale }] }}
    >
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', left: -3, right: -3, top: -3, bottom: -3, borderRadius: 24, borderWidth: 6, borderColor: 'rgba(89,180,255,0.6)', opacity: glow, transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }}
      />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 3, height: 36, borderRadius: 18, backgroundColor: C.navy }} />
      <View style={{ height: 36, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 8, paddingRight: 10, borderRadius: 18, borderWidth: BORDER, borderColor: C.navy, backgroundColor: earned ? C.lime : C.card }}>
        <BoltIcon />
        <Text style={heading(18)}>+{shown}</Text>
      </View>
      {earned && !reduce &&
        SPARKS.map((s, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: s.x - 8, marginTop: s.y - 9, opacity: sparks[i], transform: [{ scale: sparks[i].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.1] }) }] }}
          >
            <ZapIcon fill={s.c} rotate={s.r} />
          </Animated.View>
        ))}
    </Animated.View>
  );
}

// ---------- Progress ----------
export function SegmentBar({ total, index, currentCorrect }: { total: number; index: number; currentCorrect: boolean }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 6 }} accessible accessibilityLabel={`Question ${Math.min(index + 1, total)} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 12, borderRadius: 6, borderWidth: BORDER, borderColor: C.navy, backgroundColor: i < index ? C.lime : i === index ? (currentCorrect ? C.lime : C.sky) : C.locked }} />
      ))}
    </View>
  );
}

export function StarSlots({ total, index, currentCorrect }: { total: number; index: number; currentCorrect: boolean }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 }} accessible accessibilityLabel={`Checkpoint question ${index + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <StarIcon key={i} size={24} stroke={C.cream} fill={i < index ? C.lime : i === index ? (currentCorrect ? C.lime : C.sky) : C.locked} />
      ))}
    </View>
  );
}

// ---------- Robot ----------
/** The learner's robot with a mood. Every new mood pops in, as on the canvas. */
export function RobotFace({ form, mood, width, height }: { form: RobotForm; mood: RobotMood; width: number; height: number }) {
  const reduce = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const y = useRef(new Animated.Value(0)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduce) return;
    scale.setValue(0.9);
    y.setValue(10);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
  }, [mood]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={{ width, height, transform: [{ scale }, { translateY: y }] }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <BundleImage name={moodImage(form, mood)} style={{ width, height }} />
    </Animated.View>
  );
}

/** Moods rotate across questions, and a wrong answer never winks. */
export function moodPlan(index: number): { ask: RobotMood; ok: RobotMood; bad: RobotMood } {
  const asks: RobotMood[] = ['neutral', 'confused', 'surprised'];
  const oks: RobotMood[] = ['excited', 'hearts', 'wink'];
  const ask = asks[index % 3];
  return { ask, ok: oks[(index + 1) % 3], bad: ask === 'surprised' ? 'confused' : 'surprised' };
}

// ---------- Question bubble with the hint bulb in its corner ----------
export function PromptBubble({
  sub,
  title,
  hint,
  tag,
  tagColor = C.sun,
  darkShadow = false,
  hintOpen,
  onToggleHint,
}: {
  sub: string;
  title: string;
  hint: string;
  tag?: string;
  tagColor?: string;
  darkShadow?: boolean;
  hintOpen: boolean;
  onToggleHint: () => void;
}) {
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(pop, { toValue: hintOpen ? 1 : 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [hintOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const radius = { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 20, borderBottomLeftRadius: 6 };
  return (
    <View style={{ flex: 1, zIndex: 3 }}>
      <View style={[StyleSheet.absoluteFill, radius, { top: 3, bottom: -3, backgroundColor: darkShadow ? C.shadowDark : C.navy }]} />
      <View style={[radius, { backgroundColor: C.card, borderWidth: BORDER, borderColor: C.navy, paddingLeft: 14, paddingRight: 50, paddingVertical: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {tag ? (
            <View style={{ paddingHorizontal: 7, paddingVertical: 1, borderRadius: 7, backgroundColor: tagColor, borderWidth: 1.5, borderColor: C.navy }}>
              <Text style={body(13, true)} numberOfLines={1}>{tag}</Text>
            </View>
          ) : null}
          <Text style={[body(14, true), { color: C.muted }]}>{sub}</Text>
        </View>
        <Text style={[heading(22), { marginTop: 3 }]} accessibilityRole="header">{title}</Text>
      </View>
      <Pressable onPress={onToggleHint} accessibilityRole="button" accessibilityLabel={hintOpen ? 'Hide hint' : 'Show hint'} style={{ position: 'absolute', right: 4, top: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 34, height: 34 }}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 2, height: 34, borderRadius: 17, backgroundColor: C.navy }} />
          <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: BORDER, borderColor: C.navy, backgroundColor: hintOpen ? C.orange : C.sun, alignItems: 'center', justifyContent: 'center' }}>
            <BulbIcon />
          </View>
        </View>
      </Pressable>
      {hintOpen && (
        <Animated.View style={{ position: 'absolute', right: 0, top: 52, width: 240, zIndex: 5, opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }}>
          <Card fill={C.hintBlue} radius={16} shadow contentStyle={{ paddingHorizontal: 14, paddingVertical: 11 }}>
            <Text style={body(15)} accessibilityRole="text">{hint}</Text>
          </Card>
        </Animated.View>
      )}
    </View>
  );
}

export function CoachRow({ form, mood, children }: { form: RobotForm; mood: RobotMood; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, zIndex: 3 }}>
      <RobotFace form={form} mood={mood} width={86} height={90} />
      {children}
    </View>
  );
}

// ---------- R code colouring ----------
const KEYWORDS = new Set(['if', 'else', 'for', 'in', 'while', 'function', 'return', 'TRUE', 'FALSE', 'NULL', 'NA', 'repeat', 'break', 'next']);
export function colorR(line: string, base: string = C.cream): { t: string; c: string }[] {
  if (line.trim().startsWith('#')) return [{ t: line, c: C.lilac }];
  const out: { t: string; c: string }[] = [];
  let i = 0;
  const isLetter = (ch: string) => /[A-Za-z_.]/.test(ch);
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < line.length && line[j] !== ch) j++;
      const end = Math.min(j + 1, line.length);
      out.push({ t: line.slice(i, end), c: C.lime });
      i = end;
    } else if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < line.length && /[0-9.]/.test(line[j])) j++;
      out.push({ t: line.slice(i, j), c: C.number });
      i = j;
    } else if (isLetter(ch)) {
      let j = i;
      while (j < line.length && /[A-Za-z0-9_.]/.test(line[j])) j++;
      const word = line.slice(i, j);
      out.push({ t: word, c: line[j] === '(' ? C.fn : KEYWORDS.has(word) ? C.keyword : base });
      i = j;
    } else if (ch === ' ') {
      out.push({ t: ' ', c: base });
      i++;
    } else {
      out.push({ t: ch, c: C.lavender });
      i++;
    }
  }
  return out;
}

/** One line of code, optionally with a blank that fills with the learner's pick. */
export function RCodeLine({ text, number, blankFill, size = 16 }: { text: string; number?: number; blankFill?: string | null; size?: number }) {
  const parts = text.split('___');
  const colored = (s: string) => colorR(s).map((p, i) => (<Text key={i} style={{ color: p.c }}>{p.t}</Text>));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: size + 10 }}>
      {number !== undefined && <Text style={[monoBold(size - 3), { color: C.lilac, width: 18, textAlign: 'right' }]}>{number}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[monoBold(size), { color: C.cream }]}>{colored(parts[0])}</Text>
        {parts.length > 1 &&
          (blankFill ? (
            <View style={{ backgroundColor: C.lime, borderRadius: 8, paddingHorizontal: 6 }}>
              <Text style={monoBold(size)}>{blankFill}</Text>
            </View>
          ) : (
            <View style={{ width: 96, height: 24, borderBottomWidth: 3, borderStyle: 'dashed', borderColor: C.lime }} />
          ))}
        {parts.length > 1 && <Text style={[monoBold(size), { color: C.cream }]}>{colored(parts[1])}</Text>}
      </View>
    </View>
  );
}

// ---------- Phase pictures ----------
const baseColor = (b: string) => (b === 'A' ? C.orange : b === 'T' ? C.sun : b === 'G' ? C.lime : C.sky);

export function DNAStrip({ sequence, size = 24 }: { sequence: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessible accessibilityLabel={`DNA sample ${sequence}`}>
      {sequence.split('').map((b, i) => (
        <View key={i} style={{ width: size, height: size, borderRadius: 6, borderWidth: 2, borderColor: C.navy, backgroundColor: baseColor(b), alignItems: 'center', justifyContent: 'center' }}>
          <Text style={monoBold(size / 2 + 1)}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

function HelixGauge() {
  const w = 196, h = 56, n = 72, seq = 'ATGCGCATGCGC';
  const pt = (t: number, sign: number) => [4 + (w - 8) * t, h / 2 + sign * (h / 2 - 6) * Math.sin(t * 4 * Math.PI)];
  const strand = (sign: number) => Array.from({ length: n + 1 }, (_, i) => pt(i / n, sign)).map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const r = 19, circ = 2 * Math.PI * r;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56 }} accessible accessibilityLabel="A DNA double helix next to a gauge showing 67 percent GC content">
      <Svg width={w} height={h}>
        {seq.split('').map((b, k) => {
          const t = (k + 1) / (seq.length + 1);
          const [x, y1] = pt(t, 1), [, y2] = pt(t, -1);
          if (Math.abs(y1 - y2) < 6) return null;
          return <Line key={k} x1={x} y1={y1} x2={x} y2={y2} stroke={baseColor(b)} strokeWidth={5} strokeLinecap="round" />;
        })}
        <Path d={strand(-1)} stroke={C.navy} strokeWidth={3} fill="none" strokeLinecap="round" />
        <Path d={strand(1)} stroke={C.navy} strokeWidth={3} fill="none" strokeLinecap="round" />
      </Svg>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Svg width={48} height={48} viewBox="0 0 48 48">
          <Circle cx={24} cy={24} r={r} fill="none" stroke={C.locked} strokeWidth={8} />
          <Circle cx={24} cy={24} r={r} fill="none" stroke={C.lime} strokeWidth={8} strokeDasharray={`${(circ * 0.67).toFixed(1)} ${circ.toFixed(1)}`} transform="rotate(-90 24 24)" />
          <Circle cx={24} cy={24} r={r + 4} fill="none" stroke={C.navy} strokeWidth={2} />
          <Circle cx={24} cy={24} r={r - 4} fill="none" stroke={C.navy} strokeWidth={2} />
        </Svg>
        <View>
          <Text style={[body(12, true), { color: C.muted }]}>GC content</Text>
          <Text style={heading(20)}>67%</Text>
        </View>
      </View>
    </View>
  );
}

function QualityBars({ compact, width }: { compact: boolean; width: number }) {
  const bases = 'ACGTTAGCAT'.split('');
  const q = [38, 37, 36, 34, 31, 28, 24, 19, 13, 8];
  const h = compact ? 26 : 66, n = q.length;
  const bw = compact ? (width - 9 * 6) / n : 22;
  const gap = compact ? 6 : (width - 40 - n * 22) / (n - 1);
  const area = compact ? h - 4 : h - 26;
  const y20 = 4 + area - (20 / 40) * area;
  return (
    <Svg width={width} height={h} accessibilityLabel="Quality score for each base of a read, dropping below Q20 at the end">
      {q.map((v, i) => {
        const bh = (v / 40) * area, x = i * (bw + gap);
        return (
          <G key={i}>
            <Rect x={x} y={(compact ? 2 : 4) + area - bh} width={bw} height={bh} rx={compact ? 3 : 4} fill={v >= 20 ? C.lime : C.orange} stroke={C.navy} strokeWidth={compact ? 1.5 : 2} />
            {!compact && <Rect x={x} y={area + 7} width={bw} height={17} rx={4} fill={baseColor(bases[i])} stroke={C.navy} strokeWidth={1.5} />}
            {!compact && <SvgText x={x + bw / 2} y={area + 19.5} fontSize={11} fontWeight="700" fill={C.navy} textAnchor="middle">{bases[i]}</SvgText>}
          </G>
        );
      })}
      {!compact && <Line x1={0} y1={y20} x2={width - 38} y2={y20} stroke={C.navy} strokeWidth={1.5} strokeDasharray="4 4" />}
      {!compact && <SvgText x={width - 34} y={y20 + 4} fontSize={12} fontFamily="AtkinsonHyperlegible-Bold" fill={C.muted}>Q20</SvgText>}
    </Svg>
  );
}

function WellPlate({ compact, width }: { compact: boolean; width: number }) {
  const cols = compact ? 16 : 12, rows = compact ? 1 : 4, h = compact ? 26 : 66;
  const cw = (width - 24) / cols, ch = (h - 12) / rows, r = Math.min(cw, ch) / 2 - 1.5;
  const wells = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const fill = i < 5 && j < 2 ? C.lime : i === 5 && j === 0 ? C.orange : j < 2 ? C.hintBlue : C.paper;
      wells.push(<Circle key={`${i}-${j}`} cx={12 + (i + 0.5) * cw} cy={6 + (j + 0.5) * ch} r={r} fill={fill} stroke={C.navy} strokeWidth={1.5} />);
    }
  return (
    <Svg width={width} height={h} accessibilityLabel="A well plate: some wells filled, one sample split across two wells">
      <Rect x={1} y={1} width={width - 2} height={h - 2} rx={10} fill={C.card} stroke={C.navy} strokeWidth={2} />
      {wells}
    </Svg>
  );
}

function GrowthCurve({ width, height = 66 }: { width: number; height?: number }) {
  const pts = [1, 2, 4, 8, 16, 32, 64, 128], L = 30, B = height - 6, T = 4;
  const xy = (i: number) => [L + (i * (width - L - 10)) / 7, B - (pts[i] / 128) * (B - T)];
  const y100 = B - (100 / 128) * (B - T);
  return (
    <Svg width={width} height={height} accessibilityLabel="Bacterial count doubling each hour, crossing 100 after 7 hours">
      <Path d={`M${L} ${T} L${L} ${B} L${width - 6} ${B}`} stroke={C.navy} strokeWidth={2} fill="none" />
      <Line x1={L} y1={y100} x2={width - 6} y2={y100} stroke={C.orange} strokeWidth={1.5} strokeDasharray="4 4" />
      <SvgText x={2} y={y100 + 4} fontSize={11} fontFamily="AtkinsonHyperlegible-Bold" fill={C.muted}>100</SvgText>
      <Polyline points={pts.map((_, i) => xy(i).map((n) => n.toFixed(1)).join(',')).join(' ')} stroke={C.navy} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
      {pts.map((v, i) => {
        const [x, y] = xy(i);
        return <Circle key={i} cx={x} cy={y} r={4.5} fill={v < 100 ? C.lime : C.orange} stroke={C.navy} strokeWidth={1.5} />;
      })}
    </Svg>
  );
}

function ReportMini({ compact }: { compact: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, height: compact ? 26 : 66 }} accessible accessibilityLabel="A report with a fixed seed and a species tally: 2 ants, 1 bee">
      {!compact && (
        <Card radius={8} style={{ width: 96 }} contentStyle={{ padding: 10, height: 62, gap: 7 }}>
          {[70, 56, 64, 40].map((w) => (
            <View key={w} style={{ width: w, height: 5, borderRadius: 3, backgroundColor: w === 70 ? C.navy : C.lockedEdge }} />
          ))}
        </Card>
      )}
      <View style={{ paddingHorizontal: 10, height: compact ? 22 : 30, borderRadius: 15, backgroundColor: C.sun, borderWidth: compact ? 1.5 : 2, borderColor: C.navy, justifyContent: 'center' }}>
        <Text style={monoBold(compact ? 12 : 13)}>set.seed(42)</Text>
      </View>
      <View style={{ gap: compact ? 0 : 6 }}>
        {([['ant', 2], ['bee', 1]] as [string, number][]).map(([n, v]) => (
          <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={monoBold(12)}>{n}</Text>
            <View style={{ width: v * (compact ? 24 : 28), height: compact ? 10 : 15, borderRadius: 3, backgroundColor: C.sky, borderWidth: 1.5, borderColor: C.navy }} />
          </View>
        ))}
      </View>
    </View>
  );
}

function BatchBars() {
  const rows: [string, number, boolean][] = [['S1', 52, false], ['S2', 48, false], ['S3', 71, true], ['S4', 50, false]];
  return (
    <View style={{ gap: 4, height: 66 }} accessible accessibilityLabel="GC content for four samples; S3 at 71 percent is flagged">
      {rows.map(([s, v, flag]) => (
        <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[monoBold(12), { width: 22 }]}>{s}</Text>
          <View style={{ flex: 1, height: 12, borderRadius: 6, backgroundColor: C.locked, borderWidth: 1.5, borderColor: C.navy, overflow: 'hidden' }}>
            <View style={{ width: `${v}%`, height: '100%', backgroundColor: flag ? C.orange : C.sky }} />
          </View>
          <Text style={[monoBold(12), { width: 72 }]}>{v}%{flag ? ' flag' : ''}</Text>
        </View>
      ))}
    </View>
  );
}

export function PhasePicture({ kind, compact = false }: { kind: string; compact?: boolean }) {
  const [width, setWidth] = useState(300);
  return (
    <View onLayout={(e) => setWidth(Math.max(120, e.nativeEvent.layout.width))}>
      {kind === 'helix' && (compact ? <DNAStrip sequence="ATGCGC" /> : <HelixGauge />)}
      {kind === 'quality' && <QualityBars compact={compact} width={width} />}
      {kind === 'plate' && <WellPlate compact={compact} width={width} />}
      {kind === 'growth' && <GrowthCurve width={width} height={compact ? 30 : 66} />}
      {kind === 'report' && <ReportMini compact={compact} />}
      {kind === 'batch' && <BatchBars />}
    </View>
  );
}

// ---------- Project card ----------
export interface LiveOutput {
  label: string;
  text: string;
  color: string;
}

export function DoneTick({ size = 20 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.lime, borderWidth: 2, borderColor: C.navy, alignItems: 'center', justifyContent: 'center' }}>
      <CheckIcon size={size * 0.55} />
    </View>
  );
}

const DashedDot = ({ size = 20 }: { size?: number }) => <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderStyle: 'dashed', borderColor: C.grey }} />;

export function ProjectCard({ phase, part, live }: { phase: TrackPhase; part: number; live?: LiveOutput }) {
  return (
    <Card radius={20} shadow contentStyle={{ padding: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.navy }}>
        <Text style={[heading(17), { color: C.cream, flex: 1 }]} numberOfLines={2}>{phase.project}</Text>
        <Text style={[body(13, true), { color: C.lavender }]}>{part > 4 ? 'Built' : `Part ${part} of 4`}</Text>
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ width: 18, height: 8, borderRadius: 4, backgroundColor: i < part ? C.lime : i === part ? C.sky : C.muted }} />
          ))}
        </View>
      </View>
      <View style={{ paddingHorizontal: 12, paddingTop: 6 }}>
        <PhasePicture kind={phase.picture} compact />
      </View>
      <View style={{ paddingTop: 4 }}>
        {phase.parts.map((row, i) => {
          const n = i + 1;
          const isLive = n === part && !!live;
          return (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 34, paddingHorizontal: 12, paddingVertical: 2, borderTopWidth: 1.5, borderTopColor: C.locked, backgroundColor: isLive ? C.hintBlue : 'transparent' }}>
              {n < part ? <DoneTick /> : isLive ? <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.sky, borderWidth: 2, borderColor: C.navy }} /> : <DashedDot />}
              <Text style={[body(14, true), { color: n <= part ? C.navy : C.lockedText, flexShrink: 1 }]}>{row[0]}</Text>
              <View style={{ flex: 1 }} />
              {n < part && <Text style={monoBold(14)}>{row[1]}</Text>}
              {isLive && live && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                  <Text style={[body(12, true), { color: C.muted }]}>{live.label}</Text>
                  <View style={{ maxWidth: 170, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: C.screen }} accessibilityLiveRegion="polite">
                    <Text style={[monoBold(live.text.length <= 10 ? 15 : 13), { color: live.color }]}>{live.text}</Text>
                  </View>
                </View>
              )}
              {n > part || (n === part && !live) ? (
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: C.grey }}>
                  <Text style={[body(13, true), { color: C.lockedText }]}>Part {n}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

// ---------- Slide-up feedback sheet ----------
export function useSlideUp(visible: boolean) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      v.setValue(0);
      Animated.timing(v, { toValue: 1, duration: 260, easing: EASE, useNativeDriver: true }).start();
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  return { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) }] };
}

function PoppingImage({ name, width, height, style }: { name: string; width: number; height: number; style?: object }) {
  const s = useRef(new Animated.Value(0.9)).current;
  const y = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(s, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={[{ position: 'absolute', transform: [{ scale: s }, { translateY: y }] }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <BundleImage name={name} style={{ width, height }} />
    </Animated.View>
  );
}

export function FeedbackSheet({
  correct,
  title,
  message,
  answerLine,
  bonusLine,
  note,
  robot,
  onContinue,
  onRetry,
}: {
  correct: boolean;
  title: string;
  message: string;
  answerLine?: string;
  bonusLine?: string;
  note?: string;
  robot: string;
  onContinue: () => void;
  onRetry: () => void;
}) {
  const anim = useSlideUp(true);
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 6, backgroundColor: correct ? C.successSheet : C.missSheet, borderTopWidth: BORDER, borderTopColor: C.navy, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 }, anim]} accessibilityLiveRegion="polite">
      <PoppingImage name={robot} width={104} height={104} style={{ right: 14, top: -58 }} />
      <View style={{ paddingRight: 110, gap: 6 }}>
        <Text style={heading(28)} accessibilityRole="header">{title}</Text>
        <Text style={body(16)}>{message}</Text>
        {correct && bonusLine ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: C.navy, marginTop: 6 }}>
            <BoltIcon size={16} stroke={C.sky} />
            <Text style={[body(15, true), { color: C.cream }]}>{bonusLine}</Text>
          </View>
        ) : null}
        {!correct && answerLine ? (
          <Card radius={12} style={{ alignSelf: 'flex-start', marginTop: 6 }} contentStyle={{ paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={monoBold(15)}>{answerLine}</Text>
          </Card>
        ) : null}
      </View>
      {correct && note ? (
        <View style={{ marginTop: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: C.navy }}>
          <Text style={body(14)}>{note}</Text>
        </View>
      ) : null}
      <ChunkyButton title={correct ? 'Continue' : 'Try again'} fill={correct ? C.lime : C.orange} onPress={correct ? onContinue : onRetry} style={{ marginTop: 16 }} />
    </Animated.View>
  );
}

// ---------- Quit warning (replaces the system pop-up) ----------
export function QuitSheet({ form, questionsDone, total, bolts, onKeep, onLeave }: { form: RobotForm; questionsDone: number; total: number; bolts: number; onKeep: () => void; onLeave: () => void }) {
  const anim = useSlideUp(true);
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 10, justifyContent: 'flex-end' }]} accessibilityViewIsModal>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(23,30,99,0.55)' }]} onPress={onKeep} accessibilityLabel="Keep going" />
      <Animated.View style={[{ backgroundColor: C.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 30 }, anim]}>
        <BundleImage name={moodImage(form, 'surprised')} style={{ position: 'absolute', right: 16, top: -64, width: 104, height: 110 }} />
        <Text style={[heading(28), { paddingRight: 120 }]} accessibilityRole="header">Leave this lesson?</Text>
        <Text style={[body(16), { marginTop: 6, paddingRight: 120 }]}>All progress in this lesson will be lost.</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Card radius={12} contentStyle={{ paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={body(14, true)}>{questionsDone} of {total} questions done</Text>
          </Card>
          <Card fill={C.missSheet} radius={12} contentStyle={{ paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <BoltIcon size={14} />
            <Text style={body(14, true)}>{bolts} bolts lost</Text>
          </Card>
        </View>
        <Text style={[body(14), { color: C.muted, marginTop: 10 }]}>Bolts only go to your total when you finish the lesson.</Text>
        <ChunkyButton title="Keep going" onPress={onKeep} style={{ marginTop: 16 }} />
        <Pressable onPress={onLeave} accessibilityRole="button" style={{ marginTop: 12, height: 60 }}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 4, height: 56, borderRadius: 18, backgroundColor: C.deepOrange }} />
          <View style={{ height: 56, borderRadius: 18, borderWidth: BORDER, borderColor: C.deepOrange, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[heading(20), { color: '#9A3F0A' }]}>Leave and lose progress</Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ---------- Stars with pop-in and shimmer ----------
function ShimmerStar({ on, index, size, reduce }: { on: boolean; index: number; size: number; reduce: boolean }) {
  const pop = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const shine = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    if (reduce) return;
    Animated.sequence([Animated.delay(350 + index * 130), Animated.spring(pop, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true })]).start();
    if (on) {
      Animated.sequence([
        Animated.delay(900 + index * 350),
        Animated.loop(Animated.sequence([
          Animated.timing(shine, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(shine, { toValue: 0.2, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])),
      ]).start();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={{ width: size, height: size, opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }, { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['-18deg', '0deg'] }) }] }}>
      <StarIcon size={size} fill={on ? C.sun : C.grey} />
      {on && (
        <Animated.View style={{ position: 'absolute', left: size * 0.27, top: size * 0.19, opacity: shine, transform: [{ scale: shine.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] }) }] }}>
          <Sparkle size={size * 0.23} />
        </Animated.View>
      )}
      {on && <Animated.View style={{ position: 'absolute', left: size * 0.62, top: size * 0.15, width: size * 0.12, height: size * 0.12, borderRadius: size, backgroundColor: '#FFFFFF', opacity: shine }} />}
    </Animated.View>
  );
}

export function StarsRow({ filled, total = 5, size = 48 }: { filled: number; total?: number; size?: number }) {
  const reduce = useReduceMotion();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessible accessibilityLabel={`${filled} of ${total} right on the first try`}>
      {Array.from({ length: total }, (_, i) => (
        <ShimmerStar key={i} on={i < filled} index={i} size={size} reduce={reduce} />
      ))}
    </View>
  );
}

// ---------- Learn home counters with tap-to-open bubbles ----------
export function StatChipsRow({ streak, bolts, minutes, goal = DAILY_GOAL_MINUTES }: { streak: number; bolts: number; minutes: number; goal?: number }) {
  const [open, setOpen] = useState<null | 'streak' | 'bolts' | 'time'>(null);
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    pop.setValue(0);
    if (open) Animated.spring(pop, { toValue: 1, friction: 7, tension: 160, useNativeDriver: true }).start();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (k: 'streak' | 'bolts' | 'time') => setOpen(open === k ? null : k);
  const left = Math.max(goal - minutes, 0);
  const bubble =
    open === 'streak'
      ? streak > 0
        ? { title: `${streak} day streak`, msg: `You've learned ${streak} days in a row. Do one lesson today to keep it going.` }
        : { title: 'No streak yet', msg: 'Finish a lesson today to start your streak.' }
      : open === 'bolts'
        ? { title: `${bolts} bolts`, msg: bolts > 0 ? 'Every right answer in a lesson earns 10 bolts. Keep learning to collect more.' : 'Every right answer in a lesson earns 10 bolts. Start a lesson to earn your first ones.' }
        : { title: `${minutes} of ${goal} minutes today`, msg: left > 0 ? `Learn ${left} more minutes to hit your daily goal and earn 20 bonus bolts.` : 'Daily goal reached. Nice work.' };
  const chip = (k: 'streak' | 'bolts' | 'time', label: string, content: React.ReactNode) => (
    <Pressable onPress={() => toggle(k)} accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Shows more about this">
      <Card radius={22} shadow contentStyle={{ height: 44, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {content}
      </Card>
    </Pressable>
  );
  return (
    <View style={{ zIndex: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {chip('streak', `${streak} day streak`, <><FlameIcon size={20} /><Text style={heading(18)}>{streak}</Text></>)}
        {chip('bolts', `${bolts} bolts`, <><BoltIcon size={22} /><Text style={heading(18)}>{bolts}</Text></>)}
        <View style={{ flex: 1 }} />
        {chip(
          'time',
          `${minutes} of ${goal} minutes today`,
          <>
            <Svg width={22} height={22} viewBox="0 0 22 22">
              <Circle cx={11} cy={11} r={9} stroke={C.locked} strokeWidth={4} fill="none" />
              <Circle cx={11} cy={11} r={9} stroke={C.navy} strokeWidth={4} fill="none" strokeDasharray={`${(2 * Math.PI * 9 * Math.min(minutes, goal)) / goal} 100`} transform="rotate(-90 11 11)" />
            </Svg>
            <Text style={heading(16)}>{minutes}/{goal} min</Text>
          </>,
        )}
      </View>
      {open && (
        <Animated.View style={{ position: 'absolute', top: 54, width: 262, zIndex: 21, ...(open === 'time' ? { right: 0 } : { left: open === 'bolts' ? 48 : 0 }), opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
          <Pressable onPress={() => setOpen(null)}>
            <Card radius={18} shadow contentStyle={{ padding: 14, gap: 6 }}>
              <Text style={heading(20)}>{bubble.title}</Text>
              {open === 'time' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1, height: 12, borderRadius: 6, backgroundColor: C.locked, borderWidth: 2, borderColor: C.navy, overflow: 'hidden' }}>
                    <View style={{ width: `${(100 * Math.min(minutes, goal)) / goal}%`, height: '100%', backgroundColor: C.lime }} />
                  </View>
                  <Text style={[body(14, true), { color: C.muted }]}>{minutes} / {goal} min</Text>
                </View>
              )}
              <Text style={body(15)}>{bubble.msg}</Text>
            </Card>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

// ---------- Week strip ----------
export function WeekStrip({ streak, activeToday, dark = true }: { streak: number; activeToday: boolean; dark?: boolean }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessible accessibilityLabel={`${streak} day streak this week`}>
      {letters.map((l, i) => {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        const back = Math.round((today.getTime() - day.getTime()) / 86400000);
        const isToday = back === 0;
        const done = back >= (activeToday ? 0 : 1) && back < streak + (activeToday ? 0 : 1);
        return (
          <View key={i} style={{ alignItems: 'center', gap: 4 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: isToday ? C.orange : done ? C.lime : dark ? 'rgba(255,255,255,0.1)' : C.locked, borderWidth: BORDER, borderColor: isToday || done ? C.navy : dark ? C.lilac : C.lockedEdge, borderStyle: isToday || done ? 'solid' : 'dashed' }}>
              {isToday ? <FlameIcon size={16} fill={C.cream} stroke={C.navy} /> : done ? <CheckIcon size={14} /> : null}
            </View>
            <Text style={[body(14, true), { color: dark ? C.lavender : C.muted }]}>{l}</Text>
          </View>
        );
      })}
    </View>
  );
}

export const HScroll = ({ children }: { children: React.ReactNode }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>{children}</ScrollView>
);
