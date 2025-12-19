import React from 'react';
import { Card, Table, Tag, Space } from 'antd';

const ResumeLibrary: React.FC = () => {
  const columns = [
    { title: '候选人', dataIndex: 'name', key: 'name' },
    { title: '导入批次', dataIndex: 'batch', key: 'batch' },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => (
        <Tag color={status === '已优化' ? 'green' : 'blue'}>{status}</Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="middle">
          <a>查看</a>
          <a>删除</a>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2>简历库</h2>
      </div>
      <Card>
        <Table columns={columns} dataSource={[]} />
      </Card>
    </div>
  );
};

export default ResumeLibrary;
