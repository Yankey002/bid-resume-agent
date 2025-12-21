import React, { useState, useEffect } from 'react';
import { TemplateList } from '../features/templates/components/TemplateList';
import { TemplateDetail } from '../features/templates/components/TemplateDetail';
import type { Template } from '../types';
import useTemplateStore from '../store/useTemplateStore';
import { MasterDetailLayout } from '../components/layout/MasterDetailLayout';

const TemplateCenter: React.FC = () => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const triggerRefresh = useTemplateStore((s) => s.triggerRefresh);
  const isSidebarOpen = useTemplateStore((s) => s.isSidebarOpen);

  useEffect(() => {
    const onRefresh = () => {
      triggerRefresh();
    };
    window.addEventListener('templates:refresh', onRefresh);
    return () => window.removeEventListener('templates:refresh', onRefresh);
  }, [triggerRefresh]);

  const handleSelectTemplate = (template: Template | null) => {
    setSelectedTemplateId(template ? template.id : null);
  };

  return (
    <MasterDetailLayout
      isSidebarOpen={isSidebarOpen}
      sidebarContent={
        <TemplateList
          onSelectTemplate={handleSelectTemplate}
          selectedTemplateId={selectedTemplateId || undefined}
        />
      }
      mainContent={<TemplateDetail templateId={selectedTemplateId || undefined} />}
    />
  );
};

export default TemplateCenter;
