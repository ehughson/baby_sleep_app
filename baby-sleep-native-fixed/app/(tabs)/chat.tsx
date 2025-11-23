/**
 * Chat Screen - Sleep Assistant using Gemini
 * Full chat interface with streaming support
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { sessionStorage } from '../../src/utils/storage';
import { chatService, Message, Conversation } from '../../src/services/chatService';
import ChatMessage from '../../src/components/ChatMessage';
import ChatInput from '../../src/components/ChatInput';
import { AppHeader } from '../../src/components/AppHeader';
import MinimalIcon from '../../src/components/icons/MinimalIcon';

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [showConversationMenu, setShowConversationMenu] = useState(false);
  const [isSwitchingConversation, setIsSwitchingConversation] = useState(false);
  const [userData, setUserData] = useState<{
    first_name: string | null;
    username: string | null;
  }>({ first_name: null, username: null });
  const scrollViewRef = useRef<ScrollView>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await sessionStorage.getUserData();
      setUserData({
        first_name: data.first_name,
        username: data.username,
      });
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const loadConversations = useCallback(async () => {
    const user = await sessionStorage.getUserData();
    if (!user || !user.username) {
      setConversations([]);
      setIsLoadingConversations(false);
      return;
    }

    setIsLoadingConversations(true);
    try {
      const conversationList = await chatService.getConversations();
      if (Array.isArray(conversationList)) {
        setConversations(conversationList);
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
      setConversations([]);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (showConversationMenu) {
      loadConversations();
    }
  }, [showConversationMenu, loadConversations]);

  const handleSelectConversation = async (targetConversationId: number) => {
    if (targetConversationId === null || targetConversationId === undefined || isLoading || isSwitchingConversation) {
      return;
    }

    setError('');
    setIsSwitchingConversation(true);
    setShowConversationMenu(false);

    try {
      const conversationMessages = await chatService.getMessages(targetConversationId);
      const normalizedMessages = Array.isArray(conversationMessages)
        ? conversationMessages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          }))
        : [];

      setMessages(normalizedMessages);
      setConversationId(targetConversationId);

      const selectedConversation = conversations.find(
        (conv) => String(conv.id) === String(targetConversationId)
      );
      const resolvedTitle = selectedConversation?.title || conversationTitle || 'Sleep Chat';
      setConversationTitle(resolvedTitle);
    } catch (err: any) {
      console.error('Failed to load conversation', err);
      setError(err?.message || 'Failed to load conversation');
      Alert.alert('Error', err?.message || 'Failed to load conversation');
    } finally {
      setIsSwitchingConversation(false);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setConversationTitle('');
    setError('');
    setIsLoading(false);
  };


  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    setError('');

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Create placeholder for assistant message
    const assistantMessageId = Date.now() + 1;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Track displayed content for letter-by-letter animation
      let displayedLength = 0;
      let fullResponseText = '';

      // Function to animate one letter
      const animateNextLetter = () => {
        if (displayedLength < fullResponseText.length) {
          displayedLength++;
          const currentContent = fullResponseText.substring(0, displayedLength);

          // Update the assistant message
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: currentContent }
                : msg
            )
          );

          // Continue animating if there's more content
          if (displayedLength < fullResponseText.length) {
            animationTimeoutRef.current = setTimeout(animateNextLetter, 20);
          } else {
            animationTimeoutRef.current = null;
          }
        } else {
          animationTimeoutRef.current = null;
        }
      };

      // Handle streaming response
      const response = await chatService.sendMessage(
        message,
        conversationId,
        (chunk, fullResponse) => {
          // Update the full response text
          fullResponseText = fullResponse;

          // Start animation if not already running
          if (!animationTimeoutRef.current && displayedLength < fullResponseText.length) {
            animateNextLetter();
          }
        }
      );

      // Update conversation ID if we got one
      if (response.conversation_id !== null && response.conversation_id !== undefined) {
        setConversationId(response.conversation_id);
        // Reload conversations to get the new title
        if (response.conversation_title) {
          setConversationTitle(response.conversation_title);
        }
        loadConversations();
      }

      // Ensure final content is displayed
      if (displayedLength < response.response.length) {
        fullResponseText = response.response;
        const completeAnimation = () => {
          if (displayedLength < response.response.length) {
            displayedLength++;
            const currentContent = response.response.substring(0, displayedLength);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: currentContent }
                  : msg
              )
            );

            if (displayedLength < response.response.length) {
              animationTimeoutRef.current = setTimeout(completeAnimation, 20);
            }
          }
        };
        completeAnimation();
      }

      // Clean up animation timeout
      setTimeout(() => {
        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
          animationTimeoutRef.current = null;
        }
      }, (response.response.length - displayedLength) * 20 + 100);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      // Remove both user and assistant messages if sending failed
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== userMessage.id && msg.id !== assistantMessageId)
      );
      Alert.alert('Error', err.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionChip = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  // Cleanup animation timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerWrapper}>
        <AppHeader
          subtitle="Sleep shaped around your baby"
          showMenu={true}
        />
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.conversationMenuButton, showConversationMenu && styles.conversationMenuButtonActive]}
            onPress={() => {
              setShowConversationMenu(!showConversationMenu);
            }}
          >
            <MinimalIcon name="history" size={18} color="#fff" />
          </TouchableOpacity>
          {conversationId && (
            <TouchableOpacity
              style={styles.newChatButton}
              onPress={handleNewConversation}
            >
              <MinimalIcon name="chat" size={16} color="#fff" />
              <Text style={styles.newChatButtonText}>New Chat</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }}
      >
        {messages.length === 0 ? (
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeContent}>
              <View style={styles.welcomeIcon}>
                <Image
                  source={require('../../assets/images/baby-icon.png')}
                  style={styles.babyIconImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.welcomeTitle}>
                {userData.first_name
                  ? `Hi there, ${userData.first_name}!`
                  : 'Hi there!'}
              </Text>
              <Text style={styles.welcomeSubtitle}>
                What sleep hurdle are we tackling?
              </Text>
              <View style={styles.suggestionChips}>
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => handleSuggestionChip('Tell me about night wakings')}
                >
                  <Text style={styles.chipText}>Night Wakings</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() =>
                    handleSuggestionChip('Tell me about bedtime resistance')
                  }
                >
                  <Text style={styles.chipText}>Bedtime Resistance</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => handleSuggestionChip('Tell me about short naps')}
                >
                  <Text style={styles.chipText}>Short Naps</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />

      {/* Conversation Menu Modal */}
      <Modal
        visible={showConversationMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConversationMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowConversationMenu(false)}
        >
          <View style={styles.conversationMenuDropdown} onStartShouldSetResponder={() => true}>
            <View style={styles.conversationMenuHeader}>
              <Text style={styles.conversationMenuHeaderText}>Previous Chats</Text>
              <TouchableOpacity
                onPress={() => setShowConversationMenu(false)}
                style={styles.closeButton}
              >
                <MinimalIcon name="close" size={18} color="#666" />
              </TouchableOpacity>
            </View>
            {isLoadingConversations ? (
              <View style={styles.conversationMenuEmpty}>
                <ActivityIndicator size="small" color="#3a1f35" />
                <Text style={styles.conversationMenuEmptyText}>Loading history…</Text>
              </View>
            ) : conversations.length > 0 ? (
              <ScrollView style={styles.conversationMenuList} showsVerticalScrollIndicator={true}>
                {conversations.map((conv) => (
                  <TouchableOpacity
                    key={conv.id}
                    style={[
                      styles.conversationMenuItem,
                      String(conversationId) === String(conv.id) && styles.conversationMenuItemActive,
                    ]}
                    onPress={() => handleSelectConversation(conv.id)}
                    disabled={isSwitchingConversation}
                  >
                    <View style={styles.conversationMenuItemIcon}>
                      <MinimalIcon name="sleep" size={16} color={String(conversationId) === String(conv.id) ? '#3a1f35' : '#666'} />
                    </View>
                    <Text
                      style={[
                        styles.conversationMenuItemTitle,
                        String(conversationId) === String(conv.id) && styles.conversationMenuItemTitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {conv.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.conversationMenuEmpty}>
                <Text style={styles.conversationMenuEmptyText}>No saved chats yet</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerWrapper: {
    position: 'relative',
  },
  headerActions: {
    position: 'absolute',
    right: 112, // Position to the left of notifications (40px) + user menu (40px) + gaps (32px)
    top: 14, // Align with headerActions paddingTop (10px header padding + 4px paddingTop)
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    zIndex: 10,
    height: 40, // Match button height
  },
  conversationMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20, // Match the user menu button (circular)
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationMenuButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    height: 40, // Match the height of other buttons
    borderRadius: 12, // Match border radius
  },
  newChatButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  welcomeSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  welcomeContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  welcomeIcon: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  babyIconImage: {
    width: 120,
    height: 120,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  chip: {
    backgroundColor: '#f8f8f8',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    margin: 16,
  },
  errorText: {
    color: '#c33',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: 16,
  },
  conversationMenuDropdown: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: 250,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  conversationMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  conversationMenuHeaderText: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.08,
    color: '#787878',
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  conversationMenuList: {
    maxHeight: 300,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  conversationMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    minHeight: 44, // Ensure consistent height for all items
  },
  conversationMenuItemActive: {
    backgroundColor: 'rgba(166, 140, 171, 0.18)',
  },
  conversationMenuItemIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationMenuItemTitle: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontFamily: 'System',
  },
  conversationMenuItemTitleActive: {
    color: '#483657',
    fontWeight: '600',
  },
  conversationMenuEmpty: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  conversationMenuEmptyText: {
    fontSize: 13,
    color: '#9a9a9a',
  },
});
