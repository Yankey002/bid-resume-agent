import React, { useEffect, useState } from 'react';
import { Typography, Card, Descriptions, Empty, Spin, List, Tag, Collapse, Button, Space } from 'antd';
import { FileTextOutlined, DownloadOutlined } from '@ant-design/icons';
import { candidateService } from '../../../services/candidateService';
import { resumeService } from '../../../services/resumeService';
import type { Candidate, RawResume } from '../../../types';
import styles from './CandidateDetail.module.scss';

const { Title, Text } = Typography;
const { Panel } = Collapse;

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
      <div className={styles.header}>
        <div className={styles.headerInfo}>
            <Title level={3} style={{ margin: 0 }}>
            {candidate.name}
            </Title>
            <Tag color="blue" className={styles.idTag}>ID: {candidate.unique_id}</Tag>
        </div>
        <div className={styles.headerActions}>
            {/* Future actions like Edit Profile */}
        </div>
      </div>

      <div className={styles.content}>
        <Card className={styles.infoCard} title="基本信息" bordered={false}>
          <Descriptions column={2}>
            <Descriptions.Item label="系统编号">{candidate.unique_id}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(candidate.created_at).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="简历数量">{resumes.length}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{new Date(candidate.updated_at).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        </Card>

        <div className={styles.filesSection}>
            <Title level={5}>文件归档</Title>
            <Collapse defaultActiveKey={['1']} ghost>
                <Panel header={`关联简历 (${resumes.length})`} key="1">
                     <List
                        itemLayout="horizontal"
                        dataSource={resumes}
                        renderItem={item => (
                        <List.Item
                            actions={[
                                <Button
                                    type="text"
                                    icon={<DownloadOutlined />}
                                    onClick={() => window.open(`${(import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')}/${item.storage_path}`, '_blank')}
                                >
                                    下载
                                </Button>
                            ]}
                        >
                            <List.Item.Meta
                            avatar={<FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
                            title={<a href="#">{item.original_filename}</a>}
                            description={
                                <Space>
                                    <Text type="secondary">{new Date(item.uploaded_at).toLocaleString()}</Text>
                                    <Text type="secondary">{(item.size_bytes / 1024).toFixed(1)} KB</Text>
                                </Space>
                            }
                            />
                        </List.Item>
                        )}
                    />
                </Panel>
            </Collapse>
        </div>
      </div>
    </div>
  );
};
