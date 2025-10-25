import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import { chatService } from './api/chatService';

function App() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message) => {
    if (!message.trim()) return;

    setIsLoading(true);
    setError('');

    // Add user message immediately
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await chatService.sendMessage(message, conversationId);
      
      // Add assistant response
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Set conversation ID if this is the first message
      if (!conversationId) {
        setConversationId(response.conversation_id);
      }
    } catch (err) {
      setError(err.message);
      // Remove the user message if sending failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setError('');
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <span className="sleep-icon">🌙</span>
            <h1>Baby Sleep Helper</h1>
          </div>
          <p className="header-subtitle">Expert sleep training guidance for tired parents</p>
        </div>
        {conversationId && (
          <button
            className="new-conversation-btn"
            onClick={handleNewConversation}
            title="Start New Conversation"
          >
            <span className="btn-icon">💬</span>
            New Chat
          </button>
        )}
      </header>

      <div className="chat-container">
        <div className="messages">
          {messages.length === 0 ? (
            <div className="welcome-section">
              <div className="welcome-content">
                <div className="welcome-icon">👶</div>
                <h2>Welcome to Baby Sleep Helper</h2>
                <p>Get personalized sleep training advice for your little one. Ask about:</p>
                <div className="suggestion-chips">
                  <button 
                    className="chip" 
                    onClick={() => handleSendMessage("Tell me about gentle sleep training methods")}
                  >
                    Gentle sleep training methods
                  </button>
                  <button 
                    className="chip" 
                    onClick={() => handleSendMessage("What are some no-cry sleep solutions?")}
                  >
                    No-cry sleep solutions
                  </button>
                  <button 
                    className="chip" 
                    onClick={() => handleSendMessage("Help me create a good bedtime routine")}
                  >
                    Bedtime routines
                  </button>
                  <button 
                    className="chip" 
                    onClick={() => handleSendMessage("My baby wakes up frequently at night, what should I do?")}
                  >
                    Night wakings
                  </button>
                  <button 
                    className="chip" 
                    onClick={() => handleSendMessage("What's a good nap schedule for my baby?")}
                  >
                    Nap schedules
                  </button>
                </div>
                <p className="welcome-subtext">Start by describing your baby's sleep challenges below</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}
          {isLoading && (
            <div className="loading">
              <span>AI is thinking...</span>
            </div>
          )}
          {error && (
            <div className="error">
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

export default App;
