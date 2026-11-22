import React from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { PressableScale } from './pressable-scale';
import { Fonts, Radius } from '../../theme/theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'frosted'
  | 'night'
  | 'ghost'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonShape = 'rounded' | 'pill' | 'circle';

export interface ButtonProps {
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  icon?: any;
  trailingIcon?: any;
  iconOnly?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  noShadow?: boolean;
  gradientColors?: readonly [string, string, ...string[]];
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  iconSize?: number;
  iconColor?: string;
  accessibilityLabel?: string;
  scaleTo?: number;
  haptic?: boolean;
  children?: React.ReactNode;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  shape = 'pill',
  icon,
  trailingIcon,
  iconOnly = false,
  fullWidth = false,
  disabled = false,
  loading = false,
  noShadow = false,
  gradientColors,
  onPress,
  style,
  textStyle,
  iconSize,
  iconColor,
  accessibilityLabel,
  scaleTo = 0.96,
  haptic = true,
  children,
}: ButtonProps) {
  const sizeConfig = {
    sm: {
      height: 36,
      paddingHorizontal: 14,
      fontSize: 12.5,
      iconSize: 15,
      gap: 6,
    },
    md: {
      height: 44,
      paddingHorizontal: 18,
      fontSize: 14,
      iconSize: 17,
      gap: 7,
    },
    lg: {
      height: 52,
      paddingHorizontal: 22,
      fontSize: 15.5,
      iconSize: 19,
      gap: 8,
    },
  }[size];

  const resolvedIconSize = iconSize ?? sizeConfig.iconSize;

  const palette = {
    primary: {
      gradient: ['#2563EB', '#1D4ED8'] as const,
      bg: '#2563EB',
      text: '#FFFFFF',
      icon: '#FFFFFF',
      border: 'rgba(255, 255, 255, 0.16)',
      shadow: styles.shadowPrimary,
    },
    secondary: {
      gradient: ['#26262B', '#17171A'] as const,
      bg: '#17171A',
      text: '#FAFAFA',
      icon: '#FAFAFA',
      border: 'rgba(255, 255, 255, 0.10)',
      shadow: styles.shadowSecondary,
    },
    frosted: {
      gradient: ['rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.07)'] as const,
      bg: 'rgba(255, 255, 255, 0.10)',
      text: '#FFFFFF',
      icon: '#FFFFFF',
      border: 'rgba(255, 255, 255, 0.18)',
      shadow: null,
    },
    night: {
      gradient: ['#1C1C20', '#101013'] as const,
      bg: '#121215',
      text: '#FAFAFA',
      icon: '#FAFAFA',
      border: 'rgba(255, 255, 255, 0.10)',
      shadow: styles.shadowSecondary,
    },
    ghost: {
      gradient: null,
      bg: 'transparent',
      text: '#FAFAFA',
      icon: '#FAFAFA',
      border: 'transparent',
      shadow: null,
    },
    danger: {
      gradient: ['#DC2626', '#B91C1C'] as const,
      bg: '#DC2626',
      text: '#FFFFFF',
      icon: '#FFFFFF',
      border: 'rgba(239, 68, 68, 0.3)',
      shadow: styles.shadowPrimary,
    },
  }[variant];

  const resolvedIconColor = iconColor ?? palette.icon;
  const isCircle = shape === 'circle' || (iconOnly && shape !== 'pill');
  const resolvedBorderRadius = isCircle
    ? sizeConfig.height / 2
    : shape === 'pill'
    ? Radius.pill
    : Radius.md;

  const activeGradient = gradientColors ?? palette.gradient;

  const renderIconElement = (targetIcon: any) => {
    if (!targetIcon) return null;
    if (React.isValidElement(targetIcon)) {
      return targetIcon;
    }
    return (
      <HugeiconsIcon
        icon={targetIcon}
        size={resolvedIconSize}
        color={resolvedIconColor}
        strokeWidth={2}
      />
    );
  };

  const contentText = label ?? (typeof children === 'string' ? children : null);

  return (
    <PressableScale
      haptic={haptic}
      scaleTo={scaleTo}
      disabled={disabled || loading}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.outerContainer,
        {
          height: sizeConfig.height,
          borderRadius: resolvedBorderRadius,
        },
        isCircle && { width: sizeConfig.height },
        fullWidth && styles.fullWidth,
        !noShadow && palette.shadow,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: resolvedBorderRadius,
            overflow: 'hidden',
            borderWidth: palette.border !== 'transparent' ? 1 : 0,
            borderColor: palette.border,
          },
        ]}
      >
        {activeGradient ? (
          <LinearGradient
            colors={activeGradient}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.bg }]} />
        )}
      </View>

      <View
        style={[
          styles.contentLayer,
          {
            height: sizeConfig.height,
            gap: sizeConfig.gap,
            paddingHorizontal: isCircle ? 0 : sizeConfig.paddingHorizontal,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={palette.text} />
        ) : (
          <>
            {renderIconElement(icon)}
            {contentText ? (
              <Text
                style={[
                  styles.label,
                  {
                    color: palette.text,
                    fontSize: sizeConfig.fontSize,
                  },
                  textStyle,
                ]}
                numberOfLines={1}
              >
                {contentText}
              </Text>
            ) : typeof children !== 'string' ? (
              children
            ) : null}
            {renderIconElement(trailingIcon)}
          </>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentLayer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: Fonts.semiBold,
    letterSpacing: -0.2,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.45,
  },
  shadowPrimary: Platform.select({
    ios: {
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
    },
    android: { elevation: 4 },
    default: {},
  }),
  shadowSecondary: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  }),
});
