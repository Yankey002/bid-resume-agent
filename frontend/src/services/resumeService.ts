import api from './api';
import type { RawResume } from '../types';

export const resumeService = {
  /**
   * Upload a resume file
   */
  upload: async (file: File, candidateId?: string, candidateName?: string, onProgress?: (percent: number) => void): Promise<RawResume> => {
    const formData = new FormData();
    formData.append('file', file);
    if (candidateId) {
      formData.append('candidate_id', candidateId);
    }
    if (candidateName) {
      formData.append('candidate_name', candidateName);
    }

    const response = await api.post<RawResume>('/resumes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    return response.data;
  },

  /**
   * List all resumes, optionally filtered by candidateId
   */
  list: async (candidateId?: string): Promise<RawResume[]> => {
    const params = candidateId ? { candidate_id: candidateId } : {};
    const response = await api.get<RawResume[]>('/resumes', { params });
    return response.data;
  }
};
