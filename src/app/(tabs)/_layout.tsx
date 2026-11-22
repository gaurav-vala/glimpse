import React from 'react';
import { Tabs } from 'expo-router';
import { FloatingTabBar } from '../../components/FloatingTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Camera',
        }}
      />
      <Tabs.Screen
        name="albums"
        options={{
          title: 'Albums',
        }}
      />
    </Tabs>
  );
}
