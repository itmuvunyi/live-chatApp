import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertMessageSchema, insertOnlineUserSchema, insertUserSchema, insertHelpRequestSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server on /ws path to avoid conflicts with Vite HMR
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store WebSocket connections with user info
  const connections = new Map<WebSocket, { username: string; isAdmin: boolean; roomId: string }>();

  // REST API Routes
  app.post('/api/users', async (req, res) => {
    try {
      const validatedUser = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedUser);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: 'Invalid user data' });
    }
  });

  app.get('/api/users/:username', async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/users', async (req, res) => {
    try {
      const usersWithMessages = await storage.getAllUsersWithMessages();
      res.json(usersWithMessages);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/online-users', async (req, res) => {
    try {
      const onlineUsers = await storage.getAllOnlineUsers();
      res.json(onlineUsers);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/messages/:roomId', async (req, res) => {
    try {
      const messages = await storage.getMessagesByRoom(req.params.roomId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/help-requests', async (req, res) => {
    try {
      const validatedRequest = insertHelpRequestSchema.parse(req.body);
      const helpRequest = await storage.createHelpRequest(validatedRequest);
      
      // Notify admin via WebSocket
      connections.forEach((connectionInfo, ws) => {
        if (connectionInfo.isAdmin && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'helpRequest',
            data: helpRequest
          }));
        }
      });
      
      res.json(helpRequest);
    } catch (error) {
      res.status(400).json({ error: 'Invalid help request data' });
    }
  });

  app.get('/api/help-requests', async (req, res) => {
    try {
      const helpRequests = await storage.getHelpRequests();
      res.json(helpRequests);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // WebSocket connection handler
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    
    ws.on('message', async (data) => {
      try {
        const parsedData = JSON.parse(data.toString());
        
        switch (parsedData.type) {
          case 'join':
            const { username, isAdmin, roomId } = parsedData.data;
            
            // Store connection info
            connections.set(ws, { username, isAdmin, roomId });
            
            // Create or get user
            let user = await storage.getUserByUsername(username);
            if (!user) {
              user = await storage.createUser({ username, isAdmin: isAdmin || false });
            }
            
            // Add to online users
            const socketId = `${username}-${Date.now()}`;
            const onlineUser = await storage.addOnlineUser({
              username,
              roomId,
              socketId,
              isAdmin: isAdmin || false
            });
            
            if (isAdmin) {
              // Admin joining - send all users with messages
              const usersWithMessages = await storage.getAllUsersWithMessages();
              const allOnlineUsers = await storage.getAllOnlineUsers();
              
              ws.send(JSON.stringify({
                type: 'adminJoined',
                data: {
                  usersWithMessages,
                  onlineUsers: allOnlineUsers
                }
              }));
            } else {
              // Regular user joining - send their conversation with admin
              const messages = await storage.getMessagesBetweenUsers(username, 'admin');
              
              ws.send(JSON.stringify({
                type: 'userJoined',
                data: {
                  messages,
                  roomId
                }
              }));
              
              // Notify admin about new user
              connections.forEach((connectionInfo, adminWs) => {
                if (connectionInfo.isAdmin && adminWs.readyState === WebSocket.OPEN) {
                  adminWs.send(JSON.stringify({
                    type: 'newUser',
                    data: {
                      username,
                      roomId,
                      isOnline: true
                    }
                  }));
                }
              });
            }
            
            break;
            
          case 'message':
            const messageData = parsedData.data;
            const connectionInfo = connections.get(ws);
            
            if (!connectionInfo) {
              break;
            }
            
            // Validate and store message
            const validatedMessage = insertMessageSchema.parse({
              roomId: messageData.roomId,
              senderUsername: connectionInfo.username,
              receiverUsername: connectionInfo.isAdmin ? messageData.targetUsername : 'admin',
              message: messageData.message
            });
            
            const message = await storage.createMessage(validatedMessage);
            
            // Broadcast message to relevant users
            if (connectionInfo.isAdmin) {
              // Admin message - send to specific user AND back to admin
              connections.forEach((targetInfo, targetWs) => {
                if ((targetInfo.username === messageData.targetUsername || 
                     (targetInfo.isAdmin && targetInfo.username === connectionInfo.username)) && 
                    targetWs.readyState === WebSocket.OPEN) {
                  targetWs.send(JSON.stringify({
                    type: 'message',
                    data: message
                  }));
                }
              });
            } else {
              // User message - send to all admins AND back to user
              connections.forEach((targetInfo, targetWs) => {
                if ((targetInfo.isAdmin || targetInfo.username === connectionInfo.username) && 
                    targetWs.readyState === WebSocket.OPEN) {
                  targetWs.send(JSON.stringify({
                    type: 'message',
                    data: message
                  }));
                }
              });
            }
            
            break;
            
          case 'typing':
            const typingData = parsedData.data;
            const typingConnectionInfo = connections.get(ws);
            
            if (!typingConnectionInfo) {
              break;
            }
            
            // Broadcast typing indicator
            if (typingConnectionInfo.isAdmin) {
              // Admin typing - send to specific user
              connections.forEach((targetInfo, targetWs) => {
                if (targetInfo.username === typingData.targetUsername && targetWs.readyState === WebSocket.OPEN) {
                  targetWs.send(JSON.stringify({
                    type: 'typing',
                    data: {
                      username: typingConnectionInfo.username,
                      isTyping: typingData.isTyping
                    }
                  }));
                }
              });
            } else {
              // User typing - send to all admins
              connections.forEach((targetInfo, targetWs) => {
                if (targetInfo.isAdmin && targetWs.readyState === WebSocket.OPEN) {
                  targetWs.send(JSON.stringify({
                    type: 'typing',
                    data: {
                      username: typingConnectionInfo.username,
                      isTyping: typingData.isTyping,
                      roomId: typingConnectionInfo.roomId
                    }
                  }));
                }
              });
            }
            
            break;
            
          case 'markAsRead':
            const readData = parsedData.data;
            const readerInfo = connections.get(ws);
            
            if (readerInfo) {
              await storage.markMessagesAsRead(readData.roomId, readerInfo.username);
            }
            
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', async () => {
      console.log('WebSocket connection closed');
      
      const connectionInfo = connections.get(ws);
      if (connectionInfo) {
        // Remove from online users
        await storage.removeOnlineUser(`${connectionInfo.username}-${Date.now()}`);
        
        // Notify admin if user left
        if (!connectionInfo.isAdmin) {
          connections.forEach((targetInfo, targetWs) => {
            if (targetInfo.isAdmin && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: 'userLeft',
                data: {
                  username: connectionInfo.username,
                  roomId: connectionInfo.roomId
                }
              }));
            }
          });
        }
        
        connections.delete(ws);
      }
    });
  });

  return httpServer;
}
