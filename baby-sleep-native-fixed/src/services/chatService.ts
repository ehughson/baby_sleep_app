import { API_BASE_URL } from '../constants/api';
import { sessionStorage } from '../utils/storage';
import { logger } from '../utils/logger';
import { sanitizeMessage } from '../utils/validation';

export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: number;
  title: string;
  created_at: string;
}

export interface ChatResponse {
  response: string;
  conversation_id: number | null;
  conversation_title?: string;
}

class ChatService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await sessionStorage.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Send a message and get streaming response
   * React Native's fetch supports streaming, but we'll use a simpler approach
   */
  async sendMessage(
    message: string,
    conversationId: number | null = null,
    onChunk?: (chunk: string, fullResponse: string) => void
  ): Promise<ChatResponse> {
    const headers = await this.getAuthHeaders();
    
    // Sanitize message input
    const sanitizedMessage = sanitizeMessage(message);

    try {
      logger.apiCall('POST', '/chat', !!headers.Authorization);

      // For React Native, we'll use streaming if available
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: sanitizedMessage,
          conversation_id: conversationId,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      // Check if response body supports streaming
      const reader = response.body?.getReader();
      if (!reader) {
        // Fallback to non-streaming
        return await this.sendMessageNonStreaming(message, conversationId);
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';
      let conversationIdResult = conversationId;
      let conversationTitleResult: string | null = null;

      logger.debug('Starting to read stream...');

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          logger.debug('Stream complete');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim() === '') continue;

          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;

              const data = JSON.parse(jsonStr);

              if (data.error) {
                logger.error('Stream error', data.error);
                throw new Error(data.error);
              }

              if (data.conversation_title) {
                conversationTitleResult = data.conversation_title;
              }

              if (data.chunk) {
                fullResponse += data.chunk;
                if (onChunk) {
                  onChunk(data.chunk, fullResponse);
                }
              }

              if (data.done) {
                logger.debug('Stream complete');
                if (data.conversation_id) {
                  conversationIdResult = data.conversation_id;
                }
                if (data.conversation_title) {
                  conversationTitleResult = data.conversation_title;
                }
                return {
                  response: fullResponse,
                  conversation_id: conversationIdResult,
                  conversation_title: conversationTitleResult || undefined,
                };
              }
            } catch (e) {
              logger.error('Error parsing SSE data', __DEV__ ? e : undefined);
            }
          } else if (line.trim()) {
            logger.debug('Unexpected line format in stream');
          }
        }
      }

      return {
        response: fullResponse,
        conversation_id: conversationIdResult,
        conversation_title: conversationTitleResult || undefined,
      };
    } catch (error: any) {
      logger.error('Chat API error', __DEV__ ? error : undefined);

      // Fallback to non-streaming on error
      try {
        return await this.sendMessageNonStreaming(sanitizedMessage, conversationId);
      } catch (fallbackError: any) {
        logger.error('Chat message failed', __DEV__ ? fallbackError : undefined);
        const errorMessage =
          fallbackError?.response?.data?.error ||
          fallbackError?.message ||
          'Failed to send message';
        throw new Error(errorMessage);
      }
    }
  }

  /**
   * Non-streaming fallback
   */
  private async sendMessageNonStreaming(
    message: string,
    conversationId: number | null = null
  ): Promise<ChatResponse> {
    const headers = await this.getAuthHeaders();
    const sanitizedMessage = sanitizeMessage(message);

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: sanitizedMessage,
        conversation_id: conversationId,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return {
      response: data.response || '',
      conversation_id: data.conversation_id ?? conversationId,
      conversation_title: data.conversation_title,
    };
  }

  /**
   * Get all conversations
   */
  async getConversations(): Promise<Conversation[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/conversations`, {
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          return [];
        }
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      if (error?.response?.status === 401) {
        return [];
      }
      logger.error('Failed to fetch conversations', __DEV__ ? error : undefined);
      throw new Error(error?.message || 'Failed to fetch conversations');
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: number): Promise<Message[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/conversations/${conversationId}/messages`,
        { headers }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      const message = error?.message || 'Failed to fetch messages';
      throw new Error(message);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return await response.json();
    } catch (error) {
      throw new Error('Backend is not available');
    }
  }
}

export const chatService = new ChatService();

