import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, WS_URL } from '../../utils/constants';
import { chatAPI } from '../../services/api';

const ChatScreen = ({ route }) => {
  const { chatId, otherUserName } = route.params || {};
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (chatId) {
      loadMessages();
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [chatId]);

  const loadMessages = async () => {
    try {
      const { data } = await chatAPI.getMessages(chatId);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Erro', 'Não foi possível carregar as mensagens');
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(`${WS_URL}/${chatId}`);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.error) {
            Alert.alert('Erro', data.error);
            return;
          }

          if (data.type === 'blocked') {
            Alert.alert(
              'Mensagem Bloqueada',
              `${data.message}: ${data.hint}`,
              [{ text: 'OK' }]
            );
            return;
          }

          if (data.type === 'message') {
            setMessages((prev) => [...prev, data.message]);
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        // Reconnect after 3 seconds
        setTimeout(() => {
          if (chatId) {
            connectWebSocket();
          }
        }, 3000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setConnected(false);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const messageData = {
      sender_id: user.id,
      content: newMessage.trim(),
      attachments: [],
    };

    wsRef.current.send(JSON.stringify(messageData));
    setNewMessage('');
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender_id === user.id;
    const isBlocked = item.blocked;

    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.theirMessage,
        ]}
      >
        {isBlocked ? (
          <View style={styles.blockedMessage}>
            <Text style={styles.blockedText}>🚫 Mensagem bloqueada</Text>
            <Text style={styles.blockedReason}>{item.blocked_reason}</Text>
          </View>
        ) : (
          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.theirMessageText,
            ]}
          >
            {item.content}
          </Text>
        )}
        <Text
          style={[
            styles.timeText,
            isMyMessage ? styles.myTimeText : styles.theirTimeText,
          ]}
        >
          {new Date(item.created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Carregando chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{otherUserName || 'Chat'}</Text>
          <View
            style={[
              styles.statusIndicator,
              connected ? styles.statusConnected : styles.statusDisconnected,
            ]}
          />
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !newMessage.trim() && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || !connected}
          >
            <Text style={styles.sendButtonText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: SIZES.body,
    color: COLORS.gray[500],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.black,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusConnected: {
    backgroundColor: COLORS.success,
  },
  statusDisconnected: {
    backgroundColor: COLORS.gray[400],
  },
  messagesList: {
    padding: SIZES.padding,
  },
  messageContainer: {
    maxWidth: '75%',
    marginBottom: SIZES.padding,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.gray[100],
  },
  messageText: {
    fontSize: SIZES.body,
    lineHeight: 20,
  },
  myMessageText: {
    color: COLORS.white,
  },
  theirMessageText: {
    color: COLORS.black,
  },
  timeText: {
    fontSize: SIZES.small,
    marginTop: 4,
  },
  myTimeText: {
    color: COLORS.gray[200],
  },
  theirTimeText: {
    color: COLORS.gray[500],
  },
  blockedMessage: {
    padding: SIZES.padding,
  },
  blockedText: {
    fontSize: SIZES.body,
    color: COLORS.danger,
    fontWeight: '600',
  },
  blockedReason: {
    fontSize: SIZES.small,
    color: COLORS.gray[600],
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: SIZES.padding,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    fontSize: SIZES.body,
    maxHeight: 100,
    marginRight: SIZES.base,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.padding,
    paddingHorizontal: SIZES.padding * 1.5,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray[300],
  },
  sendButtonText: {
    color: COLORS.white,
    fontSize: SIZES.body,
    fontWeight: '600',
  },
});

export default ChatScreen;
