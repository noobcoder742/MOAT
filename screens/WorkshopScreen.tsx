import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from '../components/SafeAreaView';
import { useAppStore } from '../hooks/useAppStore';
import { BundleImage, Card } from '../components/ui';
import { C, body, heading } from '../utils/theme';
import { ROBOT_FORMS, ROBOT_NAMES, RobotForm, isInVersionOne, moodImage } from '../types/models';

const PARTS = [
  { id: 'antennas', name: 'Antennas', unlocked: true },
  { id: 'wheels', name: 'Wheels', unlocked: false },
  { id: 'hands', name: 'Hands', unlocked: false },
];

export default function WorkshopScreen() {
  const store = useAppStore();
  const p = store.progress;
  const formCard = (form: RobotForm) => {
    const owned = p.unlockedForms.includes(form);
    const equipped = p.currentForm === form;
    const status = equipped ? 'Using' : owned ? 'Tap to use' : isInVersionOne(form) ? 'Finish Phase 1' : 'Coming soon';
    return (
      <Pressable key={form} onPress={() => store.equip(form)} disabled={!owned} accessibilityRole="button" accessibilityLabel={`${ROBOT_NAMES[form]}, ${status}`} style={{ width: '31%' }}>
        <Card fill={equipped ? C.lime : owned ? C.card : C.locked} radius={16} shadow={owned} contentStyle={{ padding: 10, alignItems: 'center', gap: 6 }}>
          <BundleImage name={moodImage(form, 'neutral')} style={{ height: 76, width: '100%', opacity: owned ? 1 : 0.35 }} />
          <Text style={body(14, true)}>{ROBOT_NAMES[form]}</Text>
          <Text style={[body(12), { color: C.muted }]}>{status}</Text>
        </Card>
      </Pressable>
    );
  };
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={heading(30)} accessibilityRole="header">Workshop</Text>
        <Card fill="transparent" radius={20} contentStyle={{ paddingVertical: 16, alignItems: 'center', gap: 8 }}>
          <BundleImage name="world_backdrop.jpg" resizeMode="cover" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          <BundleImage name={moodImage(p.currentForm, 'hearts')} style={{ height: 200, width: 200 }} />
          <Text style={heading(22)}>{ROBOT_NAMES[p.currentForm]}</Text>
        </Card>
        <Text style={heading(20)} accessibilityRole="header">Forms</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{ROBOT_FORMS.map(formCard)}</View>
        <Text style={heading(20)} accessibilityRole="header">Parts</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {PARTS.map((part) => (
            <Card key={part.id} fill={part.unlocked ? C.card : C.locked} radius={16} style={{ width: '31%' }} contentStyle={{ padding: 10, alignItems: 'center', gap: 6 }}>
              <BundleImage name={part.id} style={{ height: 70, width: 70, opacity: part.unlocked ? 1 : 0.35, transform: [{ rotate: part.id === 'antennas' ? '-90deg' : '0deg' }] }} />
              <Text style={body(14, true)}>{part.name}</Text>
              <Text style={[body(12), { color: C.muted }]}>{part.unlocked ? 'Unlocked' : 'Locked'}</Text>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
