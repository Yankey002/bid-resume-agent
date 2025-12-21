import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Form, Switch, Divider, Table, Button, Modal, Input, Select, Space, Tag, message, Tabs } from 'antd';
import type { TableProps } from 'antd';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';
import LLMControlCenter from '../features/settings/LLMControlCenter';

type UserRow = { id: string; email: string; role: string; is_active: boolean; created_at?: string | null };

const Settings: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const [usersLoading, setUsersLoading] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm();

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setUsersLoading(true);
    try {
      const resp = await api.get('/admin/users', { skipErrorHandler: true });
      setUsers(Array.isArray(resp.data) ? resp.data : []);
    } catch {
      // message.error('获取用户列表失败');
    } finally {
      setUsersLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadUsers().catch(() => undefined);
  }, [loadUsers]);

  const columns = useMemo<TableProps<UserRow>['columns']>(() => {
    return [
      { title: '邮箱', dataIndex: 'email', key: 'email' },
      {
        title: '角色',
        dataIndex: 'role',
        key: 'role',
        render: (role: string) => <Tag color={role === 'admin' ? 'purple' : 'blue'}>{role}</Tag>,
      },
      {
        title: '状态',
        dataIndex: 'is_active',
        key: 'is_active',
        render: (active: boolean) => (active ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>),
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        key: 'created_at',
        render: (v?: string | null) => (v ? new Date(v).toLocaleString() : '-'),
      },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, row: UserRow) => {
          const nextActive = !row.is_active;
          const disableSelf = row.email === user?.email && !nextActive;
          return (
            <Space>
              <Button
                size="small"
                disabled={disableSelf}
                onClick={() => {
                  api
                    .patch(`/admin/users/${row.id}/status`, {}, { params: { is_active: nextActive }, skipErrorHandler: true })
                    .then(() => loadUsers())
                    .catch(() => message.error('更新用户状态失败'));
                }}
              >
                {nextActive ? '启用' : '禁用'}
              </Button>
            </Space>
          );
        },
      },
    ];
  }, [loadUsers, user?.email]);

  const generalSettings = (
    <Card title="通用设置" bordered={false}>
      <Form layout="vertical">
        <Form.Item label="自动提取模式">
           <Switch checkedChildren="开启" unCheckedChildren="关闭" defaultChecked />
        </Form.Item>
        <Divider />
        <Form.Item label="深色模式">
           <Switch checkedChildren="开启" unCheckedChildren="关闭" />
        </Form.Item>
      </Form>
    </Card>
  );

  const userManagement = (
    <Card title="用户管理" bordered={false}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              新建用户
            </Button>
          </div>
          <Table rowKey="id" loading={usersLoading} columns={columns} dataSource={users} pagination={{ pageSize: 10 }} />
        </Card>
  );

  const items = [
    { label: '通用设置', key: 'general', children: generalSettings },
    ...(isAdmin ? [
      { label: '用户管理', key: 'users', children: userManagement },
      { label: '大模型控制中心', key: 'llm', children: <LLMControlCenter /> }
    ] : [])
  ];

  return (
    <div style={{ padding: 24 }}>
      <Tabs defaultActiveKey="general" items={items} />

      <Modal
        open={createOpen}
        title="新建用户"
        okText="创建"
        cancelText="取消"
        confirmLoading={createLoading}
        onCancel={() => setCreateOpen(false)}
        onOk={() => {
          createForm
            .validateFields()
            .then(async (values) => {
              setCreateLoading(true);
              try {
                await api.post('/admin/users', values, { skipErrorHandler: true });
                message.success('创建成功');
                setCreateOpen(false);
                createForm.resetFields();
                await loadUsers();
              } catch {
                message.error('创建失败');
              } finally {
                setCreateLoading(false);
              }
            })
            .catch(() => undefined);
        }}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" preserve={false} initialValues={{ role: 'user', is_active: true }}>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }]}>
            <Input placeholder="user@example.com" autoComplete="off" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少 6 位' }]}>
            <Input.Password placeholder="至少 6 位" autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select
              options={[
                { value: 'user', label: 'user' },
                { value: 'admin', label: 'admin' },
              ]}
            />
          </Form.Item>
          <Form.Item name="is_active" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Settings;
