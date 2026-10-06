import React, { useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTrackStore } from '../../hooks/useTrackStore';
import { RunResult, TrackLesson } from '../../types/models';
import TrackPlayer from './TrackPlayer';
import { CheckpointIntro, CheckpointResult, ProjectBuilt, TrackLessonComplete } from './TrackResults';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Step =
  | { kind: 'lesson'; lesson: TrackLesson }
  | { kind: 'lessonDone'; lesson: TrackLesson; result: RunResult }
  | { kind: 'projectBuilt' }
  | { kind: 'checkpointIntro' }
  | { kind: 'checkpoint' }
  | { kind: 'checkpointDone'; result: RunResult };

type Props = NativeStackScreenProps<RootStackParamList, 'TrackFlow'>;

/** Lesson, lesson complete, project built, checkpoint intro, checkpoint, result (TrackFlowView). */
export default function TrackFlowScreen({ route, navigation }: Props) {
  const track = useTrackStore();
  const phase = track.track?.phases.find((p) => p.number === route.params.phase);
  const startLesson = phase?.lessons.find((l) => l.id === route.params.lessonId) ?? null;
  const [step, setStep] = useState<Step>(startLesson ? { kind: 'lesson', lesson: startLesson } : { kind: 'checkpointIntro' });
  const [runID, setRunID] = useState(0);
  const close = () => navigation.goBack();
  const go = (s: Step) => {
    if (s.kind === 'lesson' || s.kind === 'checkpoint') setRunID((r) => r + 1);
    setStep(s);
  };
  if (!phase) {
    close();
    return <View />;
  }
  switch (step.kind) {
    case 'lesson':
      return <TrackPlayer key={`${step.lesson.id}-${runID}`} phase={phase} lesson={step.lesson} onFinish={(r) => go({ kind: 'lessonDone', lesson: step.lesson, result: r })} onQuit={close} />;
    case 'lessonDone': {
      const { lesson, result } = step;
      return (
        <TrackLessonComplete
          phase={phase}
          lesson={lesson}
          result={result}
          onContinue={() => {
            const lastPart = lesson.part === phase.lessons.length;
            if (lastPart && result.firstAttempt && phase.lessons.every((l) => track.isFinished(l.id))) go({ kind: 'projectBuilt' });
            else close();
          }}
          onReplay={() => go({ kind: 'lesson', lesson })}
        />
      );
    }
    case 'projectBuilt':
      return <ProjectBuilt phase={phase} onCheckpoint={() => go({ kind: 'checkpointIntro' })} onBack={close} />;
    case 'checkpointIntro':
      return <CheckpointIntro phase={phase} onStart={() => go({ kind: 'checkpoint' })} onClose={close} />;
    case 'checkpoint':
      return <TrackPlayer key={`cp-${runID}`} phase={phase} lesson={null} onFinish={(r) => go({ kind: 'checkpointDone', result: r })} onQuit={close} />;
    case 'checkpointDone':
      return <CheckpointResult phase={phase} result={step.result} onReplay={() => go({ kind: 'checkpoint' })} onDone={close} />;
  }
}
