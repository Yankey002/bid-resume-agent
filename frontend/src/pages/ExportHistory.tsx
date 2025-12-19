import React from 'react';
import { Card, Table } from 'antd';

const ExportHistory: React.FC = () => {
  return (
    <div>
      <Card>
        <Table columns={[{ title: '任务ID', dataIndex: 'id' }, { title: '状态', dataIndex: 'status' }]} dataSource={[]} />
      </Card>
    </div>
  );
};

export default ExportHistory;
