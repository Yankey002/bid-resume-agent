import React from 'react';
import { Card, Empty } from 'antd';

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
