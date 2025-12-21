import React from 'react';
import { Card, Form, Switch, Divider } from 'antd';

export const GeneralSettings: React.FC = () => {
  return (
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
};
