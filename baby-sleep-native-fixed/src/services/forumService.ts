/**
 * Forum Service - React Native version
 * Handles forum channels, posts, friends, and direct messages
 */
import { API_BASE_URL } from '../constants/api';
import { sessionStorage } from '../utils/storage';

class ForumService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await sessionStorage.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // Get all channels
  async getChannels(username: string = ''): Promise<any[]> {
    try {
      const url = username
        ? `${API_BASE_URL}/forum/channels?username=${encodeURIComponent(username)}`
        : `${API_BASE_URL}/forum/channels`;
      const headers = await this.getAuthHeaders();
      const response = await fetch(url, { headers });
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to fetch channels: ${response.status} ${errorText}`);
      }
      return await response.json();
    } catch (error: any) {
      // Check if it's a network/connection error
      if (error.message?.includes('fetch') || error.message?.includes('Network') || error.message?.includes('Failed to fetch')) {
        throw new Error('Cannot connect to backend. Make sure the Flask server is running on port 5001.');
      }
      throw error;
    }
  }

  // Get posts for a channel
  async getPosts(channelId: number, username: string = ''): Promise<any[]> {
    try {
      const url = username
        ? `${API_BASE_URL}/forum/channels/${channelId}/posts?username=${encodeURIComponent(username)}`
        : `${API_BASE_URL}/forum/channels/${channelId}/posts`;
      const headers = await this.getAuthHeaders();
      const response = await fetch(url, { headers });
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error('Failed to fetch posts');
      }
      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) return [];
      throw new Error('Failed to fetch posts');
    }
  }

  // Create a new post
  async createPost(postData: any): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/forum/posts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(postData),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to create post');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create post');
    }
  }

  // Create a new channel
  async createChannel(channelData: any): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/forum/channels`, {
        method: 'POST',
        headers,
        body: JSON.stringify(channelData),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to create channel');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create channel');
    }
  }

  // Friends API
  async createOrGetUser(username: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/forum/users/${username}`, {
        method: 'POST',
        headers,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to create/get user');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create/get user');
    }
  }

  async getFriends(username: string): Promise<any[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/forum/friends/${username}`, {
        headers,
      });
      if (!response.ok) throw new Error('Failed to fetch friends');
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch friends');
    }
  }

  async getFriendRequests(username: string): Promise<any[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/forum/friend-requests?username=${username}`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to fetch friend requests');
      return await response.json();
    } catch (error) {
      throw new Error('Failed to fetch friend requests');
    }
  }

  async sendFriendRequest(fromUser: string, toUser: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/forum/friends`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          from_user: fromUser,
          to_user: toUser,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to send friend request');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send friend request');
    }
  }

  async acceptFriendRequest(fromUser: string, toUser: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/forum/friends/accept`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          from_user: fromUser,
          to_user: toUser,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to accept friend request');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to accept friend request');
    }
  }

  async searchUsers(query: string, currentUser: string): Promise<any[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/forum/users/search?q=${encodeURIComponent(query)}&current_user=${encodeURIComponent(currentUser)}`,
        { headers }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to search users');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to search users');
    }
  }

  // Direct Messages
  async getConversations(username: string): Promise<any[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/dm/conversations?username=${encodeURIComponent(username)}`,
        { headers }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to get conversations');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get conversations');
    }
  }

  async getMessages(username: string, friendUsername: string): Promise<any[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/dm/messages?username=${encodeURIComponent(username)}&friend=${encodeURIComponent(friendUsername)}`,
        { headers }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to get messages');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get messages');
    }
  }

  async sendMessage(
    senderName: string,
    receiverName: string,
    content: string
  ): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/dm/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sender_name: senderName,
          receiver_name: receiverName,
          content: content,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to send message');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send message');
    }
  }

  getFileUrl(filename: string): string {
    const cleanFilename = filename.split('/').pop();
    return `${API_BASE_URL}/forum/files/${cleanFilename}`;
  }

  // Channel management
  async deleteChannel(channelId: number, username: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/forum/channels/${channelId}?username=${encodeURIComponent(username)}`,
        {
          method: 'DELETE',
          headers,
        }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete channel');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete channel');
    }
  }

  async leaveChannel(channelId: number, username: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/forum/channels/${channelId}/leave`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ username }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to leave channel');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to leave channel');
    }
  }

  async updateChannelPrivacy(
    channelId: number,
    isPrivate: boolean,
    username: string
  ): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/forum/channels/${channelId}/privacy`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          is_private: isPrivate,
          username: username,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update privacy');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update privacy');
    }
  }

  async inviteToChannel(
    channelId: number,
    invitedBy: string,
    inviteeUsername: string
  ): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/forum/channels/${channelId}/invite`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          invited_by: invitedBy,
          invitee_username: inviteeUsername,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to invite user');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to invite user');
    }
  }

  async getChannelMembers(channelId: number): Promise<any[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/forum/channels/${channelId}/members`, {
        headers,
      });
      if (!response.ok) throw new Error('Failed to get channel members');
      return await response.json();
    } catch (error) {
      throw new Error('Failed to get channel members');
    }
  }

  // Respond to channel invite (as recipient)
  async respondToInvite(inviteId: number, username: string, action: 'accept' | 'decline'): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/forum/invites/${inviteId}/respond`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          username,
          action,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to respond to invite');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to respond to invite');
    }
  }

  // Approve channel invite (as owner)
  async approveInvite(inviteId: number, username: string, action: 'approve' | 'decline'): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/forum/invites/${inviteId}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          username,
          action,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to approve invite');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to approve invite');
    }
  }

  // File upload
  async uploadFile(file: any): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      // Remove Content-Type header for FormData - let fetch set it with boundary
      const uploadHeaders: Record<string, string> = {};
      if (headers.Authorization) {
        uploadHeaders.Authorization = headers.Authorization;
      }

      const formData = new FormData();
      formData.append('file', file as any);

      const response = await fetch(`${API_BASE_URL}/forum/upload`, {
        method: 'POST',
        headers: uploadHeaders,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to upload file');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to upload file');
    }
  }

  // Reactions
  async addPostReaction(postId: number, username: string, emoji: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/forum/posts/${postId}/reactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          username,
          emoji,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update reaction');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update reaction');
    }
  }
}

export const forumService = new ForumService();

