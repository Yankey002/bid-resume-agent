import React from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

/**
 * 导入简历按钮组件
 * 用于在头部快速触发简历导入流程
 */
export const ImportResumeButton: React.FC = () => {
  return (
    <Button type="primary" icon={<PlusOutlined />}>
      导入简历
    </Button>
  );
};
