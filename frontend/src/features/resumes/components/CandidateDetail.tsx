import React, { useEffect, useState } from 'react';
import { Typography, Card, Descriptions, Empty, Spin, List, Button, Space } from 'antd';
import { FileTextOutlined, DownloadOutlined } from '@ant-design/icons';
import { candidateService } from '../../../services/candidateService';
import { resumeService } from '../../../services/resumeService';
import type { Candidate, RawResume } from '../../../types';
import styles from './CandidateDetail.module.scss';

const { Text } = Typography;

interface CandidateDetailProps {
  candidateId: string | null;
}

export const CandidateDetail: React.FC<CandidateDetailProps> = ({ candidateId }) => {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [resumes, setResumes] = useState<RawResume[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!candidateId) {
      setCandidate(null);
      setResumes([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [candidateData, resumeData] = await Promise.all([
          candidateService.getById(candidateId),
          resumeService.list(candidateId)
        ]);
        setCandidate(candidateData);
        setResumes(resumeData);
      } catch (error) {
        console.error('Failed to fetch candidate details', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [candidateId]);

  if (!candidateId) {
    return (
      <div className={styles.emptyContainer}>
        <Empty description="请从左侧选择候选人查看详情" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className={styles.emptyContainer}>
        <Empty description="未找到候选人信息" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* 1. 基本信息 */}
        <Card className={styles.infoCard} title="基本信息" bordered={false} size="small">
          <Descriptions column={2} size="small">
            <Descriptions.Item label="姓名">{candidate.name}</Descriptions.Item>
            <Descriptions.Item label="系统编号">{candidate.unique_id}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(candidate.created_at).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{new Date(candidate.updated_at).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 2. 履历信息 (Placeholder) */}
        <Card className={styles.infoCard} title="履历信息" bordered={false} size="small">
            <Empty description="暂无履历解析数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>

        {/* 3. 图片信息 (Placeholder) */}
        <Card className={styles.infoCard} title="图片信息" bordered={false} size="small">
             <Empty description="暂无图片" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>

        {/* 4. 相关文件 */}
        <Card className={styles.infoCard} title={`相关文件 (${resumes.length})`} bordered={false} size="small">
            <List
                itemLayout="horizontal"
                dataSource={resumes}
                size="small"
                renderItem={item => (
                <List.Item
                    actions={[
                        <Button
                            type="link"
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() => window.open(`${(import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')}/${item.storage_path}`, '_blank')}
                        >
                            下载
                        </Button>
                    ]}
                >
                    <List.Item.Meta
                    avatar={<FileTextOutlined style={{ fontSize: '20px', color: '#1890ff' }} />}
                    title={<a href="#">{item.original_filename}</a>}
                    description={
                        <Space size="small">
                            <Text type="secondary" style={{ fontSize: '12px' }}>{new Date(item.uploaded_at).toLocaleString()}</Text>
                            <Text type="secondary" style={{ fontSize: '12px' }}>{(item.size_bytes / 1024).toFixed(1)} KB</Text>
                        </Space>
                    }
                    />
                </List.Item>
                )}
            />
        </Card>
      </div>
    </div>
  );
};
