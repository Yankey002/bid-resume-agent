import React from 'react';
import { MasterDetailLayout } from '../components/layout/MasterDetailLayout';
import { SettingsList } from '../features/settings/components/SettingsList';
import { SettingsDetail } from '../features/settings/components/SettingsDetail';
import useSettingsStore from '../store/useSettingsStore';

const Settings: React.FC = () => {
  const isSidebarOpen = useSettingsStore((s) => s.isSidebarOpen);

  return (
    <MasterDetailLayout
      isSidebarOpen={isSidebarOpen}
      sidebarContent={<SettingsList />}
      mainContent={<SettingsDetail />}
    />
  );
};

export default Settings;
