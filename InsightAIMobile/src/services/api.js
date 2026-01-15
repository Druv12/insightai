import axios from 'axios';

// Replace with your actual backend URL
const API_BASE_URL = 'http://192.168.1.72:8000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Upload file to backend
export const uploadFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.mimeType,
      name: file.name,
    });

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error(
      error.response?.data?.message || 'Failed to upload file'
    );
  }
};

// Get analytics data
export const getAnalytics = async (fileId) => {
  try {
    const endpoint = fileId ? `/analytics/${fileId}` : '/analytics';
    const response = await api.get(endpoint);
    return response.data;
  } catch (error) {
    console.error('Analytics error:', error);
    throw new Error(
      error.response?.data?.message || 'Failed to fetch analytics'
    );
  }
};

// Get AI insights
export const getInsights = async (fileId) => {
  try {
    const response = await api.get(`/insights/${fileId}`);
    return response.data;
  } catch (error) {
    console.error('Insights error:', error);
    throw new Error(
      error.response?.data?.message || 'Failed to fetch insights'
    );
  }
};

// Get file list
export const getFiles = async () => {
  try {
    const response = await api.get('/files');
    return response.data;
  } catch (error) {
    console.error('Files error:', error);
    throw new Error(
      error.response?.data?.message || 'Failed to fetch files'
    );
  }
};

// Delete file
export const deleteFile = async (fileId) => {
  try {
    const response = await api.delete(`/files/${fileId}`);
    return response.data;
  } catch (error) {
    console.error('Delete error:', error);
    throw new Error(
      error.response?.data?.message || 'Failed to delete file'
    );
  }
};

// Export report
export const exportReport = async (fileId, format = 'pdf') => {
  try {
    const response = await api.get(`/export/${fileId}`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    console.error('Export error:', error);
    throw new Error(
      error.response?.data?.message || 'Failed to export report'
    );
  }
};

export default api;