import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { mediaService } from '../features/media/mediaService';
import { PermissionStatusResult } from '../features/media/types';
import { PermissionGate } from '../components/PermissionGate';
import { UpdateModal } from '../components/UpdateModal';
import { useUpdateStore } from '../features/updates/useUpdateStore';
import { Palette } from '../theme/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const [permission, setPermission] = useState<PermissionStatusResult | null>(null);

  useEffect(() => {
    let isMounted = true;
    mediaService.checkPermissions().then((res) => {
      if (isMounted) {
        setPermission(res);
      }
    });

    // Check for updates silently on app launch
    useUpdateStore.getState().checkForUpdates(false).catch(() => {});

    // Re-check permission when app returns to foreground (PERM-4)
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        mediaService.checkPermissions().then((res) => {
          if (isMounted) {
            setPermission(res);
          }
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const handleRequestAccess = async () => {
    const res = await mediaService.requestPermissions();
    setPermission(res);
  };

  if (!fontsLoaded) {
    return <View style={styles.root} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <UpdateModal />
      {permission && !permission.granted ? (
        <PermissionGate
          canAskAgain={permission.canAskAgain}
          onRequestAccess={handleRequestAccess}
        />
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Palette.black },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="viewer"
            options={{
              headerShown: false,
              animation: 'fade',
              presentation: 'transparentModal',
            }}
          />
        </Stack>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.black,
  },
});
