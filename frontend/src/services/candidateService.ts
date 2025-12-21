import api from './api';
import type { Candidate, CandidateSearchParams } from '../types';

export const candidateService = {
  /**
   * Search candidates by name
   */
  search: async (params: CandidateSearchParams): Promise<Candidate[]> => {
    const response = await api.get<Candidate[]>('/candidates/search', { params });
    return response.data;
  },

  /**
   * Get candidate by ID (UUID)
   */
  getById: async (id: string): Promise<Candidate> => {
    const response = await api.get<Candidate>(`/candidates/${id}`);
    return response.data;
  },

  /**
   * Create a new candidate
   */
  create: async (name: string, uniqueId?: string): Promise<Candidate> => {
    const response = await api.post<Candidate>('/candidates', { name, unique_id: uniqueId });
    return response.data;
  },

  /**
   * Get a suggested unique ID
   */
  suggestId: async (): Promise<string> => {
      const response = await api.get<string>('/candidates/suggest-id');
      return response.data;
  },

  /**
   * List all candidates (for sidebar)
   */
  getAll: async (): Promise<Candidate[]> => {
      const response = await api.get<Candidate[]>('/candidates/search', { params: { name: '' } });
      return response.data;
  },

  /**
   * Delete candidates by IDs
   */
  delete: async (ids: string[]): Promise<void> => {
      await api.delete('/candidates/batch', { data: { candidate_ids: ids } });
  }
};
