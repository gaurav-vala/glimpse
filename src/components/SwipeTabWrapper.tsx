import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface SwipeTabWrapperProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  enabled?: boolean;
}

/**
 * SwipeTabWrapper
 * Detects horizontal swipes to seamlessly switch between Camera and Albums tabs.
 * Fails fast on vertical gesture to never block or conflict with FlashList or ScrollView.
 */
export function SwipeTabWrapper({
  children,
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
}: SwipeTabWrapperProps) {
  const triggerSwipeLeft = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSwipeLeft?.();
  };

  const triggerSwipeRight = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSwipeRight?.();
  };

  const pan = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-24, 24])
    .failOffsetY([-18, 18])
    .onEnd((e) => {
      'worklet';
      if (onSwipeLeft && (e.translationX < -45 || e.velocityX < -350)) {
        runOnJS(triggerSwipeLeft)();
      } else if (onSwipeRight && (e.translationX > 45 || e.velocityX > 350)) {
        runOnJS(triggerSwipeRight)();
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.container}>{children}</View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
