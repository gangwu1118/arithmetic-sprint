CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"key_hash" text NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"problems" jsonb NOT NULL,
	"duration_ms" integer NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"attempts" jsonb,
	"solved" integer,
	"mistakes" integer,
	"too_fast" integer,
	"operation_stats" jsonb,
	"input_type" text,
	"local_day" date,
	"time_zone" text,
	"scoring_version" integer
);
--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rounds_player_id_completed_at_idx" ON "rounds" USING btree ("player_id","completed_at");