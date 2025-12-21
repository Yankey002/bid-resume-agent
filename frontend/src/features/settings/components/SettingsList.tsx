import React from 'react';
import { SettingOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import useSettingsStore from '../../../store/useSettingsStore';
import useAuthStore from '../../../store/useAuthStore';
import styles from './SettingsList.module.scss';

const { Text } = Typography;

interface SettingsListProps {
  collapsed?: boolean;
}

export const SettingsList: React.FC<SettingsListProps> = ({ collapsed = false }) => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const selectedKey = useSettingsStore((s) => s.selectedKey);
  const setSelectedKey = useSettingsStore((s) => s.setSelectedKey);

  const items = [
    { key: 'general', label: '通用设置', icon: <SettingOutlined /> },
    ...(isAdmin ? [
      { key: 'users', label: '用户管理', icon: <UserOutlined /> },
      { key: 'llm', label: '大模型控制中心', icon: <RobotOutlined /> }
    ] : [])
  ];

  return (
    <div className={styles.container}>
       <div className={styles.listContainer} style={{ paddingTop: 72 }}>
        <div>
          {items.map((item) => (
            <div
              key={item.key}
              className={`${styles.listItem} ${selectedKey === item.key ? styles.selected : ''}`}
              onClick={() => setSelectedKey(item.key)}
              title={collapsed ? item.label : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', height: 40 }}>
                <div className={styles.avatar} style={{ flexShrink: 0, marginRight: collapsed ? 0 : 12, fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </div>
                {!collapsed && (
                  <Text strong>{item.label}</Text>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
