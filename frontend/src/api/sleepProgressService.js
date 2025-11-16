import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export const sleepProgressService = {
  async getProgressSummary() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('session_token') : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await axios.get(`${API_BASE_URL}/sleep/progress`, { headers });
    return response.data;
  },
  async getFactors(days = 30) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('session_token') : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await axios.get(`${API_BASE_URL}/sleep/factors?days=${days}`, { headers });
    return response.data || {};
  },
  async setFactors({ date, factors, note }) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('session_token') : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
    const response = await axios.post(`${API_BASE_URL}/sleep/factors`, { date, factors, note }, { headers });
    return response.data;
  }
};


