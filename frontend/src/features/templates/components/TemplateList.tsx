import React, { useEffect, useState } from 'react';
import { Skeleton, Empty, Typography, Space, Checkbox, Button, Modal, Input, message } from 'antd';
import { FileTextOutlined, EditOutlined } from '@ant-design/icons';
import { templateService } from '../../../services/templateService';
import type { Template } from '../../../types';
import styles from './TemplateList.module.scss';
import useTemplateStore from '../../../store/useTemplateStore';

const { Text } = Typography;

interface TemplateListProps {
  onSelectTemplate?: (template: Template | null) => void;
  selectedTemplateId?: string;
  collapsed?: boolean;
}

export const TemplateList: React.FC<TemplateListProps> = ({
  onSelectTemplate,
  selectedTemplateId,
  collapsed = false,
}) => {
  const [loading, setLoading] = useState(false);

  const searchText = useTemplateStore((s) => s.searchText);
  const refreshTrigger = useTemplateStore((s) => s.refreshTrigger);
  const templates = useTemplateStore((s) => s.templates);
  const setTemplates = useTemplateStore((s) => s.setTemplates);
  const selectedIds = useTemplateStore((s) => s.selectedIds);
  const toggleSelect = useTemplateStore((s) => s.toggleSelect);
  const triggerRefresh = useTemplateStore((s) => s.triggerRefresh);

  // Edit State
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [newName, setNewName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await templateService.list();
      // Simple client-side filtering since backend list doesn't support search yet
      const filtered = data.filter(t =>
          !searchText || t.name.toLowerCase().includes(searchText.toLowerCase())
      );
      setTemplates(filtered);
    } catch (error) {
      console.error('Failed to fetch templates', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [searchText, refreshTrigger]);

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setNewName(template.name);
    setIsModalOpen(true);
  };

  const handleRename = async () => {
      if (!editingTemplate || !newName.trim()) return;
      setUpdating(true);
      try {
          await templateService.update(editingTemplate.id, { name: newName });
          message.success('重命名成功');
          setIsModalOpen(false);
          triggerRefresh();
      } catch {
          message.error('重命名失败');
      } finally {
          setUpdating(false);
      }
  };

  const formatSize = (bytes?: number) => {
      if (!bytes) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={styles.container}>
      <div className={styles.listContainer} style={{ paddingTop: 72 }}>
        {loading ? (
          <div style={{ padding: 16 }}>
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        ) : templates.length > 0 ? (
          <div>
            {templates.map((item) => (
                <div
                    key={item.id}
                    className={`${styles.listItem} ${selectedTemplateId === item.id ? styles.selected : ''}`}
                    onClick={(e) => {
                        if ((e.target as HTMLElement).closest('.ant-checkbox-wrapper') ||
                            (e.target as HTMLElement).closest('.ant-btn')) {
                            return;
                        }
                        onSelectTemplate?.(item);
                    }}
                    title={collapsed ? item.name : undefined}
                >
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start' }}>
                       {!collapsed && (
                           <Checkbox
                              checked={selectedIds.includes(item.id)}
                              onChange={() => toggleSelect(item.id)}
                              style={{ marginRight: '12px' }}
                              onClick={(e) => e.stopPropagation()}
                           />
                       )}
                       <div className={styles.avatar} style={{ flexShrink: 0, marginRight: collapsed ? 0 : 12 }}>
                           <FileTextOutlined />
                       </div>
                       {!collapsed && (
                           <div style={{ flex: 1, minWidth: 0 }}>
                               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text strong ellipsis style={{ maxWidth: '140px' }}>{item.name}</Text>
                                    <Button
                                        type="text"
                                        icon={<EditOutlined />}
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEdit(item);
                                        }}
                                    />
                               </div>
                               <Space orientation="vertical" size={0} style={{ display: 'flex' }}>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        大小: {formatSize(item.size_bytes)}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        上传时间: {new Date(item.uploaded_at).toLocaleDateString()}
                                    </Text>
                               </Space>
                           </div>
                       )}
                   </div>
                </div>
            ))}
          </div>
        ) : (
          <Empty description={collapsed ? "" : "暂无模板"} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 48 }} />
        )}
      </div>

      <Modal
        title="重命名模板"
        open={isModalOpen}
        onOk={handleRename}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={updating}
      >
        <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="请输入新名称"
            maxLength={128}
        />
      </Modal>
    </div>
  );
};
