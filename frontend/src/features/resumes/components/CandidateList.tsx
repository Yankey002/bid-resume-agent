import React, { useEffect, useState } from 'react';
import { Skeleton, Empty, Typography, Space, Tag, Checkbox } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { candidateService } from '../../../services/candidateService';
import type { Candidate } from '../../../types';
import styles from './CandidateList.module.scss';
import useResumeStore from '../../../store/useResumeStore';

const { Text } = Typography;

interface CandidateListProps {
  onSelectCandidate: (candidate: Candidate | null) => void;
  selectedCandidateId?: string;
  collapsed?: boolean;
}

export const CandidateList: React.FC<CandidateListProps> = ({
  onSelectCandidate,
  selectedCandidateId,
  collapsed = false,
}) => {
  const [loading, setLoading] = useState(false);

  const searchText = useResumeStore((s) => s.searchText);
  const refreshTrigger = useResumeStore((s) => s.refreshTrigger);
  const candidates = useResumeStore((s) => s.candidates);
  const setCandidates = useResumeStore((s) => s.setCandidates);
  const selectedIds = useResumeStore((s) => s.selectedIds);
  const toggleSelect = useResumeStore((s) => s.toggleSelect);

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

  return (
    <div className={styles.container}>
      {/* 移除 Header，直接渲染列表 */}
      <div className={styles.listContainer} style={{ paddingTop: 72 }}>
        {loading ? (
          <div style={{ padding: 16 }}>
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        ) : candidates.length > 0 ? (
          <div>
            {candidates.map((item) => (
                <div
                    key={item.id}
                    className={`${styles.listItem} ${selectedCandidateId === item.id ? styles.selected : ''}`}
                    onClick={(e) => {
                        // Prevent click when clicking checkbox or delete button
                        if ((e.target as HTMLElement).closest('.ant-checkbox-wrapper') || (e.target as HTMLElement).closest('.delete-btn')) {
                            return;
                        }
                        onSelectCandidate(item);
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
                           <UserOutlined />
                       </div>
                       {!collapsed && (
                           <div style={{ flex: 1, minWidth: 0 }}>
                               <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                                    <Text strong ellipsis style={{ maxWidth: '120px', marginRight: 8 }}>{item.name}</Text>
                                    <Tag className={styles.idTag} style={{ margin: 0 }}>{item.unique_id}</Tag>
                               </div>
                               <Space orientation="vertical" size={0} style={{ display: 'flex' }}>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        ID: {item.unique_id}
                                    </Text>
                                    {item.resumes_count !== undefined && item.resumes_count > 0 && (
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {item.resumes_count} 份简历
                                        </Text>
                                    )}
                               </Space>
                           </div>
                       )}
                   </div>
                </div>
            ))}
          </div>
        ) : (
          <Empty description={collapsed ? "" : "暂无候选人"} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 48 }} />
        )}
      </div>
    </div>
  );
};
