import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, PaywallTier } from '../hooks/useAppStore';
import { BORDER, C, body, heading, wordmark } from '../utils/theme';
import { BundleImage, ChunkyButton } from './ui';
import { CheckIcon } from './trackKit';

/** PaywallTier.swift */
const TIER = {
  premium: { title: 'Premium', price: '$9.90', robot: 'orb', bg: C.sky, accent: C.navy, text: C.navy, features: ['Restricted to 9 levels per day', 'Feedback on answers available', 'Pre-set explanations on answers'] },
  expert: { title: 'Expert', price: '$19.90', robot: 'cat', bg: C.logo, accent: C.lime, text: C.cream, features: ['Unlimited access to levels and phases', 'Unlimited Streak restores', 'Detailed answer analysis and AI chatbot'] },
} satisfies Record<PaywallTier, unknown>;

function Confetti() {
  const { width, height } = Dimensions.get('window');
  const colors = [C.lime, C.sky, C.orange, C.navy, C.card];
  const pieces = useMemo(
    () => Array.from({ length: 26 }, (_, i) => ({ x: Math.random() * width, color: colors[i % colors.length], size: 8 + Math.random() * 8, circle: Math.random() > 0.5, duration: 1800 + Math.random() * 1600, phase: Math.random(), spin: 240 + Math.random() * 480, v: new Animated.Value(0) })),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    const loops = pieces.map((p) => {
      p.v.setValue(p.phase);
      const loop = Animated.loop(Animated.timing(p.v, { toValue: 1 + p.phase, duration: p.duration, easing: Easing.linear, useNativeDriver: true }));
      loop.start();
      return loop;
    });
    return () => loops.forEach((l) => l.stop());
  }, [pieces]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((p, i) => {
        const prog = Animated.modulo(p.v, 1);
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.x - p.size / 2,
              top: 0,
              width: p.size,
              height: p.size,
              borderRadius: p.circle ? p.size / 2 : 2,
              backgroundColor: p.color,
              opacity: prog.interpolate({ inputRange: [0, 0.06, 1], outputRange: [0, 1, 1] }),
              transform: [
                { translateY: prog.interpolate({ inputRange: [0, 1], outputRange: [-20, height + 20] }) },
                { rotate: prog.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

export function PaywallOverlay() {
  const store = useAppStore();
  const tier = TIER[store.paywallTier];
  const scale = useRef(new Animated.Value(0.72)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [isPurchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pkg = useMemo(() => {
    const packages = store.currentOffering?.availablePackages ?? [];
    return packages.find((p) => p.product.priceString === tier.price) ?? packages[0] ?? null;
  }, [store.currentOffering, tier.price]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    if (!store.currentOffering) store.loadOffering();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 0.85, duration: 160, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => store.closePaywall());
  };

  const startTrial = async () => {
    if (!pkg || isPurchasing) return;
    setError(null);
    setPurchasing(true);
    const unlocked = await store.purchase(pkg);
    setPurchasing(false);
    if (unlocked) close();
    else setError("Purchase didn't go through. Try again?");
  };

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50, alignItems: 'center', justifyContent: 'center' }]} accessibilityViewIsModal>
      <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(27,36,114,0.55)' }]} onPress={close} accessibilityLabel="Close" />
      <Confetti />
      <Animated.View style={{ width: 320, opacity, transform: [{ scale }] }}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 7, bottom: -7, borderRadius: 32, backgroundColor: C.navy }} />
        <View style={{ borderRadius: 32, borderWidth: 4, borderColor: tier.text, backgroundColor: tier.bg, padding: 28, alignItems: 'center' }}>
          <View style={{ alignSelf: 'stretch', alignItems: 'flex-end' }}>
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 34, height: 34, borderRadius: 17, borderWidth: BORDER, borderColor: tier.text, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={18} color={tier.text} />
            </Pressable>
          </View>
          <BundleImage name={tier.robot} style={{ height: 104, width: 120 }} />
          <Text style={[body(14, true), { color: tier.accent, letterSpacing: 2, marginTop: 4 }]}>{tier.title.toUpperCase()}</Text>
          <Text style={[heading(22), { color: tier.text, textAlign: 'center', marginTop: 4 }]}>Unlock your full robot</Text>
          <View style={{ alignItems: 'center', marginTop: 14 }}>
            <Text style={[wordmark(44), { color: tier.text }]} numberOfLines={1} adjustsFontSizeToFit>{pkg?.product.priceString ?? tier.price}</Text>
            <Text style={[body(16, true), { color: tier.text, opacity: 0.85 }]}>/month</Text>
          </View>
          <Text style={[body(13, true), { color: tier.text, opacity: 0.8, marginTop: 2 }]}>First 7 days free, cancel anytime</Text>
          <View style={{ alignSelf: 'stretch', gap: 12, marginVertical: 22 }}>
            {tier.features.map((f) => (
              <View key={f} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.lime, borderWidth: BORDER, borderColor: tier.text, alignItems: 'center', justifyContent: 'center' }}>
                  <CheckIcon size={11} />
                </View>
                <Text style={[body(15, true), { color: tier.text, flex: 1 }]}>{f}</Text>
              </View>
            ))}
          </View>
          <ChunkyButton onPress={startTrial} enabled={!isPurchasing} accessibilityLabel="Start free 7-day trial">
            {isPurchasing ? <ActivityIndicator color={C.navy} /> : <Text style={heading(20)}>Start FREE 7-day Trial</Text>}
          </ChunkyButton>
          {error ? <Text style={[body(13, true), { color: C.orange, marginTop: 8 }]}>{error}</Text> : null}
          <Pressable onPress={close} accessibilityRole="button" style={{ marginTop: 14, minHeight: 44, justifyContent: 'center' }}>
            <Text style={[body(14, true), { color: tier.text, opacity: 0.75, textDecorationLine: 'underline' }]}>Maybe later</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
