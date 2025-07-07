CREATE TABLE "help_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"room_id" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"sender_username" text NOT NULL,
	"receiver_username" text NOT NULL,
	"message" text NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"is_read" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "online_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"room_id" text NOT NULL,
	"socket_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"is_admin" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
