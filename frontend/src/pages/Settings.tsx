import React from 'react';
import { Card, Form, Switch, Divider } from 'antd';

const Settings: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2>设置</h2>
      </div>
      <Card title="通用设置">
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
    </div>
  );
};

export default Settings;
