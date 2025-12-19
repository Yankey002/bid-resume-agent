import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
  FileTextOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AppHeader } from './Header';
import { ImportResumeButton } from './Header/ImportResumeButton';
import { ImportTemplateButton } from './Header/ImportTemplateButton';
import styles from './MainLayout.module.scss';

const { Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/resumes',
      icon: <AppstoreOutlined />,
      label: '简历库',
    },
    {
      key: '/templates',
      icon: <FileTextOutlined />,
      label: '模板中心',
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

  // 获取当前页面标题
  const getCurrentPageTitle = () => {
    const currentItem = menuItems.find(item => item.key === location.pathname);
    return currentItem ? currentItem.label : 'Resume Pilot';
  };

  // 获取当前页面操作按钮
  const getCurrentPageAction = () => {
    switch (location.pathname) {
      case '/resumes':
        return <ImportResumeButton />;
      case '/templates':
        return <ImportTemplateButton />;
      default:
        return null;
    }
  };

  return (
    <Layout className={styles.layout}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark" className={styles.sider} width={240}>
        <div className={styles.logo}>
          <div className={styles.logoIconWrapper} style={{ marginRight: collapsed ? 0 : 16 }}>
            <img src="/vite.svg" alt="Logo" style={{ height: 32 }} />
          </div>
          {!collapsed && 'Resume Pilot'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <AppHeader
          collapsed={collapsed}
          onCollapse={() => setCollapsed(!collapsed)}
          title={getCurrentPageTitle()}
          action={getCurrentPageAction()}
        />
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: 'transparent', // Make transparent to show global gradient
            borderRadius: 8,
            overflow: 'visible', // Allow shadows to overflow
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
