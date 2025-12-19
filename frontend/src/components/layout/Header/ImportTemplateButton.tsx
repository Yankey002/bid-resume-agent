import React from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

/**
 * 导入模板按钮组件
 * 用于在头部快速触发模板导入流程
 */
export const ImportTemplateButton: React.FC = () => {
  return (
    <Button type="primary" icon={<PlusOutlined />}>
      导入模板
    </Button>
  );
};
