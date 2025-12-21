import React, { useState, useEffect } from 'react';
import { CandidateList } from '../features/resumes/components/CandidateList';
import { CandidateDetail } from '../features/resumes/components/CandidateDetail';
import type { Candidate } from '../types';
import useResumeStore from '../store/useResumeStore';
import { MasterDetailLayout } from '../components/layout/MasterDetailLayout';

const ResumeLibrary: React.FC = () => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const triggerRefresh = useResumeStore((s) => s.triggerRefresh);
  const isSidebarOpen = useResumeStore((s) => s.isSidebarOpen);

  useEffect(() => {
    const onRefresh = () => {
      triggerRefresh();
    };
    window.addEventListener('resumes:refresh', onRefresh);
    return () => window.removeEventListener('resumes:refresh', onRefresh);
  }, [triggerRefresh]);

  const handleSelectCandidate = (candidate: Candidate | null) => {
    setSelectedCandidateId(candidate ? candidate.id : null);
  };

  return (
    <MasterDetailLayout
      isSidebarOpen={isSidebarOpen}
      sidebarContent={
        <CandidateList
          onSelectCandidate={handleSelectCandidate}
          selectedCandidateId={selectedCandidateId || undefined}
        />
      }
      mainContent={<CandidateDetail candidateId={selectedCandidateId} />}
    />
  );
};

export default ResumeLibrary;
