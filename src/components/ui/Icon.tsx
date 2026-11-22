import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Camera01Icon,
  Folder01Icon,
  PlayIcon,
  Delete02Icon,
  Share01Icon,
  InformationCircleIcon,
  ArrowLeft02Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Tick02Icon,
  RefreshIcon,
  Shield01Icon,
  Image01Icon,
  Image02Icon,
  SparklesIcon,
  Calendar03Icon,
  File02Icon,
  Time01Icon,
  Video01Icon,
  Video02Icon,
  FavouriteIcon,
  Download01Icon,
} from '@hugeicons/core-free-icons';

export {
  Camera01Icon,
  Folder01Icon,
  PlayIcon,
  Delete02Icon,
  Share01Icon,
  InformationCircleIcon,
  ArrowLeft02Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Tick02Icon,
  RefreshIcon,
  Shield01Icon,
  Image01Icon,
  Image02Icon,
  SparklesIcon,
  Calendar03Icon,
  File02Icon,
  Time01Icon,
  Video01Icon,
  Video02Icon,
  FavouriteIcon,
  Download01Icon,
};

export interface AppIconProps {
  icon: any;
  size?: number;
  color?: any;
  strokeWidth?: number;
}

export function AppIcon({
  icon,
  size = 20,
  color = '#FFFFFF',
  strokeWidth = 1.8,
}: AppIconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
}
