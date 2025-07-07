import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send, Users, Settings, Bell, Shield, Clock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

interface Message {
  id: number;
  roomId: string;
  senderUsername: string;
  receiverUsername: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

interface OnlineUser {
  id: number;
  username: string;
  roomId: string;
  socketId: string;
  joinedAt: Date;
  isAdmin: boolean;
}

interface UserWithMessages {
  username: string;
  roomId: string;
  lastMessage: Message | null;
  unreadCount: number;
}

interface TypingUser {
  username: string;
  isTyping: boolean;
  roomId: string;
}

export default function AdminDashboard() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<UserWithMessages[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile();
  
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
      console.log('Admin connected to WebSocket');
      setIsConnected(true);
      setSocket(ws);
      
      // Join as admin
      ws.send(JSON.stringify({
        type: 'join',
        data: { username: 'admin', isAdmin: true, roomId: 'admin' }
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'adminJoined':
          setUsers(data.data.usersWithMessages);
          setOnlineUsers(data.data.onlineUsers);
          break;
          
        case 'message':
          // Add message to current conversation if it's selected
          if (selectedUser && 
              (data.data.senderUsername === selectedUser || data.data.receiverUsername === selectedUser)) {
            setMessages(prev => [...prev, data.data]);
            
            // If admin is viewing this user's conversation, mark as read immediately
            if (data.data.senderUsername === selectedUser && data.data.receiverUsername === 'admin') {
              ws.send(JSON.stringify({
                type: 'markAsRead',
                data: { roomId: selectedUser }
              }));
            }
          }
          
          // Update user list with new message
          setUsers(prev => {
            const userExists = prev.find(u => u.username === data.data.senderUsername);
            
            if (userExists) {
              // User exists, update their message and unread count
              return prev.map(user => {
                if (user.username === data.data.senderUsername) {
                  return {
                    ...user,
                    lastMessage: data.data,
                    unreadCount: selectedUser === user.username ? 0 : user.unreadCount + 1
                  };
                }
                return user;
              });
            } else {
              // User doesn't exist, add them to the list
              return [...prev, {
                username: data.data.senderUsername,
                roomId: data.data.roomId,
                lastMessage: data.data,
                unreadCount: selectedUser === data.data.senderUsername ? 0 : 1
              }];
            }
          });
          break;
          
        case 'newUser':
          // Add new user to the list
          setUsers(prev => {
            const exists = prev.find(u => u.username === data.data.username);
            if (!exists) {
              return [...prev, {
                username: data.data.username,
                roomId: data.data.roomId,
                lastMessage: null,
                unreadCount: 0
              }];
            }
            return prev;
          });
          
          // Update online users list
          setOnlineUsers(prev => {
            const exists = prev.find(u => u.username === data.data.username);
            if (!exists) {
              return [...prev, {
                id: Date.now(),
                username: data.data.username,
                roomId: data.data.roomId,
                socketId: `${data.data.username}-${Date.now()}`,
                joinedAt: new Date(),
                isAdmin: false
              }];
            }
            return prev;
          });
          break;
          
        case 'userLeft':
          setOnlineUsers(prev => prev.filter(u => u.username !== data.data.username));
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
      console.log('Admin WebSocket connection closed');
      setIsConnected(false);
      setSocket(null);
    };
    
    ws.onerror = (error) => {
      console.error('Admin WebSocket error:', error);
      setIsConnected(false);
    };
    
    return () => {
      ws.close();
    };
  }, [selectedUser]);

  const handleUserSelect = async (username: string) => {
    setSelectedUser(username);
    setSidebarOpen(false);
    
    // Fetch messages for this user
    try {
      const response = await fetch(`/api/messages/${username}`);
      const userMessages = await response.json();
      setMessages(userMessages);
      
      // Mark messages as read
      if (socket && isConnected) {
        socket.send(JSON.stringify({
          type: 'markAsRead',
          data: { roomId: username }
        }));
      }
      
      // Reset unread count immediately
      setUsers(prev => prev.map(user => 
        user.username === username ? { ...user, unreadCount: 0 } : user
      ));
      
      // Refresh the user list to get updated unread counts from server
      const usersResponse = await fetch('/api/admin/users');
      const updatedUsers = await usersResponse.json();
      setUsers(updatedUsers);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = () => {
    if (currentMessage.trim() && socket && isConnected && selectedUser) {
      socket.send(JSON.stringify({
        type: 'message',
        data: {
          roomId: selectedUser,
          targetUsername: selectedUser,
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
    if (socket && isConnected && selectedUser) {
      socket.send(JSON.stringify({
        type: 'typing',
        data: {
          targetUsername: selectedUser,
          isTyping: true
        }
      }));
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        if (socket && isConnected && selectedUser) {
          socket.send(JSON.stringify({
            type: 'typing',
            data: {
              targetUsername: selectedUser,
              isTyping: false
            }
          }));
        }
      }, 3000);
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
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      {/* Sidebar */}
      <AnimatePresence>
        {(!isMobile || sidebarOpen) && (
          <motion.div
            initial={{ x: -400 }}
            animate={{ x: 0 }}
            exit={{ x: -400 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`w-96 bg-white/95 backdrop-blur-sm border-r border-gray-200 flex flex-col ${
              isMobile ? 'fixed inset-y-0 left-0 z-50' : ''
            }`}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                    <Shield className="text-white text-xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Admin Dashboard</h2>
                    <p className="text-sm text-gray-600">Manage user conversations</p>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 text-blue-700">
                    <Users className="w-4 h-4" />
                    <span>Online Users</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">
                    {onlineUsers.filter(u => !u.isAdmin).length}
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 text-purple-700">
                    <MessageCircle className="w-4 h-4" />
                    <span>Total Chats</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900 mt-1">
                    {users.length}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Active Conversations</h3>
                <div className="space-y-2">
                  {users.map((user) => (
                    <motion.div
                      key={user.username}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedUser === user.username
                          ? 'bg-blue-100 border-2 border-blue-300'
                          : 'hover:bg-gray-50 border-2 border-transparent'
                      }`}
                      onClick={() => handleUserSelect(user.username)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className={`bg-gradient-to-r ${getAvatarColor(user.username)} text-white font-semibold`}>
                              {user.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                            onlineUsers.some(u => u.username === user.username) ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-800 truncate">{user.username}</p>
                            {user.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {user.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate">
                            {user.lastMessage ? user.lastMessage.message : 'No messages yet'}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-400">
                              Room: {user.roomId}
                            </span>
                            {user.lastMessage && (
                              <span className="text-xs text-gray-400">
                                {formatTime(user.lastMessage.timestamp)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white/90 backdrop-blur-sm">
        {selectedUser ? (
          <>
            {/* Chat Header */}
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
                      <Users className="w-5 h-5 text-gray-600" />
                    </Button>
                  )}
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className={`bg-gradient-to-r ${getAvatarColor(selectedUser)} text-white font-semibold`}>
                      {selectedUser[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-800">{selectedUser}</h1>
                    <p className="text-sm text-gray-600">
                      {onlineUsers.some(u => u.username === selectedUser) ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-gray-50 to-white">
              <div className="space-y-4">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-start space-x-3 ${
                        message.senderUsername === 'admin' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className={`bg-gradient-to-r ${getAvatarColor(message.senderUsername)} text-white text-sm font-semibold`}>
                          {message.senderUsername[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 max-w-md">
                        <div className={`flex items-center space-x-2 mb-1 ${
                          message.senderUsername === 'admin' ? 'flex-row-reverse' : ''
                        }`}>
                          <span className="font-medium text-gray-800 text-sm">
                            {message.senderUsername === 'admin' ? 'You' : message.senderUsername}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                          message.senderUsername === 'admin'
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-tr-md'
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
                  {typingUsers.filter(user => user.isTyping && user.username === selectedUser).map((user) => (
                    <motion.div
                      key={user.username}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-start space-x-3"
                    >
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className={`bg-gradient-to-r ${getAvatarColor(user.username)} text-white text-sm font-semibold`}>
                          {user.username[0].toUpperCase()}
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
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

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
                    placeholder={`Reply to ${selectedUser}...`}
                    className="pr-12 rounded-full"
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim() || !isConnected}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full px-6"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Select a Conversation</h3>
              <p className="text-gray-600">Choose a user from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}