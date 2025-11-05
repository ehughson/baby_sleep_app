import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

// Note: axios is still used for non-streaming endpoints (conversations, health check)

// Log API URL on load for debugging
console.log('API Base URL:', API_BASE_URL);

export const chatService = {
  // Send message and get streaming response
  sendMessage: async (message, conversationId = null, onChunk = null) => {
    try {
      console.log('Sending message to:', `${API_BASE_URL}/chat`);
      
      // Use streaming by default
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
          stream: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';
      let conversationIdResult = conversationId;

      console.log('Starting to read stream...');

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream done, final response length:', fullResponse.length);
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        console.log('Received chunk:', chunk.substring(0, 100));
        
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
                console.error('Stream error:', data.error);
                throw new Error(data.error);
              }
              
              if (data.chunk) {
                fullResponse += data.chunk;
                console.log('Calling onChunk with:', data.chunk.substring(0, 50));
                if (onChunk) {
                  onChunk(data.chunk, fullResponse);
                }
              }
              
              if (data.done) {
                console.log('Stream complete');
                if (data.conversation_id) {
                  conversationIdResult = data.conversation_id;
                }
                return {
                  response: fullResponse,
                  conversation_id: conversationIdResult
                };
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e, 'Line:', line);
            }
          } else if (line.trim()) {
            console.log('Unexpected line format:', line.substring(0, 100));
          }
        }
      }

      return {
        response: fullResponse,
        conversation_id: conversationIdResult
      };
    } catch (error) {
      console.error('API Error:', error);
      console.error('API URL:', API_BASE_URL);
      
      // More detailed error messages
      if (error.message) {
        throw error;
      } else if (error.request || error.message?.includes('fetch')) {
        throw new Error(`Cannot connect to backend. Check if ${API_BASE_URL} is correct and backend is running.`);
      } else {
        throw new Error(error.message || 'Failed to send message');
      }
    }
  },

  // Get all conversations
  getConversations: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/conversations`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch conversations');
    }
  },

  // Create new conversation
  createConversation: async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/conversations`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to create conversation');
    }
  },

  // Get messages for a conversation
  getMessages: async (conversationId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/conversations/${conversationId}/messages`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch messages');
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.data;
    } catch (error) {
      throw new Error('Backend is not available');
    }
  }
};
