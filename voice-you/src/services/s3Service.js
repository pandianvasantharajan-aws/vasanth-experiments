import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Upload audio file to S3 via FastAPI backend
 * @param {Blob} audioBlob - The audio blob to upload
 * @param {string} fileName - The name of the file
 * @returns {Promise<Object>} Response with S3 URL and file details
 */
export const uploadAudioToS3 = async (audioBlob, fileName) => {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, fileName);

    const response = await axios.post(`${API_URL}/api/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Failed to upload audio');
    } else if (error.request) {
      throw new Error('No response from server. Make sure the FastAPI server is running.');
    } else {
      throw new Error(error.message || 'Failed to upload audio');
    }
  }
};

/**
 * Get health check status of the API
 * @returns {Promise<Object>} Health status
 */
export const checkApiHealth = async () => {
  try {
    const response = await axios.get(`${API_URL}/health`);
    return response.data;
  } catch (error) {
    throw new Error('API is not available');
  }
};
/**
 * Get list of all voices from S3 bucket
 * @returns {Promise<Array>} Array of voice objects with metadata
 */
export const listVoices = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/voices`);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Failed to fetch voices');
    } else if (error.request) {
      throw new Error('No response from server. Make sure the FastAPI server is running.');
    } else {
      throw new Error(error.message || 'Failed to fetch voices');
    }
  }
};

export default {
  uploadAudioToS3,
  checkApiHealth,
  listVoices,
};