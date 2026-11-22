import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
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
import { DarkTheme, Fonts, Radius } from '../theme/theme';
import { useSelectionStore } from '../features/selection/store';
import { useMainTabStore } from '../features/navigation/tabStore';

export type BottomTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>
>[0];

const PILL_CONTAINER_WIDTH = 238;
const PADDING = 4;
const TAB_SLOT_WIDTH = (PILL_CONTAINER_WIDTH - PADDING * 2) / 2; // 115dp each

export function FloatingTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const isSelectionMode = useSelectionStore((s) => s.isSelectionMode);
  const activeTab = useMainTabStore((s) => s.activeTab);
  const setActiveTab = useMainTabStore((s) => s.setActiveTab);

  // Damped slide animation with zero wobble
  const indicatorTranslateX = useSharedValue(activeTab * TAB_SLOT_WIDTH);

  useEffect(() => {
    indicatorTranslateX.value = withSpring(activeTab * TAB_SLOT_WIDTH, {
      damping: 30,
      stiffness: 320,
      mass: 0.8,
    });
  }, [activeTab, indicatorTranslateX]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorTranslateX.value }],
  }));

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
        {/* Sleek Sliding Highlight Pill */}
        <Animated.View style={[styles.activeIndicator, animatedIndicatorStyle]} />

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = activeTab === index;

          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const onPress = () => {
            Haptics.selectionAsync().catch(() => {});
            setActiveTab(index);

            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (state.index !== index && !event.defaultPrevented) {
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

function TabButton({
  isFocused,
  label,
  routeName,
  onPress,
}: TabButtonProps) {
  const icon = routeName === 'albums' ? Folder01Icon : Camera01Icon;

  return (
    <PressableScale
      haptic
      scaleTo={0.94}
      onPress={onPress}
      style={styles.tabButton}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
    >
      <AppIcon
        icon={icon}
        size={17}
        color={isFocused ? '#FFFFFF' : DarkTheme.colors.textMuted}
        strokeWidth={isFocused ? 2.2 : 1.8}
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
    width: PILL_CONTAINER_WIDTH,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DarkTheme.colors.surfacePill,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: DarkTheme.colors.pillBorder,
    padding: PADDING,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  activeIndicator: {
    position: 'absolute',
    left: PADDING,
    top: PADDING,
    bottom: PADDING,
    width: TAB_SLOT_WIDTH,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  tabButton: {
    width: TAB_SLOT_WIDTH,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    zIndex: 1,
  },
  tabLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
});
