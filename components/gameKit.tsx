import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { BORDER, C, body, code, heading } from '../utils/theme';
import { BundleImage, Card, ChunkyButton } from './ui';

// ---------- Code tokens (GameKit.swift) ----------
export type TokKind = 'plain' | 'keyword' | 'number' | 'string' | 'input';
export interface CodeToken {
  text: string;
  pre: string;
  kind: TokKind;
  hl?: string;
}
export interface CodeLine {
  indent: number;
  tokens: CodeToken[];
}
export const tk = (text: string, pre = ' ', kind: TokKind = 'plain', hl?: string): CodeToken => ({ text, pre, kind, hl });
export const lineLength = (l: CodeLine) => l.tokens.reduce((n, t) => n + t.pre.length + t.text.length, 0);
const tokColor = (k: TokKind) => (k === 'keyword' ? C.codeKeyword : k === 'number' || k === 'input' ? C.codeNumber : k === 'string' ? C.codeString : C.navy);

export function KaraokeLine({ line, fontSize = 14, active, rowHighlight = false, dimmed = false, input }: { line: CodeLine; fontSize?: number; active?: number | null; rowHighlight?: boolean; dimmed?: boolean; input?: (size: number) => React.ReactNode }) {
  const fill = (i: number) => (active == null ? 'transparent' : i === active ? C.lime : i < active ? C.successSheet : 'transparent');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 26, paddingLeft: line.indent * 14 + 4, borderRadius: 8, backgroundColor: rowHighlight ? '#F3EBD3' : 'transparent', opacity: dimmed ? 0.35 : 1 }}>
      {line.tokens.map((t, i) => (
        <React.Fragment key={i}>
          {t.pre ? <Text style={code(fontSize)}>{t.pre}</Text> : null}
          {t.kind === 'input' && input ? (
            input(fontSize)
          ) : (
            <View style={{ borderRadius: 4, paddingHorizontal: 1, backgroundColor: fill(i) }}>
              <Text style={[code(fontSize), { color: i === active ? C.navy : tokColor(t.kind) }]}>{t.text}</Text>
            </View>
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

/** Code card that shrinks its font so the longest line fits (CodePanel). */
export function CodePanel({ lines, activeLine, activeTok = -1, dimmed, input }: { lines: CodeLine[]; activeLine?: number | null; activeTok?: number; dimmed?: (i: number) => boolean; input?: (size: number) => React.ReactNode }) {
  const [width, setWidth] = useState(340);
  let size = 15;
  for (const l of lines) {
    const room = width - 16 - 4 - l.indent * 14 - l.tokens.length * 2;
    size = Math.min(size, room / (Math.max(lineLength(l), 1) * 0.62));
  }
  size = Math.max(9.5, size);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Card radius={16} contentStyle={{ paddingVertical: 10, paddingHorizontal: 8 }}>
        {lines.map((l, i) => (
          <KaraokeLine key={i} line={l} fontSize={size} active={activeLine === i ? activeTok : null} rowHighlight={activeLine === i} dimmed={dimmed?.(i) ?? false} input={input} />
        ))}
      </Card>
    </View>
  );
}

export function RunConsole({ lines }: { lines: string[] }) {
  return (
    <View style={{ minHeight: 74, borderRadius: 12, backgroundColor: C.navy, paddingHorizontal: 12, paddingVertical: 8, gap: 2 }} accessible>
      {lines.length === 0 ? (
        <Text style={[code(14), { color: C.lime, opacity: 0.55 }]}>{'> output shows here'}</Text>
      ) : (
        lines.map((l, i) => (
          <Text key={i} style={[code(14), { color: C.lime }]}>{'> ' + l}</Text>
        ))
      )}
    </View>
  );
}

export function GameFeedbackSheet({ correct, title, message, buttonTitle, robotName, action }: { correct: boolean; title: string; message: string; buttonTitle: string; robotName?: string | null; action: () => void }) {
  return (
    <View style={{ padding: 20, gap: 12, backgroundColor: correct ? C.successSheet : C.missSheet, borderTopWidth: BORDER, borderTopColor: C.navy }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={heading(26)}>{title}</Text>
          <Text style={body(16)}>{message}</Text>
        </View>
        {robotName ? <BundleImage name={robotName} style={{ width: 72, height: 84 }} /> : null}
      </View>
      <ChunkyButton title={buttonTitle} fill={correct ? C.lime : C.orange} onPress={action} />
    </View>
  );
}

/** Draws art at a fixed design size and scales it down to fit the width (FittedArt). */
export function FittedArt({ width = 345, height = 199, children }: { width?: number; height?: number; children: React.ReactNode }) {
  const [avail, setAvail] = useState(width);
  const scale = Math.min(1, avail / width);
  return (
    <View onLayout={(e) => setAvail(e.nativeEvent.layout.width)} style={{ height: height * scale, alignItems: 'center' }}>
      <View style={{ width, height, transform: [{ scale }], marginTop: (height * scale - height) / 2 }}>{children}</View>
    </View>
  );
}

// ---------- Timed steps (StepPlayer) ----------
export interface RunStep {
  line?: number;
  tok?: number;
  wait?: number;
  caption?: string;
  iter?: number;
  grow?: boolean;
  seqIndex?: number;
  clearHighlights?: boolean;
  highlight?: string;
  ratio?: string;
  output?: string;
  finish?: boolean;
}

export function useStepPlayer() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const play = useCallback(
    (steps: RunStep[], apply: (s: RunStep) => void) => {
      cancel();
      let i = 0;
      const next = () => {
        if (i >= steps.length) return;
        const s = steps[i++];
        apply(s);
        if (s.finish) return;
        timer.current = setTimeout(next, s.wait ?? 150);
      };
      next();
    },
    [cancel],
  );
  useEffect(() => cancel, [cancel]);
  return { play, cancel };
}
