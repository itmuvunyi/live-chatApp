import { users, messages, onlineUsers, helpRequests, type User, type InsertUser, type Message, type OnlineUser, type InsertMessage, type InsertOnlineUser, type HelpRequest, type InsertHelpRequest } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Messages
  getMessagesByRoom(roomId: string): Promise<Message[]>;
  getMessagesBetweenUsers(user1: string, user2: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(roomId: string, username: string): Promise<void>;
  
  // Online users
  getOnlineUsersByRoom(roomId: string): Promise<OnlineUser[]>;
  getAllOnlineUsers(): Promise<OnlineUser[]>;
  addOnlineUser(user: InsertOnlineUser): Promise<OnlineUser>;
  removeOnlineUser(socketId: string): Promise<void>;
  getUserBySocketId(socketId: string): Promise<OnlineUser | undefined>;
  
  // Help requests
  createHelpRequest(helpRequest: InsertHelpRequest): Promise<HelpRequest>;
  getHelpRequests(): Promise<HelpRequest[]>;
  updateHelpRequestStatus(id: number, status: string): Promise<void>;
  
  // Admin functions
  getAllUsersWithMessages(): Promise<Array<{ username: string; roomId: string; lastMessage: Message | null; unreadCount: number }>>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getMessagesByRoom(roomId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.roomId, roomId))
      .orderBy(asc(messages.timestamp));
  }

  async getMessagesBetweenUsers(user1: string, user2: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderUsername, user1), eq(messages.receiverUsername, user2)),
          and(eq(messages.senderUsername, user2), eq(messages.receiverUsername, user1))
        )
      )
      .orderBy(asc(messages.timestamp));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async markMessagesAsRead(roomId: string, username: string): Promise<void> {
    // Mark messages as read where the admin is the receiver (user messages to admin)
    await db
      .update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.roomId, roomId), eq(messages.receiverUsername, username)));
  }

  async getOnlineUsersByRoom(roomId: string): Promise<OnlineUser[]> {
    return await db
      .select()
      .from(onlineUsers)
      .where(eq(onlineUsers.roomId, roomId));
  }

  async getAllOnlineUsers(): Promise<OnlineUser[]> {
    return await db
      .select()
      .from(onlineUsers);
  }

  async addOnlineUser(insertOnlineUser: InsertOnlineUser): Promise<OnlineUser> {
    const [onlineUser] = await db
      .insert(onlineUsers)
      .values(insertOnlineUser)
      .returning();
    return onlineUser;
  }

  async removeOnlineUser(socketId: string): Promise<void> {
    await db
      .delete(onlineUsers)
      .where(eq(onlineUsers.socketId, socketId));
  }

  async getUserBySocketId(socketId: string): Promise<OnlineUser | undefined> {
    const [user] = await db
      .select()
      .from(onlineUsers)
      .where(eq(onlineUsers.socketId, socketId));
    return user || undefined;
  }

  async createHelpRequest(insertHelpRequest: InsertHelpRequest): Promise<HelpRequest> {
    const [helpRequest] = await db
      .insert(helpRequests)
      .values(insertHelpRequest)
      .returning();
    return helpRequest;
  }

  async getHelpRequests(): Promise<HelpRequest[]> {
    return await db
      .select()
      .from(helpRequests)
      .orderBy(desc(helpRequests.createdAt));
  }

  async updateHelpRequestStatus(id: number, status: string): Promise<void> {
    await db
      .update(helpRequests)
      .set({ status })
      .where(eq(helpRequests.id, id));
  }

  async getAllUsersWithMessages(): Promise<Array<{ username: string; roomId: string; lastMessage: Message | null; unreadCount: number }>> {
    // Get all messages for each user (both sent and received)
    const allMessages = await db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.receiverUsername, 'admin'),
          eq(messages.senderUsername, 'admin')
        )
      )
      .orderBy(asc(messages.timestamp));

    // Group by username and calculate unread count and last message
    const grouped = allMessages.reduce((acc, msg) => {
      // Determine the user (not admin)
      const username = msg.senderUsername === 'admin' ? msg.receiverUsername : msg.senderUsername;
      
      if (!acc[username]) {
        acc[username] = {
          username,
          roomId: msg.roomId,
          lastMessage: null,
          unreadCount: 0
        };
      }
      
      const currentUser = acc[username];
      
      // Update last message if this is more recent
      if (!currentUser.lastMessage || 
          (msg.timestamp && (!currentUser.lastMessage.timestamp || msg.timestamp > currentUser.lastMessage.timestamp))) {
        currentUser.lastMessage = msg;
      }
      
      // Count unread messages sent by user to admin
      if (msg.senderUsername === username && msg.receiverUsername === 'admin' && !msg.isRead) {
        currentUser.unreadCount++;
      }
      
      return acc;
    }, {} as Record<string, { username: string; roomId: string; lastMessage: Message | null; unreadCount: number }>);

    return Object.values(grouped);
  }
}

export const storage = new DatabaseStorage();
