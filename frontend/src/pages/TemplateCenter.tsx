import React from 'react';
import { Card, Button, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const TemplateCenter: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>模板中心</h2>
        <Button type="primary" icon={<PlusOutlined />}>导入模板</Button>
      </div>
      <Card>
        <Empty description="暂无模板，请先导入" />
      </Card>
    </div>
  );
};

export default TemplateCenter;
