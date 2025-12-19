import React from 'react';
import { Card, Button, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const TemplateCenter: React.FC = () => {
  return (
    <div>
      <Card>
        <Empty description="暂无模板，请先导入" />
      </Card>
    </div>
  );
};

export default TemplateCenter;
