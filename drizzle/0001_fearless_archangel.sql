CREATE TABLE `team_rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`tokens` text NOT NULL,
	`state` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
