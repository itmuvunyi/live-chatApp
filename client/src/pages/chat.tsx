import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Send, Users, LogOut, Menu, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

interface Message {
  id: number;
  roomId: string;
  username: string;
  message: string;
  timestamp: Date;
}

interface OnlineUser {
  id: number;
  username: string;
  roomId: string;
  socketId: string;
  joinedAt: Date;
}

interface TypingUser {
  username: string;
  isTyping: boolean;
}

export default function Chat() {
  const [isJoined, setIsJoined] = useState(false);
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket connection
  useEffect(() => {
    if (isJoined && username && roomId) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Connected to WebSocket');
        setIsConnected(true);
        setSocket(ws);
        
        // Join room
        ws.send(JSON.stringify({
          type: 'join',
          data: { username, roomId }
        }));
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'joined':
            setMessages(data.data.messages);
            setOnlineUsers(data.data.onlineUsers);
            break;
            
          case 'message':
            setMessages(prev => [...prev, data.data]);
            break;
            
          case 'userJoined':
            setOnlineUsers(data.data.onlineUsers);
            break;
            
          case 'userLeft':
            setOnlineUsers(data.data.onlineUsers);
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
        console.log('WebSocket connection closed');
        setIsConnected(false);
        setSocket(null);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
      
      return () => {
        ws.close();
      };
    }
  }, [isJoined, username, roomId]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && roomId.trim()) {
      setIsJoined(true);
    }
  };

  const handleQuickJoin = (room: string) => {
    setRoomId(room);
  };

  const handleSendMessage = () => {
    if (currentMessage.trim() && socket && isConnected) {
      socket.send(JSON.stringify({
        type: 'message',
        data: {
          roomId,
          username,
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
          username,
          roomId,
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
              username,
              roomId,
              isTyping: false
            }
          }));
        }
      }, 3000);
    }
  };

  const handleLeave = () => {
    if (socket) {
      socket.close();
    }
    setIsJoined(false);
    setUsername('');
    setRoomId('');
    setMessages([]);
    setOnlineUsers([]);
    setTypingUsers([]);
    setSidebarOpen(false);
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

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="w-full max-w-md shadow-2xl">
            <CardContent className="pt-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="text-white text-2xl" />
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">LiveChat</h1>
                <p className="text-gray-600">Join a room to start chatting</p>
              </div>
              
              <form onSubmit={handleJoin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name
                  </label>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your name"
                    className="rounded-xl"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room ID
                  </label>
                  <Input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter room ID"
                    className="rounded-xl"
                    required
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    onClick={() => handleQuickJoin('general')}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    General
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                    onClick={() => handleQuickJoin('random')}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Random
                  </Button>
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl"
                >
                  Join Chat Room
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex">
      {/* Sidebar */}
      <AnimatePresence>
        {(!isMobile || sidebarOpen) && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`w-80 bg-white/95 backdrop-blur-sm border-r border-gray-200 flex flex-col ${
              isMobile ? 'fixed inset-y-0 left-0 z-50' : ''
            }`}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Online Users</h2>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {onlineUsers.length} online
                </Badge>
              </div>
              <div className="text-sm text-gray-600 mb-2">
                Room: <span className="font-medium">{roomId}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLeave}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 p-0 h-auto"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Leave Room
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {onlineUsers.map((user) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="relative">
                    <div className={`w-10 h-10 bg-gradient-to-r ${getAvatarColor(user.username)} rounded-full flex items-center justify-center text-white font-semibold`}>
                      {user.username[0].toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">
                      {user.username === username ? 'You' : user.username}
                    </div>
                    <div className="text-xs text-green-600">Online</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white/90 backdrop-blur-sm">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="p-0 h-auto"
                >
                  <Menu className="w-5 h-5 text-gray-600" />
                </Button>
              )}
              <div>
                <h1 className="text-xl font-semibold text-gray-800">
                  Room: {roomId}
                </h1>
                <p className="text-sm text-gray-600">
                  {onlineUsers.length} members online
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start space-x-3 ${
                  message.username === username ? 'flex-row-reverse' : ''
                }`}
              >
                <div className={`w-8 h-8 bg-gradient-to-r ${getAvatarColor(message.username)} rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
                  {message.username[0].toUpperCase()}
                </div>
                <div className="flex-1 max-w-md">
                  <div className={`flex items-center space-x-2 mb-1 ${
                    message.username === username ? 'flex-row-reverse' : ''
                  }`}>
                    <span className="font-medium text-gray-800 text-sm">
                      {message.username === username ? 'You' : message.username}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                    message.username === username
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-md'
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
            {typingUsers.filter(user => user.isTyping && user.username !== username).map((user) => (
              <motion.div
                key={user.username}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-start space-x-3"
              >
                <div className={`w-8 h-8 bg-gradient-to-r ${getAvatarColor(user.username)} rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
                  {user.username[0].toUpperCase()}
                </div>
                <div className="flex-1 max-w-md">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-800 text-sm">
                      {user.username}
                    </span>
                    <span className="text-xs text-gray-500">typing...</span>
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-gray-100">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
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
                placeholder="Type your message..."
                className="w-full pr-12 rounded-2xl bg-gray-50 focus:bg-white border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                disabled={!isConnected}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0 h-auto"
              >
                <Smile className="w-5 h-5" />
              </Button>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!currentMessage.trim() || !isConnected}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl p-3"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
