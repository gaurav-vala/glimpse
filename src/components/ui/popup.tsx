import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, Cancel01Icon } from './Icon';
import { PressableScale } from './pressable-scale';
import { Button, ButtonVariant } from './button';
import { DarkTheme, Fonts, Palette, Radius, Spacing } from '../../theme/theme';

export interface PopupProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  showCloseButton?: boolean;
  showHandle?: boolean;
  maxHeightPercent?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Popup({
  visible,
  onClose,
  title,
  subtitle,
  showCloseButton = true,
  showHandle = true,
  maxHeightPercent = 0.85,
  contentContainerStyle,
  children,
}: PopupProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();

  // Internal modal visibility state to allow exit animations to complete before unmounting
  const [isRendered, setIsRendered] = useState(visible);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Synchronize rendered state when visible becomes true
  if (visible && !isRendered) {
    setIsRendered(true);
  }

  // Animation shared values
  const backdropProgress = useSharedValue(0);
  const sheetTranslateY = useSharedValue(screenHeight * 0.5);
  const sheetScale = useSharedValue(0.94);
  const sheetOpacity = useSharedValue(0);
  const keyboardShift = useSharedValue(0);

  // Track keyboard appearance to float card above it
  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Smoothly animate keyboard shift
  useEffect(() => {
    keyboardShift.value = withTiming(keyboardHeight, {
      duration: Platform.OS === 'ios' ? 240 : 200,
    });
  }, [keyboardHeight, keyboardShift]);

  // Entrance and exit animations
  useEffect(() => {
    if (visible) {
      // Smooth backdrop fade-in
      backdropProgress.value = withTiming(1, { duration: 250 });

      // Spring entry: translation + subtle scale expansion
      sheetTranslateY.value = withSpring(0, {
        damping: 24,
        stiffness: 280,
        mass: 0.85,
      });
      sheetScale.value = withSpring(1, {
        damping: 22,
        stiffness: 260,
      });
      sheetOpacity.value = withTiming(1, { duration: 180 });
    } else if (isRendered) {
      // Exit animation: swift drop & fade
      backdropProgress.value = withTiming(0, { duration: 200 });
      sheetScale.value = withTiming(0.95, { duration: 180 });
      sheetOpacity.value = withTiming(0, { duration: 180 });

      sheetTranslateY.value = withTiming(
        screenHeight * 0.45,
        { duration: 200 },
        (finished) => {
          if (finished) {
            runOnJS(setIsRendered)(false);
          }
        }
      );
    }
  }, [visible, isRendered, screenHeight, backdropProgress, sheetTranslateY, sheetScale, sheetOpacity]);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropProgress.value,
  }));

  const animatedSheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [
      { translateY: sheetTranslateY.value - keyboardShift.value },
      { scale: sheetScale.value },
    ],
  }));

  if (!isRendered) {
    return null;
  }

  // Floating bottom gap so the card floats above the screen bottom
  const bottomGap = Math.max(insets.bottom, 14);

  // Maximum card height taking insets and keyboard into account
  const maxCardHeight = Math.max(
    280,
    screenHeight * maxHeightPercent - (keyboardHeight > 0 ? keyboardHeight * 0.5 : 0)
  );

  const cardWidth = Math.min(screenWidth - 32, 520);

  return (
    <Modal
      visible={isRendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        {/* Animated Dimmed Backdrop */}
        <AnimatedPressable
          style={[styles.backdrop, animatedBackdropStyle]}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        />

        {/* Animated Floating Card */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              width: cardWidth,
              maxHeight: maxCardHeight,
              marginBottom: bottomGap,
            },
            animatedSheetStyle,
            contentContainerStyle,
          ]}
        >
          {/* Subtle Top Grab Handle Pill */}
          {showHandle ? (
            <View style={styles.handleContainer}>
              <View style={styles.handlePill} />
            </View>
          ) : null}

          {/* Header Row: Title & Soft Grey Circular Close Button */}
          {title || showCloseButton ? (
            <View style={styles.headerRow}>
              <View style={styles.headerTextGroup}>
                {title ? <Text style={styles.titleText}>{title}</Text> : null}
                {subtitle ? (
                  <Text style={styles.subtitleText}>{subtitle}</Text>
                ) : null}
              </View>

              {showCloseButton ? (
                <PressableScale
                  haptic
                  scaleTo={0.92}
                  onPress={() => {
                    Keyboard.dismiss();
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Close dialog"
                  style={styles.closeBtn}
                >
                  <AppIcon
                    icon={Cancel01Icon}
                    size={14}
                    color={DarkTheme.colors.textMuted}
                    strokeWidth={2.4}
                  />
                </PressableScale>
              ) : null}
            </View>
          ) : null}

          {/* Scrollable Body Content */}
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.scrollBody}
            contentContainerStyle={styles.bodyContent}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export interface ConfirmPopupProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  isConfirming?: boolean;
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
}

export function ConfirmPopup({
  visible,
  onClose,
  title,
  subtitle,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  isConfirming = false,
  onConfirm,
  children,
}: ConfirmPopupProps) {
  return (
    <Popup
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      showCloseButton
      showHandle
      maxHeightPercent={0.7}
    >
      <View style={styles.confirmContent}>
        {children}
        <View style={styles.confirmButtonsRow}>
          <View style={styles.confirmBtnCol}>
            <Button
              label={cancelLabel}
              variant="frosted"
              size="md"
              fullWidth
              onPress={onClose}
              disabled={isConfirming}
            />
          </View>
          <View style={styles.confirmBtnCol}>
            <Button
              label={confirmLabel}
              variant={confirmVariant}
              size="md"
              fullWidth
              loading={isConfirming}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Popup>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  // Floating Card: Rounded on all 4 corners, floating above screen bottom
  cardContainer: {
    backgroundColor: Palette.surfaceCard, // #141416 dark OLED surface
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.45,
        shadowRadius: 32,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 6,
  },
  handlePill: {
    width: 36,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
    paddingBottom: Spacing.md,
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  titleText: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    color: DarkTheme.colors.text,
    letterSpacing: -0.4,
  },
  subtitleText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: DarkTheme.colors.textMuted,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.dark200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    width: '100%',
  },
  bodyContent: {
    paddingBottom: 4,
  },
  confirmContent: {
    paddingTop: Spacing.xs,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  confirmBtnCol: {
    flex: 1,
  },
});
