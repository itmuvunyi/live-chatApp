import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send, HelpCircle, LogOut, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: number;
  roomId: string;
  senderUsername: string;
  receiverUsername: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

interface TypingUser {
  username: string;
  isTyping: boolean;
}

interface UserChatProps {
  username: string;
  onLeave: () => void;
}

export default function UserChat({ username, onLeave }: UserChatProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [roomId] = useState(username);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('User connected to WebSocket');
      setIsConnected(true);
      setSocket(ws);
      
      // Join as regular user
      ws.send(JSON.stringify({
        type: 'join',
        data: { username, isAdmin: false, roomId }
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'userJoined':
          setMessages(data.data.messages);
          break;
          
        case 'message':
          setMessages(prev => [...prev, data.data]);
          break;
          
        case 'typing':
          const typingData = data.data;
          setTypingUsers(prev => {
            const filtered = prev.filter(user => user.username !== typingData.username);
            if (typingData.isTyping) {
              return [...filtered, typingData];
            }
            return filtered;
          });
          break;
      }
    };
    
    ws.onclose = () => {
      console.log('User WebSocket connection closed');
      setIsConnected(false);
      setSocket(null);
    };
    
    ws.onerror = (error) => {
      console.error('User WebSocket error:', error);
      setIsConnected(false);
    };
    
    return () => {
      ws.close();
    };
  }, [username, roomId]);

  const handleSendMessage = () => {
    if (currentMessage.trim() && socket && isConnected) {
      socket.send(JSON.stringify({
        type: 'message',
        data: {
          roomId,
          message: currentMessage.trim()
        }
      }));
      setCurrentMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleTyping = () => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        type: 'typing',
        data: {
          isTyping: true
        }
      }));
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        if (socket && isConnected) {
          socket.send(JSON.stringify({
            type: 'typing',
            data: {
              isTyping: false
            }
          }));
        }
      }, 3000);
    }
  };

  const handleRequestHelp = async () => {
    try {
      await fetch('/api/help-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          roomId,
          message: 'User is requesting help',
          status: 'pending'
        })
      });
      
      // Send a message to admin about help request
      if (socket && isConnected) {
        socket.send(JSON.stringify({
          type: 'message',
          data: {
            roomId,
            message: '🆘 I need help with something. Please assist me.'
          }
        }));
      }
    } catch (error) {
      console.error('Error requesting help:', error);
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'from-blue-500 to-purple-500',
      'from-pink-500 to-rose-500',
      'from-green-500 to-blue-500',
      'from-orange-500 to-red-500',
      'from-purple-500 to-indigo-500',
      'from-cyan-500 to-blue-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex flex-col">
      {/* Header */}
      <div className="p-4 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
              <MessageCircle className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Chat with Admin</h1>
              <p className="text-sm text-gray-600">
                Welcome, {username} • {isConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleRequestHelp}
              variant="outline"
              size="sm"
              className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Request Help
            </Button>
            <Button
              onClick={onLeave}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Leave
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/90 backdrop-blur-sm">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start space-x-3 ${
                message.senderUsername === username ? 'flex-row-reverse' : ''
              }`}
            >
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className={`${
                  message.senderUsername === 'admin' 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600' 
                    : `bg-gradient-to-r ${getAvatarColor(message.senderUsername)}`
                } text-white text-sm font-semibold`}>
                  {message.senderUsername === 'admin' ? (
                    <Shield className="w-4 h-4" />
                  ) : (
                    message.senderUsername[0].toUpperCase()
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 max-w-md">
                <div className={`flex items-center space-x-2 mb-1 ${
                  message.senderUsername === username ? 'flex-row-reverse' : ''
                }`}>
                  <span className="font-medium text-gray-800 text-sm">
                    {message.senderUsername === username 
                      ? 'You' 
                      : message.senderUsername === 'admin' 
                      ? 'Admin' 
                      : message.senderUsername
                    }
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                  message.senderUsername === username
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-md'
                    : message.senderUsername === 'admin'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-tl-md'
                    : 'bg-white border border-gray-100 text-gray-800 rounded-tl-md'
                }`}>
                  <p>{message.message}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicators */}
        <AnimatePresence>
          {typingUsers.filter(user => user.isTyping && user.username === 'admin').map((user) => (
            <motion.div
              key={user.username}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-start space-x-3"
            >
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold">
                  <Shield className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 max-w-md">
                <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-md">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Admin is typing...</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="text-white text-2xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Start a Conversation</h3>
            <p className="text-gray-600">Send your first message to the admin</p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 bg-white/95 backdrop-blur-sm border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <Input
              type="text"
              value={currentMessage}
              onChange={(e) => {
                setCurrentMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type your message to admin..."
              className="pr-12 rounded-full"
              disabled={!isConnected}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!currentMessage.trim() || !isConnected}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full px-6"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {!isConnected && (
          <div className="text-center mt-2">
            <Badge variant="destructive" className="text-xs">
              Disconnected - Check your connection
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}