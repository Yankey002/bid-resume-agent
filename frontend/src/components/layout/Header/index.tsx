import React from 'react';
import { Layout, Button, theme, Tooltip } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined } from '@ant-design/icons';
import styles from './header.module.scss';

const { Header } = Layout;

interface AppHeaderProps {
  collapsed: boolean;
  onCollapse: () => void;
  title: string;
  action?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ collapsed, onCollapse, title, action }) => {
  const { token: { colorBgContainer } } = theme.useToken();
  return (
    <Header style={{ padding: '0 24px', background: colorBgContainer, borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
      <div className={styles.headerWrapper}>
        <div className={styles.leftSection}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={onCollapse}
            style={{ fontSize: '16px', width: 64, height: 64, marginLeft: -24 }}
          />
          <div className={styles.pageTitle}>{title}</div>
        </div>
        <div className={styles.rightSection}>
          {action}
          <Tooltip title="用户设置">
            <Button icon={<UserOutlined />} shape="circle" style={{ marginLeft: 24 }} />
          </Tooltip>
        </div>
      </div>
    </Header>
  );
};
