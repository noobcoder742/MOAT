import React from 'react';
import { Dimensions, Text, View } from 'react-native';
import { BundleImage, FullScreenPicture } from '../components/ui';
import { C, wordmark } from '../utils/theme';

export default function SplashScreen() {
  const h = Dimensions.get('window').height;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <FullScreenPicture name="splash_bg.jpg" />
      <View style={{ alignItems: 'center', gap: 18, transform: [{ translateY: -h * 0.07 }] }}>
        <BundleImage name="robot_logo_filled" style={{ width: 160, height: 187 }} />
        <Text style={[wordmark(68), { color: C.logo }]} accessibilityRole="header">MOAT</Text>
      </View>
    </View>
  );
}
