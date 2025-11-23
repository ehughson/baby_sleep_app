/**
 * ChatMessage Component - React Native version
 * Displays individual chat messages with formatting
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sanitizeContent = (text: string): string => {
    if (!text) return '';

    return text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/~~([^~]+)~~/g, '$1')
      .replace(/\*([^*\n]+)\*/g, '$1')
      .replace(/_([^_\n]+)_/g, '$1');
  };

  const formatMessage = (content: string): React.ReactNode[] => {
    const sanitized = sanitizeContent(content);
    if (!sanitized.trim()) return [];

    const paragraphs = sanitized
      .split(/\n\n+/)
      .filter((paragraph) => paragraph.trim().length > 0);

    return paragraphs.map((paragraph, index) => {
      const trimmed = paragraph.trim();

      // Check if it's a list
      if (trimmed.match(/^[-*•]\s/) || trimmed.match(/^\d+\.\s/)) {
        const listItems = trimmed
          .split(/\n/)
          .map((line) => line.trim())
          .filter(Boolean);

        return (
          <View key={index} style={styles.listContainer}>
            {listItems.map((item, itemIndex) => {
              const cleanItem = item
                .replace(/^[-*•]\s/, '')
                .replace(/^\d+\.\s/, '');
              return (
                <Text key={itemIndex} style={styles.listItem}>
                  • {cleanItem}
                </Text>
              );
            })}
          </View>
        );
      }

      // Regular paragraph
      const lines = trimmed.split(/\n/);
      return (
        <Text key={index} style={styles.paragraph}>
          {lines.map((line, lineIndex) => (
            <React.Fragment key={lineIndex}>
              {line}
              {lineIndex < lines.length - 1 && '\n'}
            </React.Fragment>
          ))}
        </Text>
      );
    });
  };

  const isUser = message.role === 'user';

  return (
    <View style={[styles.message, isUser ? styles.userMessage : styles.assistantMessage]}>
      <View
        style={[
          styles.messageContent,
          isUser ? styles.userContent : styles.assistantContent,
        ]}
      >
        {formatMessage(message.content)}
      </View>
      <Text style={styles.messageTime}>{formatTime(message.timestamp)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  message: {
    marginBottom: 16,
    marginHorizontal: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageContent: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
    fontSize: 15,
    lineHeight: 22,
  },
  userContent: {
    backgroundColor: '#3a1f35',
    borderBottomRightRadius: 4,
  },
  assistantContent: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  paragraph: {
    marginBottom: 8,
    lineHeight: 22,
    color: '#333',
  },
  listContainer: {
    marginVertical: 4,
  },
  listItem: {
    marginBottom: 4,
    lineHeight: 22,
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    marginHorizontal: 4,
  },
});

export default ChatMessage;

