import React, { useEffect, useState } from 'react';
import { List, Input, Skeleton, Empty, Typography, Space, Tag, Checkbox, Button, Modal, message, Tooltip } from 'antd';
import { UserOutlined, SearchOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { candidateService } from '../../../services/candidateService';
import type { Candidate } from '../../../types';
import styles from './CandidateList.module.scss';

import type { CheckboxChangeEvent } from 'antd/es/checkbox';

const { Text } = Typography;
const { confirm } = Modal;

interface CandidateListProps {
  onSelectCandidate: (candidate: Candidate | null) => void;
  selectedCandidateId?: string;
  refreshTrigger?: number; // Prop to trigger refresh
}

export const CandidateList: React.FC<CandidateListProps> = ({
  onSelectCandidate,
  selectedCandidateId,
  refreshTrigger
}) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchCandidates = async (name: string = '') => {
    setLoading(true);
    try {
      const data = await candidateService.search({ name });
      setCandidates(data);
    } catch (error) {
      console.error('Failed to fetch candidates', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates(searchText);
  }, [searchText, refreshTrigger]);

  const handleDelete = (ids: string[]) => {
      confirm({
          title: `确认删除 ${ids.length} 位候选人?`,
          icon: <ExclamationCircleOutlined />,
          content: '删除后将一并删除该候选人关联的所有简历文件，且不可恢复。',
          okText: '删除',
          okType: 'danger',
          cancelText: '取消',
          onOk: async () => {
              try {
                  await candidateService.delete(ids);
                  message.success('删除成功');
                  setSelectedIds([]);

                  // If selected candidate is deleted, clear selection
                  if (selectedCandidateId && ids.includes(selectedCandidateId)) {
                      onSelectCandidate(null);
                  }

                  fetchCandidates(searchText);
              } catch (error) {
                  console.error(error);
                  message.error('删除失败');
              }
          },
      });
  };

  const toggleSelect = (id: string) => {
      setSelectedIds(prev => {
          if (prev.includes(id)) {
              return prev.filter(i => i !== id);
          } else {
              return [...prev, id];
          }
      });
  };

  const handleSelectAll = (e: CheckboxChangeEvent) => {
      if (e.target.checked) {
          setSelectedIds(candidates.map(c => c.id));
      } else {
          setSelectedIds([]);
      }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
             <Input
                placeholder="搜索姓名..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                className={styles.searchInput}
                style={{ flex: 1 }}
            />
            {selectedIds.length > 0 && (
                <Button
                    danger
                    type="primary"
                    icon={<DeleteOutlined />}
                    size="small"
                    onClick={() => handleDelete(selectedIds)}
                >
                    删除({selectedIds.length})
                </Button>
            )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
            <Checkbox
                checked={candidates.length > 0 && selectedIds.length === candidates.length}
                indeterminate={selectedIds.length > 0 && selectedIds.length < candidates.length}
                onChange={handleSelectAll}
                disabled={candidates.length === 0}
            >
                全选
            </Checkbox>
            <Text type="secondary" style={{ fontSize: '12px' }}>共 {candidates.length} 人</Text>
        </div>
      </div>

      <div className={styles.listContainer}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : candidates.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={candidates}
            renderItem={(item) => (
              <List.Item
                className={`${styles.listItem} ${selectedCandidateId === item.id ? styles.selected : ''}`}
                onClick={(e) => {
                    // Prevent click when clicking checkbox or delete button
                    if ((e.target as HTMLElement).closest('.ant-checkbox-wrapper') || (e.target as HTMLElement).closest('.delete-btn')) {
                        return;
                    }
                    onSelectCandidate(item);
                }}
                actions={[
                     <Tooltip title="删除">
                        <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            className="delete-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete([item.id]);
                            }}
                        />
                     </Tooltip>
                ]}
              >
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                     <Checkbox
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        style={{ marginRight: '12px' }}
                        onClick={(e) => e.stopPropagation()}
                     />
                     <List.Item.Meta
                        avatar={<div className={styles.avatar}><UserOutlined /></div>}
                        title={
                            <Space>
                            <Text strong>{item.name}</Text>
                            <Tag color="blue">{item.unique_id}</Tag>
                            </Space>
                        }
                        description={
                            <Space direction="vertical" size={0}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                ID: {item.unique_id}
                            </Text>
                            {item.resumes_count !== undefined && item.resumes_count > 0 && (
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                {item.resumes_count} 份简历
                                </Text>
                            )}
                            </Space>
                        }
                    />
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无候选人" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </div>
    </div>
  );
};
