import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull(), // For admin this will be the user's unique room ID
  senderUsername: text("sender_username").notNull(),
  receiverUsername: text("receiver_username").notNull(), // 'admin' for user messages, username for admin replies
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  isRead: boolean("is_read").default(false).notNull(),
});

export const onlineUsers = pgTable("online_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  roomId: text("room_id").notNull(),
  socketId: text("socket_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
  isAdmin: boolean("is_admin").default(false).notNull(),
});

export const helpRequests = pgTable("help_requests", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  roomId: text("room_id").notNull(),
  message: text("message").notNull(),
  status: text("status").default("pending").notNull(), // pending, in_progress, resolved
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  isAdmin: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  roomId: true,
  senderUsername: true,
  receiverUsername: true,
  message: true,
});

export const insertOnlineUserSchema = createInsertSchema(onlineUsers).pick({
  username: true,
  roomId: true,
  socketId: true,
  isAdmin: true,
});

export const insertHelpRequestSchema = createInsertSchema(helpRequests).pick({
  username: true,
  roomId: true,
  message: true,
  status: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type OnlineUser = typeof onlineUsers.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertOnlineUser = z.infer<typeof insertOnlineUserSchema>;
export type HelpRequest = typeof helpRequests.$inferSelect;
export type InsertHelpRequest = z.infer<typeof insertHelpRequestSchema>;
