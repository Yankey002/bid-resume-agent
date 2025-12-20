import React, { useRef, useState } from 'react';
import { Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '../../../services/api';

/**
 * 导入简历按钮组件
 * 用于在头部快速触发简历导入流程
 */
export const ImportResumeButton: React.FC = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickFile = () => {
    inputRef.current?.click();
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post('/resumes/upload', fd, { skipErrorHandler: true });
      message.success('导入成功');
      window.dispatchEvent(new CustomEvent('resumes:refresh'));
    } catch {
      message.error('导入失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          uploadFile(file).catch(() => undefined);
        }}
      />
      <Button type="primary" icon={<PlusOutlined />} onClick={pickFile} loading={uploading}>
        导入简历
      </Button>
    </>
  );
};
