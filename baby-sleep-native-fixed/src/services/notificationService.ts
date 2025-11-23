/**
 * Notification Service - React Native version
 * Handles fetching and managing notifications
 */
import { API_BASE_URL } from '../constants/api';
import { sessionStorage } from '../utils/storage';
import axios from 'axios';

export interface NotificationData {
  new_posts: Array<{
    id: number;
    channel_id: number;
    channel_name: string;
    author_name: string;
    content: string;
    timestamp: string;
    notification_id?: number;
  }>;
  new_messages: number;
  new_message_senders: Array<{
    sender_name: string;
    unread_count: number;
    last_message_time?: string;
  }>;
  new_friend_requests: Array<{
    from_user: string;
    created_at: string;
  }>;
  channel_invites: Array<{
    id: number;
    channel_id: number;
    channel_name: string;
    invited_by: string;
    created_at: string;
    requires_owner_approval: number;
    is_private: number;
  }>;
  invite_approvals: Array<{
    id: number;
    channel_id: number;
    channel_name: string;
    invited_by: string;
    invitee_username: string;
    created_at: string;
    is_private: number;
  }>;
}

export const notificationService = {
  /**
   * Get all notifications for a user
   */
  async getNotifications(username: string, lastCheck?: string): Promise<NotificationData> {
    try {
      const token = await sessionStorage.getToken();
      const params = new URLSearchParams({ username });
      if (lastCheck) {
        params.append('last_check', lastCheck);
      }
      
      const response = await axios.get(`${API_BASE_URL}/notifications?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 10000,
      });
      
      return response.data || {
        new_posts: [],
        new_messages: 0,
        new_message_senders: [],
        new_friend_requests: [],
        channel_invites: [],
        invite_approvals: [],
      };
    } catch (error: any) {
      console.error('Failed to get notifications:', error);
      return {
        new_posts: [],
        new_messages: 0,
        new_message_senders: [],
        new_friend_requests: [],
        channel_invites: [],
        invite_approvals: [],
      };
    }
  },

  /**
   * Mark notifications as read
   */
  async markNotificationsRead(
    username: string,
    options: {
      mark_all?: boolean;
      notification_ids?: number[];
      post_ids?: number[];
    } = {}
  ): Promise<boolean> {
    try {
      const token = await sessionStorage.getToken();
      await axios.post(
        `${API_BASE_URL}/notifications/read`,
        {
          username,
          ...options,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          timeout: 10000,
        }
      );
      return true;
    } catch (error: any) {
      console.error('Failed to mark notifications as read:', error);
      return false;
    }
  },
};

