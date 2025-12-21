import React, { useState, useEffect } from 'react';
import { Layout } from 'antd';
import { CandidateList } from '../features/resumes/components/CandidateList';
import { CandidateDetail } from '../features/resumes/components/CandidateDetail';
import type { Candidate } from '../types';

const { Sider, Content } = Layout;

const ResumeLibrary: React.FC = () => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const onRefresh = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener('resumes:refresh', onRefresh);
    return () => window.removeEventListener('resumes:refresh', onRefresh);
  }, []);

  const handleSelectCandidate = (candidate: Candidate | null) => {
    setSelectedCandidateId(candidate ? candidate.id : null);
  };

  return (
    <Layout style={{ height: 'calc(100vh - 64px)', background: '#fff' }}>
      <Sider width={300} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <CandidateList
          onSelectCandidate={handleSelectCandidate}
          selectedCandidateId={selectedCandidateId || undefined}
          refreshTrigger={refreshTrigger}
        />
      </Sider>
      <Content>
        <CandidateDetail candidateId={selectedCandidateId} />
      </Content>
    </Layout>
  );
};

export default ResumeLibrary;
