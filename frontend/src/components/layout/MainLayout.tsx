import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Tooltip } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import styles from './MainLayout.module.scss';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/templates',
      icon: <FileTextOutlined />,
      label: '模板中心',
    },
    {
      key: '/resumes',
      icon: <AppstoreOutlined />,
      label: '简历库',
    },
    {
      key: '/review',
      icon: <CheckCircleOutlined />,
      label: '审核优化',
    },
    {
      key: '/exports',
      icon: <HistoryOutlined />,
      label: '导出记录',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
  ];

  return (
    <Layout className={styles.layout}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light" className={styles.sider}>
        <div className={styles.logo}>
          {collapsed ? 'RP' : 'Resume Pilot'}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }} className={styles.header}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          <div className={styles.headerRight}>
             {/* 占位：搜索框、通知、用户头像 */}
             <Tooltip title="用户设置">
               <Button icon={<UserOutlined />} shape="circle" />
             </Tooltip>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: 8,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
