import React, { useState } from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ImportTemplateModal } from './ImportTemplateModal';
import useTemplateStore from '../../../store/useTemplateStore';

export const ImportTemplateButton: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const triggerRefresh = useTemplateStore((s) => s.triggerRefresh);

  return (
    <>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => setModalOpen(true)}
        style={{ color: '#fff' }} // Ensure text is white as requested
      >
        导入模板
      </Button>
      <ImportTemplateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          triggerRefresh();
        }}
      />
    </>
  );
};
