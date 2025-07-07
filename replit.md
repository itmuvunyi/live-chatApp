# LiveChat Admin Dashboard System

## Overview

This is a comprehensive admin dashboard system built with React, Express.js, WebSockets, and PostgreSQL. The application provides separate interfaces for admins and users, with real-time messaging, persistent message storage, and complete user management capabilities. Admins can monitor all user conversations from a centralized dashboard, while users can only chat with admins privately.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite with custom configuration for development and production
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: React hooks with role-based routing
- **Routing**: Wouter for client-side routing with authentication state
- **WebSocket**: Native WebSocket API for real-time communication
- **Animations**: Framer Motion for smooth UI transitions

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **WebSocket Server**: ws library for real-time communication
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Role-based access (admin vs user)
- **API Design**: RESTful endpoints with WebSocket for real-time features

### Data Storage
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM with type-safe queries
- **Migrations**: Managed through Drizzle Kit (`npm run db:push`)
- **Message Persistence**: All messages stored permanently in database

## Key Components

### Database Schema
- **users**: User profiles with admin flag and creation timestamps
- **messages**: Bidirectional messages between users and admin with read status
- **onlineUsers**: Real-time presence tracking with admin distinction
- **helpRequests**: User help requests with status tracking

### User Roles and Access Control
- **Admin Dashboard**: 
  - View all users who have sent messages
  - See online/offline status of users
  - Access individual conversations with message history
  - Receive real-time notifications for new users and messages
  - Manage multiple conversations simultaneously
- **User Interface**:
  - Private chat with admin only
  - No visibility of other users or conversations
  - Help request functionality
  - Message persistence across sessions

### WebSocket Integration
- Role-based message routing (admin ↔ specific user)
- Typing indicators between admin and users
- Real-time user presence updates
- New user notifications to admin
- Connection management with user identification

### UI Components
- **Login System**: Role selection (Admin/User) with quick access options
- **Admin Dashboard**: Multi-pane interface with user list and chat area
- **User Chat**: Clean interface focused on admin communication
- Responsive design with mobile-first approach
- Accessible components using Radix UI primitives

## Data Flow

1. **Authentication**: Role-based login system (admin vs user)
2. **Admin Workflow**: 
   - View all users with message history
   - Select user to view conversation
   - Send/receive real-time messages
   - Monitor online status and typing indicators
3. **User Workflow**:
   - Direct connection to admin chat
   - Send messages that persist when admin is offline
   - Receive real-time responses from admin
   - Request help functionality
4. **Message Persistence**: All messages stored in database, available when admin returns

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless driver
- **drizzle-orm**: Type-safe ORM for database operations
- **ws**: WebSocket server implementation
- **express**: Web framework for API routes

### UI Dependencies
- **@radix-ui/***: Accessible component primitives
- **tailwindcss**: Utility-first CSS framework
- **framer-motion**: Animation library
- **lucide-react**: Icon library
- **class-variance-authority**: Type-safe styling variants

## Deployment Strategy

### Development
- Vite dev server for frontend with HMR
- Express server with TypeScript compilation via tsx
- WebSocket server integrated with HTTP server
- PostgreSQL database with automatic schema management

### Production
- Frontend built with Vite and served as static files
- Backend compiled with esbuild for Node.js
- Single server deployment serving both frontend and API
- Environment variable configuration for database connection

### Build Process
- `npm run dev`: Development with hot reload
- `npm run build`: Production build (frontend + backend)
- `npm run start`: Production server
- `npm run db:push`: Database schema deployment

## Key Features Implemented

### Admin Dashboard Features
- ✓ Complete user conversation management
- ✓ Real-time online/offline user tracking
- ✓ Multi-conversation interface with unread message counts
- ✓ Persistent message history across sessions
- ✓ Real-time typing indicators and message delivery
- ✓ User presence notifications

### User Experience Features
- ✓ Private admin-only chat interface
- ✓ Help request functionality
- ✓ Message persistence when admin is offline
- ✓ Real-time communication when admin is online
- ✓ Clean, focused UI without other user visibility

### Technical Features
- ✓ PostgreSQL database with complete message persistence
- ✓ Role-based WebSocket connection management
- ✓ Type-safe API with Drizzle ORM
- ✓ Responsive design for mobile and desktop
- ✓ Real-time connection status indicators

## Recent Changes

- **July 05, 2025**: Complete architectural transformation
  - Replaced simulated chat rooms with admin dashboard system
  - Implemented PostgreSQL database with persistent message storage
  - Created role-based authentication (admin vs user)
  - Built dedicated admin dashboard with multi-user conversation management
  - Developed user-only interface for private admin communication
  - Added help request functionality and real-time notifications
  - Eliminated simulated users in favor of real user interactions only

## User Preferences

Preferred communication style: Simple, everyday language.