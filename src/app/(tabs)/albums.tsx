import React, { useEffect } from 'react';
import { useMainTabStore } from '../../features/navigation/tabStore';
import CameraTab from './index';

export default function AlbumsTabScreen() {
  const setActiveTab = useMainTabStore((s) => s.setActiveTab);

  useEffect(() => {
    setActiveTab(1);
  }, [setActiveTab]);

  return <CameraTab />;
}
