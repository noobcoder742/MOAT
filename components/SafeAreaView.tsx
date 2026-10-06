import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, useSafeAreaInsets } from 'react-native-safe-area-context';

/** Drop-in for react-native-safe-area-context's SafeAreaView.
 *  The native one can report zero insets inside fullScreenModal screens (lessons), which pushes the top bar
 *  under the status bar. This pads with the insets from the root SafeAreaProvider instead, on top of any padding in `style`. */
export function SafeAreaView({ edges = ['top', 'right', 'bottom', 'left'], style, children }: { edges?: readonly Edge[]; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const s = StyleSheet.flatten(style) ?? {};
  const base = (side: 'Top' | 'Right' | 'Bottom' | 'Left') => {
    const axis = side === 'Top' || side === 'Bottom' ? s.paddingVertical : s.paddingHorizontal;
    const v = s[`padding${side}`] ?? axis ?? s.padding ?? 0;
    return typeof v === 'number' ? v : 0;
  };
  const pad = (edge: Edge, side: 'Top' | 'Right' | 'Bottom' | 'Left') => base(side) + (edges.includes(edge) ? insets[edge] : 0);
  return (
    <View style={[s, { paddingTop: pad('top', 'Top'), paddingRight: pad('right', 'Right'), paddingBottom: pad('bottom', 'Bottom'), paddingLeft: pad('left', 'Left') }]}>
      {children}
    </View>
  );
}
