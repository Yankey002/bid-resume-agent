import React from 'react';
import useSettingsStore from '../../../store/useSettingsStore';
import { GeneralSettings } from './GeneralSettings';
import { UserManagement } from './UserManagement';
import LLMControlCenter from '../LLMControlCenter';

export const SettingsDetail: React.FC = () => {
  const selectedKey = useSettingsStore((s) => s.selectedKey);

  const renderContent = () => {
    switch (selectedKey) {
      case 'users':
        return <UserManagement />;
      case 'llm':
        return <LLMControlCenter />;
      case 'general':
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingTop: 88, paddingLeft: 24, paddingRight: 24, paddingBottom: 24 }}>
      {renderContent()}
    </div>
  );
};
