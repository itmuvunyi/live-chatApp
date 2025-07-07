# LiveChat Admin Dashboard - Local Setup Guide

## Prerequisites

Before you start, make sure you have these installed on your computer:

1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **Git**
   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

3. **VS Code**
   - Download from: https://code.visualstudio.com/

## Step 1: Download the Code

### Option A: Download ZIP (Easiest)
1. On this Replit page, click the three dots menu (⋯) in the top right
2. Select "Download as ZIP"
3. Extract the ZIP file to your desired folder
4. Open the folder in VS Code

### Option B: Clone from Git (If available)
```bash
git clone <repository-url>
cd <project-folder>
code .
```

## Step 2: Install Dependencies

Open terminal in VS Code (Terminal → New Terminal) and run:

```bash
npm install
```

This will install all required packages including:
- React, Express, TypeScript
- Database tools (Drizzle ORM)
- UI components (Radix, Tailwind CSS)
- WebSocket support

## Step 3: Database Setup

You'll need a PostgreSQL database. You have several options:

### Option A: Use Neon Database (Recommended - Free)
1. Go to https://neon.tech/
2. Create a free account
3. Create a new database
4. Copy the connection string

### Option B: Use Local PostgreSQL
1. Install PostgreSQL locally
2. Create a database
3. Note your connection details

### Option C: Use Docker
```bash
docker run --name postgres-chat -e POSTGRES_PASSWORD=password -e POSTGRES_DB=chatdb -p 5432:5432 -d postgres
```

## Step 4: Environment Configuration

Create a `.env` file in the project root:

```env
DATABASE_URL=your_postgresql_connection_string_here
NODE_ENV=development
```

Replace `your_postgresql_connection_string_here` with your actual database URL.

Example for Neon:
```env
DATABASE_URL=postgresql://username:password@host.neon.tech/dbname?sslmode=require
```

Example for local PostgreSQL:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/chatdb
```

## Step 5: Database Schema Setup

Run the database migration:

```bash
npm run db:push
```

This creates all necessary tables (users, messages, online_users, help_requests).

## Step 6: Start the Application

```bash
npm run dev
```

The application will start on http://localhost:5000

## Step 7: Test the Application

1. Open your browser to http://localhost:5000
2. You should see the login page
3. Try logging in as:
   - **Admin**: Choose "Join as Admin" 
   - **User**: Choose "Join as User" and enter any username

## Project Structure

```
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Main pages (login, admin, user chat)
│   │   └── lib/          # Utilities and query client
├── server/               # Express backend
│   ├── index.ts          # Main server file
│   ├── routes.ts         # API routes and WebSocket
│   ├── storage.ts        # Database operations
│   └── db.ts            # Database connection
├── shared/               # Shared types and schemas
└── package.json          # Dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Update database schema

## Features

- **Admin Dashboard**: View all user conversations, manage multiple chats
- **User Chat**: Private messaging with admin
- **Real-time Communication**: WebSocket-based messaging
- **Message Persistence**: All messages saved to database
- **Read/Unread Tracking**: Visual indicators for message status
- **Typing Indicators**: See when someone is typing
- **Help Requests**: Users can send help requests to admin

## Troubleshooting

### Database Connection Issues
- Verify your DATABASE_URL is correct
- Check if your database is running
- Ensure firewall allows database connections

### Port Already in Use
- The app uses port 5000 by default
- If port 5000 is busy, you can change it in `server/index.ts`

### Missing Dependencies
- Delete `node_modules` folder and `package-lock.json`
- Run `npm install` again

### VS Code Extensions (Recommended)
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- TypeScript Importer
- Prettier - Code formatter

## Development Tips

- The frontend runs on Vite with hot reload
- Backend uses TypeScript with automatic restart
- Database changes require `npm run db:push`
- All WebSocket connections go through `/ws` endpoint
- Admin dashboard shows all user conversations
- Users can only chat with admin (no user-to-user chat)

## Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Check the terminal for server errors
3. Verify your database connection
4. Make sure all dependencies are installed

The application should work exactly the same as it does on Replit!