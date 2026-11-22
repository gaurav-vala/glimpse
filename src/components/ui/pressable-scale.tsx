import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  GestureResponderEvent,
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: boolean;
  children?: React.ReactNode;
}

export function PressableScale({
  style,
  scaleTo = 0.96,
  haptic = false,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  children,
  ...rest
}: PressableScaleProps) {
  const held = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + held.value * (scaleTo - 1) }],
  }));

  const handlePressIn = (event: GestureResponderEvent) => {
    held.value = withSpring(1, { damping: 15, stiffness: 220, mass: 0.8 });
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    held.value = withSpring(0, { damping: 15, stiffness: 220, mass: 0.8 });
    onPressOut?.(event);
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (haptic && Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onPress?.(event);
  };

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle, disabled ? { opacity: 0.5 } : null]}
    >
      {children}
    </AnimatedPressable>
  );
}
