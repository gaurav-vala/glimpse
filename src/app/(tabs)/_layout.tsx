import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { AppIcon, Camera01Icon, Folder01Icon } from '../../components/ui/Icon';
import { DarkTheme, Fonts } from '../../theme/theme';
import { useSelectionStore } from '../../features/selection/store';

export default function TabsLayout() {
  const isSelectionMode = useSelectionStore((s) => s.isSelectionMode);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          isSelectionMode && styles.tabBarHidden,
        ],
        tabBarActiveTintColor: DarkTheme.colors.accent,
        tabBarInactiveTintColor: DarkTheme.colors.textSecondary,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Camera',
          tabBarIcon: ({ color, focused }) => (
            <AppIcon
              icon={Camera01Icon}
              size={22}
              color={color}
              strokeWidth={focused ? 2.2 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="albums"
        options={{
          title: 'Albums',
          tabBarIcon: ({ color, focused }) => (
            <AppIcon
              icon={Folder01Icon}
              size={22}
              color={color}
              strokeWidth={focused ? 2.2 : 1.8}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(12, 13, 17, 0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DarkTheme.colors.border,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 0,
  },
  tabBarHidden: {
    display: 'none',
  },
  tabBarLabel: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    letterSpacing: -0.1,
  },
});
