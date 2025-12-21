import React, { useState, useRef, useEffect } from 'react';
import { Layout, Menu } from 'antd';
import { Button, Result } from 'antd';
import {
  FileTextOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AppHeader } from './Header';
import { ResumeHeaderAction } from './Header/ResumeHeaderAction';
import { TemplateHeaderAction } from './Header/TemplateHeaderAction';
import { SettingsHeaderAction } from './Header/SettingsHeaderAction';
import styles from './MainLayout.module.scss';
import useAuthStore from '../../store/useAuthStore';

const { Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const [manualCollapsed, setManualCollapsed] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 侧边栏的实际收缩状态：
  // 1. 如果用户手动展开了 (manualCollapsed = false)，则始终保持展开
  // 2. 如果用户手动收缩了 (manualCollapsed = true)，则根据鼠标悬停状态决定：悬停时展开，离开时收缩
  const collapsed = manualCollapsed && !isHovering;

  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => {
      setIsHovering(false);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const token = useAuthStore((s) => s.token);

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

  const isFullPage = location.pathname === '/resumes' || location.pathname === '/templates' || location.pathname === '/settings';

  // 获取当前页面标题
  const getCurrentPageTitle = () => {
    const currentItem = menuItems.find(item => item.key === location.pathname);
    return currentItem ? currentItem.label : 'Resume Pilot';
  };

  // 获取当前页面操作按钮
  const getCurrentPageAction = () => {
    switch (location.pathname) {
      case '/resumes':
        return <ResumeHeaderAction />;
      case '/templates':
        return <TemplateHeaderAction />;
      case '/settings':
        return <SettingsHeaderAction />;
      default:
        return null;
    }
  };

  return (
    <Layout className={styles.layout}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        className={styles.sider}
        width={240}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
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
      <Layout style={{ height: '100vh', overflow: 'hidden', position: 'relative' }}>
        <AppHeader
          collapsed={manualCollapsed}
          onCollapse={() => setManualCollapsed(!manualCollapsed)}
          title={getCurrentPageTitle()}
          action={getCurrentPageAction()}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }}
        />
        <Content
          style={{
            height: '100vh',
            overflowY: isFullPage ? 'hidden' : 'auto',
            paddingTop: isFullPage ? 0 : 64, // Push content down for normal pages
          }}
        >
          {isFullPage ? (
            <Outlet />
          ) : (
            <div style={{ padding: 24, margin: '24px 16px', background: 'transparent', minHeight: 280, borderRadius: 8 }}>
              {token ? (
                <Outlet />
              ) : (
                <Result
                  status="403"
                  title="未登录"
                  subTitle="请先登录后再访问后端数据"
                  extra={
                    <Button
                      type="primary"
                      onClick={() => window.dispatchEvent(new CustomEvent('auth:show_login'))}
                    >
                      去登录
                    </Button>
                  }
                />
              )}
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
