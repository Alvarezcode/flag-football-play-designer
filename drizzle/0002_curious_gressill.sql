CREATE TABLE `studyLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studyLinks_id` PRIMARY KEY(`id`),
	CONSTRAINT `studyLinks_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `studyLinks_token_unique` UNIQUE(`token`)
);
