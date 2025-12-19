import React from 'react';
import { Card, Steps, Button, Result } from 'antd';

const ReviewOptimize: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2>审核优化</h2>
      </div>
      <Card>
        <Steps
          current={0}
          items={[
            { title: '选择简历' },
            { title: '运行检查' },
            { title: '优化确认' },
            { title: '完成' },
          ]}
        />
        <div style={{ marginTop: 40, textAlign: 'center' }}>
            <Result
                status="info"
                title="请先从简历库选择简历"
                extra={<Button type="primary">去选择</Button>}
            />
        </div>
      </Card>
    </div>
  );
};

export default ReviewOptimize;
