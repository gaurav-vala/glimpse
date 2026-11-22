import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, LayoutChangeEvent } from 'react-native';
import type { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { AppIcon, Camera01Icon, Folder01Icon } from './ui/Icon';
import { PressableScale } from './ui/pressable-scale';
import { DarkTheme, Fonts, Radius, Spacing } from '../theme/theme';
import { useSelectionStore } from '../features/selection/store';

export type BottomTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>
>[0];

interface TabLayout {
  x: number;
  width: number;
}

export function FloatingTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const isSelectionMode = useSelectionStore((s) => s.isSelectionMode);
  const [layouts, setLayouts] = useState<{ [index: number]: TabLayout }>({});

  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  const onTabLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      setLayouts((prev) => ({ ...prev, [index]: { x, width } }));
    },
    []
  );

  useEffect(() => {
    const current = layouts[state.index];
    if (current && current.width > 0) {
      indicatorX.value = withSpring(current.x, {
        damping: 22,
        stiffness: 260,
      });
      indicatorWidth.value = withSpring(current.width, {
        damping: 22,
        stiffness: 260,
      });
    }
  }, [state.index, layouts, indicatorX, indicatorWidth]);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    if (indicatorWidth.value === 0) {
      return { opacity: 0 };
    }
    return {
      opacity: 1,
      transform: [{ translateX: indicatorX.value }],
      width: indicatorWidth.value,
    };
  });

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
        {/* Animated Sliding Pill Highlight */}
        <Animated.View style={[styles.activeIndicator, animatedIndicatorStyle]} />

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
            Haptics.selectionAsync().catch(() => {});
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
              index={index}
              isFocused={isFocused}
              label={String(label)}
              routeName={route.name}
              onPress={onPress}
              onLayout={(e) => onTabLayout(index, e)}
            />
          );
        })}
      </View>
    </View>
  );
}

interface TabButtonProps {
  index: number;
  isFocused: boolean;
  label: string;
  routeName: string;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
}

function TabButton({
  isFocused,
  label,
  routeName,
  onPress,
  onLayout,
}: TabButtonProps) {
  const icon = routeName === 'albums' ? Folder01Icon : Camera01Icon;

  return (
    <View onLayout={onLayout} style={styles.buttonWrapper}>
      <PressableScale
        haptic
        scaleTo={0.93}
        onPress={onPress}
        style={styles.tabButton}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
      >
        <AppIcon
          icon={icon}
          size={18}
          color={isFocused ? '#FFFFFF' : DarkTheme.colors.textMuted}
          strokeWidth={isFocused ? 2.3 : 1.8}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: isFocused ? '#FFFFFF' : DarkTheme.colors.textMuted },
          ]}
        >
          {label}
        </Text>
      </PressableScale>
    </View>
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
    paddingHorizontal: 6,
    paddingVertical: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  activeIndicator: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  buttonWrapper: {
    zIndex: 1,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  tabLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12.5,
    letterSpacing: -0.2,
  },
});
