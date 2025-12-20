import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Table, Tag, Space, Button, message } from 'antd';
import type { TableProps } from 'antd';
import api from '../services/api';

type RawResumeRow = {
  id: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  sha256: string;
  storage_path: string;
  uploaded_by_user_id: string;
  uploaded_at?: string | null;
};

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const v = bytes / 1024 ** idx;
  return `${v.toFixed(v >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
};

const ResumeLibrary: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RawResumeRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.get('/resumes', { skipErrorHandler: true });
      setRows(Array.isArray(resp.data) ? resp.data : []);
    } catch {
      message.error('获取简历列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
    const onRefresh = () => load().catch(() => undefined);
    window.addEventListener('resumes:refresh', onRefresh);
    return () => window.removeEventListener('resumes:refresh', onRefresh);
  }, [load]);

  const columns = useMemo<TableProps<RawResumeRow>['columns']>(() => {
    return [
      { title: '文件名', dataIndex: 'original_filename', key: 'original_filename' },
      {
        title: '类型',
        dataIndex: 'content_type',
        key: 'content_type',
        render: (v: string) => <Tag>{v || '-'}</Tag>,
      },
      {
        title: '大小',
        dataIndex: 'size_bytes',
        key: 'size_bytes',
        render: (v: number) => formatBytes(v),
      },
      {
        title: '上传时间',
        dataIndex: 'uploaded_at',
        key: 'uploaded_at',
        render: (v?: string | null) => (v ? new Date(v).toLocaleString() : '-'),
      },
      {
        title: 'SHA256',
        dataIndex: 'sha256',
        key: 'sha256',
        render: (v: string) => (v ? `${v.slice(0, 8)}…${v.slice(-8)}` : '-'),
      },
      {
        title: '操作',
        key: 'action',
        render: () => (
          <Space size="middle">
            <Button type="link" disabled>
              查看
            </Button>
          </Space>
        ),
      },
    ];
  }, []);

  return (
    <div>
      <Card>
        <Table rowKey="id" columns={columns} dataSource={rows} loading={loading} />
      </Card>
    </div>
  );
};

export default ResumeLibrary;
