CREATE TABLE `plays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`formation` varchar(120) NOT NULL DEFAULT '',
	`playType` enum('run','pass') NOT NULL,
	`notes` text NOT NULL,
	`diagram` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plays_id` PRIMARY KEY(`id`)
);
