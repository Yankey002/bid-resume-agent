import React from 'react';
import { Input, Space, Checkbox, Button, Modal, message, Tooltip } from 'antd';
import { SearchOutlined, DeleteOutlined, ExclamationCircleOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { ImportTemplateButton } from '../../../features/templates/components/ImportTemplateButton';
import useTemplateStore from '../../../store/useTemplateStore';
import { templateService } from '../../../services/templateService';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';

const { confirm } = Modal;

export const TemplateHeaderAction: React.FC = () => {
  const searchText = useTemplateStore((s) => s.searchText);
  const setSearchText = useTemplateStore((s) => s.setSearchText);

  const templates = useTemplateStore((s) => s.templates);
  const selectedIds = useTemplateStore((s) => s.selectedIds);
  const selectAll = useTemplateStore((s) => s.selectAll);
  const clearSelection = useTemplateStore((s) => s.clearSelection);
  const triggerRefresh = useTemplateStore((s) => s.triggerRefresh);

  const isSidebarOpen = useTemplateStore((s) => s.isSidebarOpen);
  const toggleSidebar = useTemplateStore((s) => s.toggleSidebar);

  const handleSelectAll = (e: CheckboxChangeEvent) => {
    if (e.target.checked) {
      selectAll();
    } else {
      clearSelection();
    }
  };

  const handleDelete = () => {
    confirm({
      title: `确认删除 ${selectedIds.length} 个模板?`,
      icon: <ExclamationCircleOutlined />,
      content: '删除后无法恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await templateService.delete(selectedIds);
          message.success('删除成功');
          clearSelection();
          triggerRefresh();
        } catch (error) {
          console.error(error);
          message.error('删除失败');
        }
      },
    });
  };

  return (
    <Space size={16} align="center">
      {/* Sidebar Toggle */}
      <Tooltip title={isSidebarOpen ? "收起列表" : "固定列表"}>
        <Button
          type="text"
          icon={isSidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
          onClick={toggleSidebar}
        />
      </Tooltip>

      <div style={{ width: 1, height: 16, backgroundColor: 'rgba(0,0,0,0.06)' }} />

      {/* Batch Actions */}
      <Space>
        <Checkbox
          checked={templates.length > 0 && selectedIds.length === templates.length}
          indeterminate={selectedIds.length > 0 && selectedIds.length < templates.length}
          onChange={handleSelectAll}
          disabled={templates.length === 0}
        >
          全选 {templates.length > 0 && `(${templates.length})`}
        </Checkbox>

        {selectedIds.length > 0 && (
          <Button
            danger
            type="primary"
            icon={<DeleteOutlined />}
            size="small"
            onClick={handleDelete}
          >
            删除({selectedIds.length})
          </Button>
        )}
      </Space>

      <div style={{ width: 1, height: 16, backgroundColor: 'rgba(0,0,0,0.06)' }} />

      {/* Search and Import */}
      <Space size={16}>
        <Input
          placeholder="搜索模板..."
          prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ width: 240, borderRadius: 4, border: 'none', background: '#f5f5f5' }}
          variant="filled"
        />
        <ImportTemplateButton />
      </Space>
    </Space>
  );
};
