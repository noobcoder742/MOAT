import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { SafeAreaView } from '../components/SafeAreaView';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BundleImage, ChunkyButton } from '../components/ui';
import { C, body, heading } from '../utils/theme';
import { ROBOT_NAMES } from '../types/models';
import { useReduceMotion } from '../hooks/useReduceMotion';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Evolution'>;

export default function EvolutionScreen({ route, navigation }: Props) {
  const { form } = route.params;
  const reduce = useReduceMotion();
  const [revealed, setRevealed] = useState(false);
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
    const t = setTimeout(() => {
      setRevealed(true);
      navigation.setOptions({ gestureEnabled: true });
      if (reduce) v.setValue(1);
      else Animated.spring(v, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
    }, 900);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream, paddingHorizontal: 20, alignItems: 'center' }}>
      <View style={{ flex: 1 }} />
      <Text style={heading(28)} accessibilityRole="header">{revealed ? 'Your blob evolved!' : "Something's happening…"}</Text>
      <View style={{ width: 200, height: 230, marginVertical: 20 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Animated.View style={{ position: 'absolute', opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) }] }}>
          <BundleImage name="blob" style={{ width: 200, height: 230 }} />
        </Animated.View>
        <Animated.View style={{ position: 'absolute', opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
          <BundleImage name={form} style={{ width: 200, height: 230 }} />
        </Animated.View>
      </View>
      {revealed && <Text style={[body(17, true), { textAlign: 'center' }]}>Meet {ROBOT_NAMES[form]}. Find it in the Workshop.</Text>}
      <View style={{ flex: 1 }} />
      <View style={{ alignSelf: 'stretch', padding: 16, opacity: revealed ? 1 : 0 }}>
        <ChunkyButton title="Continue" enabled={revealed} onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
}
