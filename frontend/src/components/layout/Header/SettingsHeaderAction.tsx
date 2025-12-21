import React from 'react';
import { Button, Tooltip, Space } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import useSettingsStore from '../../../store/useSettingsStore';

export const SettingsHeaderAction: React.FC = () => {
  const isSidebarOpen = useSettingsStore((s) => s.isSidebarOpen);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);

  return (
    <Space size={16} align="center">
      <Tooltip title={isSidebarOpen ? "收起列表" : "固定列表"}>
        <Button
          type="text"
          icon={isSidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
          onClick={toggleSidebar}
        />
      </Tooltip>
    </Space>
  );
};
