import React, { useEffect, useMemo, useState } from 'react';
import { Layout, Button, Dropdown, Form, Input, Modal, theme, Tooltip, message } from 'antd';
import { LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined } from '@ant-design/icons';
import styles from './header.module.scss';
import api from '../../../services/api';
import useAuthStore from '../../../store/useAuthStore';

const { Header } = Layout;

interface AppHeaderProps {
  collapsed: boolean;
  onCollapse: () => void;
  title: string;
  action?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ collapsed, onCollapse, title, action }) => {
  const { token: { colorBgContainer } } = theme.useToken();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [form] = Form.useForm();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setToken = useAuthStore((s) => s.setToken);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    const onShowLogin = () => setLoginOpen(true);
    window.addEventListener('auth:show_login', onShowLogin);
    return () => window.removeEventListener('auth:show_login', onShowLogin);
  }, []);

  useEffect(() => {
    if (loginOpen) {
      form.setFieldsValue({ email: user?.email || '' });
    }
  }, [form, loginOpen, user?.email]);

  const userMenu = useMemo(() => {
    return {
      items: [
        {
          key: 'logout',
          icon: <LogoutOutlined />,
          label: '退出登录',
          onClick: () => logout(),
        },
      ],
    };
  }, [logout]);

  /** 提交登录表单并刷新当前用户信息 */
  const handleLogin = async () => {
    const values = await form.validateFields();
    setLoginLoading(true);
    try {
      const resp = await api.post('/auth/login', values, { skipErrorHandler: true });
      const accessToken = (resp.data?.access_token as string | undefined) || '';
      if (!accessToken) {
        message.error('登录失败：未获取到 token');
        return;
      }
      setToken(accessToken);
      await refreshMe();
      setLoginOpen(false);
      form.resetFields(['password']);
      message.success('登录成功');
    } finally {
      setLoginLoading(false);
    }
  };

  /** 打开登录弹窗 */
  const openLogin = () => setLoginOpen(true);

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
          {token ? (
            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <Tooltip title={user?.email || '已登录'}>
                <Button icon={<UserOutlined />} shape="circle" style={{ marginLeft: 24 }} />
              </Tooltip>
            </Dropdown>
          ) : (
            <Tooltip title="登录">
              <Button icon={<UserOutlined />} shape="circle" style={{ marginLeft: 24 }} onClick={openLogin} />
            </Tooltip>
          )}
        </div>
      </div>

      <Modal
        open={loginOpen}
        title="登录"
        okText="登录"
        cancelText="取消"
        confirmLoading={loginLoading}
        onCancel={() => setLoginOpen(false)}
        onOk={() => handleLogin().catch(() => undefined)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }]}>
            <Input placeholder="admin@qishirecord.cn" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="请输入密码" autoComplete="current-password" />
          </Form.Item>
        </Form>
      </Modal>
    </Header>
  );
};
