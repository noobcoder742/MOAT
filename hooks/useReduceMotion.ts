import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** The Reduce Motion setting (accessibilityReduceMotion in SwiftUI). */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}
