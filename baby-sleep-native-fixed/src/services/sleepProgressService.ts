/**
 * Sleep Progress Service - React Native version
 * Handles sleep progress data and factors
 */
import { API_BASE_URL } from '../constants/api';
import { sessionStorage } from '../utils/storage';
import axios from 'axios';

export const sleepProgressService = {
  async getProgressSummary(): Promise<any> {
    try {
      const token = await sessionStorage.getToken();
      const response = await axios.get(`${API_BASE_URL}/sleep/progress`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to get sleep progress');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  async getFactors(days: number = 30): Promise<any> {
    try {
      const token = await sessionStorage.getToken();
      const response = await axios.get(`${API_BASE_URL}/sleep/factors?days=${days}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 10000,
      });
      return response.data || {};
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to get factors');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },

  async setFactors(data: { date: string; factors: string[]; note?: string }): Promise<any> {
    try {
      const token = await sessionStorage.getToken();
      const response = await axios.post(
        `${API_BASE_URL}/sleep/factors`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          timeout: 10000,
        }
      );
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error || 'Failed to set factors');
      }
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    }
  },
};

