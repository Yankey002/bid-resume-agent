import React, { useState } from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ImportResumeModal } from '../../../features/resumes/ImportResumeModal';

/**
 * 导入简历按钮组件
 * 用于在头部快速触发简历导入流程
 */
export const ImportResumeButton: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleSuccess = () => {
    window.dispatchEvent(new CustomEvent('resumes:refresh'));
    // 可选：上传成功后是否自动关闭？通常保留给用户看结果，手动关闭
    // 这里我们保持打开状态让用户看结果，或者用户自己点关闭
  };

  return (
    <>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
        导入简历
      </Button>
      <ImportResumeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
};
