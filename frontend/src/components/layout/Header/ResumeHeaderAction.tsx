import React from 'react';
import { Input, Space, Checkbox, Button, Modal, message, Tooltip } from 'antd';
import { SearchOutlined, DeleteOutlined, ExclamationCircleOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { ImportResumeButton } from './ImportResumeButton';
import useResumeStore from '../../../store/useResumeStore';
import { candidateService } from '../../../services/candidateService';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';

const { confirm } = Modal;

export const ResumeHeaderAction: React.FC = () => {
  const searchText = useResumeStore((s) => s.searchText);
  const setSearchText = useResumeStore((s) => s.setSearchText);

  const candidates = useResumeStore((s) => s.candidates);
  const selectedIds = useResumeStore((s) => s.selectedIds);
  const selectAll = useResumeStore((s) => s.selectAll);
  const clearSelection = useResumeStore((s) => s.clearSelection);
  const triggerRefresh = useResumeStore((s) => s.triggerRefresh);

  const isSidebarOpen = useResumeStore((s) => s.isSidebarOpen);
  const toggleSidebar = useResumeStore((s) => s.toggleSidebar);

  const handleSelectAll = (e: CheckboxChangeEvent) => {
    if (e.target.checked) {
      selectAll();
    } else {
      clearSelection();
    }
  };

  const handleDelete = () => {
    confirm({
      title: `确认删除 ${selectedIds.length} 位候选人?`,
      icon: <ExclamationCircleOutlined />,
      content: '删除后将一并删除该候选人关联的所有简历文件，且不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await candidateService.delete(selectedIds);
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

      {/* 批量操作区 */}
      <Space>
        <Checkbox
          checked={candidates.length > 0 && selectedIds.length === candidates.length}
          indeterminate={selectedIds.length > 0 && selectedIds.length < candidates.length}
          onChange={handleSelectAll}
          disabled={candidates.length === 0}
        >
          全选 {candidates.length > 0 && `(${candidates.length})`}
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

      {/* 搜索与导入区 */}
      <Space size={16}>
        <Input
          placeholder="搜索姓名..."
          prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ width: 240, borderRadius: 4, border: 'none', background: '#f5f5f5' }}
          variant="filled"
        />
        <ImportResumeButton />
      </Space>
    </Space>
  );
};
