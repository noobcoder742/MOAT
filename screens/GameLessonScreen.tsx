import React, { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from '../components/SafeAreaView';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppStore } from '../hooks/useAppStore';
import { QuitSheet } from '../components/trackKit';
import { C, body } from '../utils/theme';
import { BOLTS_FOR_FINISHING, LessonTopBar, SimpleLessonComplete } from './LessonScreen';
import { LOOP_CONFIGS, LoopGame, LoopKind } from './games/LoopGame';
import { STAGES, StageGame } from './games/StageGame';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'GameLesson'>;

/** GameLessonView.swift, with the custom quit warning instead of the system pop-up. */
export default function GameLessonScreen({ route, navigation }: Props) {
  const store = useAppStore();
  const lesson = useMemo(() => store.orderedLessons.find((l) => l.id === route.params.lessonId), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [progress, setProgress] = useState(0);
  const [bolts, setBolts] = useState(0);
  const [finished, setFinished] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const game = lesson?.game ?? '';
  const finish = () => {
    if (finished) return; // a fast double tap must not award the finishing bolts twice
    setBolts((b) => b + BOLTS_FOR_FINISHING);
    setFinished(true);
  };
  const complete = () => {
    if (!lesson) return navigation.goBack();
    const form = store.completeLesson(lesson, bolts);
    if (form) store.setPendingEvolution(form);
    navigation.goBack();
  };
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: C.cream }}>
      <LessonTopBar progress={progress} bolts={bolts} finished={finished} onQuit={() => setConfirmQuit(true)} />
      {finished ? (
        <SimpleLessonComplete bolts={bolts} form={store.progress.currentForm} onContinue={complete} />
      ) : game in LOOP_CONFIGS ? (
        <LoopGame kind={game as LoopKind} onProgress={setProgress} onBolts={(n) => setBolts((b) => b + n)} onDone={finish} />
      ) : STAGES[game] ? (
        <StageGame game={game} onProgress={setProgress} onBolts={(n) => setBolts((b) => b + n)} onDone={finish} />
      ) : (
        <Text style={[body(16), { padding: 20 }]}>This game isn't available yet.</Text>
      )}
      {confirmQuit && <QuitSheet form={store.progress.currentForm} questionsDone={Math.round(progress * 5)} total={5} bolts={bolts} onKeep={() => setConfirmQuit(false)} onLeave={() => navigation.goBack()} />}
    </SafeAreaView>
  );
}
