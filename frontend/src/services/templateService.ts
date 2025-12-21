import api from './api';
import type { Template } from '../types';

export const templateService = {
  async list(): Promise<Template[]> {
    const { data } = await api.get<Template[]>('/templates');
    return data;
  },

  async upload(file: File, onProgress?: (percent: number) => void): Promise<Template> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<Template>('/templates/upload', formData, {
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
    return data;
  },

  async update(id: string, data: { name?: string }): Promise<Template> {
    const response = await api.patch<Template>(`/templates/${id}`, data);
    return response.data;
  },

  async delete(ids: string[]): Promise<void> {
    await Promise.all(ids.map(id => api.delete(`/templates/${id}`)));
  },

  async getFile(id: string): Promise<Blob> {
    const { data } = await api.get(`/templates/${id}/file`, {
      responseType: 'blob',
    });
    return data;
  }
};
