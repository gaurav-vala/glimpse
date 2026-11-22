import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import type { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { AppIcon, Camera01Icon, Folder01Icon } from './ui/Icon';
import { DarkTheme, Fonts, Radius, Spacing } from '../theme/theme';
import { useSelectionStore } from '../features/selection/store';

export type BottomTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>
>[0];

export function FloatingTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const isSelectionMode = useSelectionStore((s) => s.isSelectionMode);

  if (isSelectionMode) {
    return null; // Hidden during selection mode
  }

  return (
    <View
      style={[
        styles.wrapper,
        { bottom: Math.max(insets.bottom + 8, 16) },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.pillContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          return (
            <TabButton
              key={route.key}
              isFocused={isFocused}
              label={String(label)}
              routeName={route.name}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

interface TabButtonProps {
  isFocused: boolean;
  label: string;
  routeName: string;
  onPress: () => void;
}

function TabButton({ isFocused, label, routeName, onPress }: TabButtonProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isFocused) {
      scale.value = 1.12;
      scale.value = withSpring(1, { damping: 14, stiffness: 180 });
    }
  }, [isFocused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const icon = routeName === 'albums' ? Folder01Icon : Camera01Icon;

  return (
    <TouchableOpacity
      style={[styles.tabButton, isFocused && styles.tabButtonActive]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
    >
      <Animated.View style={animatedStyle}>
        <AppIcon
          icon={icon}
          size={18}
          color={isFocused ? '#FFFFFF' : DarkTheme.colors.textMuted}
          strokeWidth={isFocused ? 2.2 : 1.8}
        />
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          { color: isFocused ? '#FFFFFF' : DarkTheme.colors.textMuted },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DarkTheme.colors.surfacePill,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: DarkTheme.colors.pillBorder,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  tabLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12.5,
    letterSpacing: -0.2,
  },
});
