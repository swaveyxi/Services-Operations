CREATE TABLE `associated_costs` (
	`income_id` varchar(36) NOT NULL,
	`cost_id` varchar(36) NOT NULL,
	CONSTRAINT `associated_costs_income_id_cost_id_pk` PRIMARY KEY(`income_id`,`cost_id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_cost_items` (
	`id` varchar(36) NOT NULL,
	`campaign_id` varchar(36) NOT NULL,
	`service_cost_id` varchar(36),
	`service_name` varchar(255) NOT NULL,
	`acct_num` varchar(20),
	`parent_account` varchar(100),
	`quantity` decimal(10,2) NOT NULL,
	`rate` decimal(14,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_cost_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_cci_campaign_acct` UNIQUE(`campaign_id`,`acct_num`)
);
--> statement-breakpoint
CREATE TABLE `campaign_revenue_items` (
	`id` varchar(36) NOT NULL,
	`campaign_id` varchar(36) NOT NULL,
	`service_income_id` varchar(36),
	`service_name` varchar(255) NOT NULL,
	`acct_num` varchar(20),
	`parent_account` varchar(100),
	`quantity` decimal(10,2) NOT NULL,
	`rate` decimal(14,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_revenue_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_cri_campaign_acct` UNIQUE(`campaign_id`,`acct_num`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` varchar(36) NOT NULL,
	`campaign_id` varchar(30) NOT NULL,
	`client_id` varchar(36),
	`owner_user_id` varchar(36) NOT NULL,
	`unit` enum('Recruitment','Scholarships','Testing') NOT NULL,
	`description` text,
	`campaign_status` enum('Draft','Workplan','Profitability','Active','Closed') NOT NULL DEFAULT 'Draft',
	`approval_status` enum('Pending','Approved','Rejected'),
	`approval_note` text,
	`approved_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`),
	CONSTRAINT `campaigns_campaign_id_unique` UNIQUE(`campaign_id`)
);
--> statement-breakpoint
CREATE TABLE `client_contacts` (
	`id` varchar(36) NOT NULL,
	`qb_id` varchar(50),
	`display_name` varchar(255) NOT NULL,
	`company_name` varchar(255),
	`abbreviation` varchar(20),
	`email` varchar(255),
	`phone` varchar(30),
	`created_on` datetime,
	`synced_at` datetime,
	CONSTRAINT `client_contacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_contacts_qb_id_unique` UNIQUE(`qb_id`)
);
--> statement-breakpoint
CREATE TABLE `configured_workplans` (
	`id` varchar(36) NOT NULL,
	`campaign_id` varchar(36) NOT NULL,
	`template_id` varchar(100) NOT NULL,
	`template_name` varchar(255) NOT NULL,
	`status` enum('Draft','Submitted','Accepted','Amended','Pending Review') NOT NULL DEFAULT 'Draft',
	`activities` json NOT NULL DEFAULT ('[]'),
	`ops_start_date` date,
	`ops_end_date` date,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `configured_workplans_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_cw_campaign_template` UNIQUE(`campaign_id`,`template_id`)
);
--> statement-breakpoint
CREATE TABLE `jobs_handoffs` (
	`id` varchar(36) NOT NULL,
	`form_id` varchar(36) NOT NULL,
	`team` varchar(100) NOT NULL,
	`status` enum('Pending','Acknowledged','Completed') NOT NULL DEFAULT 'Pending',
	`sent_by` varchar(255) NOT NULL,
	`sent_at` datetime NOT NULL,
	`auto` tinyint NOT NULL DEFAULT 0,
	`attachment` json,
	`acknowledged_by` varchar(255),
	`acknowledged_at` datetime,
	`completed_by` varchar(255),
	`completed_at` datetime,
	`report` json,
	`reminders_sent` json NOT NULL DEFAULT ('[]'),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_handoffs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `legacy_attachments` (
	`id` varchar(36) NOT NULL,
	`annotation_id` varchar(36) NOT NULL,
	`filename` varchar(255) NOT NULL,
	`mime_type` varchar(255),
	`size_bytes` int,
	`content` longtext NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `legacy_attachments_id` PRIMARY KEY(`id`),
	CONSTRAINT `legacy_attachments_annotation_id_unique` UNIQUE(`annotation_id`)
);
--> statement-breakpoint
CREATE TABLE `ops_team_members` (
	`id` varchar(36) NOT NULL,
	`team_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ops_team_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_team_user` UNIQUE(`team_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `ops_teams` (
	`id` varchar(36) NOT NULL,
	`team_key` varchar(50) NOT NULL,
	`team_name` varchar(100) NOT NULL,
	`group_email` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ops_teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `ops_teams_team_key_unique` UNIQUE(`team_key`)
);
--> statement-breakpoint
CREATE TABLE `parent_accounts` (
	`id` varchar(36) NOT NULL,
	`qb_id` varchar(50),
	`account_number` varchar(20) NOT NULL,
	`account_name` varchar(255) NOT NULL,
	`account_type` varchar(50) NOT NULL,
	`service_type` varchar(50),
	CONSTRAINT `parent_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `parent_accounts_qb_id_unique` UNIQUE(`qb_id`),
	CONSTRAINT `parent_accounts_account_number_unique` UNIQUE(`account_number`)
);
--> statement-breakpoint
CREATE TABLE `qb_tokens` (
	`id` int NOT NULL DEFAULT 1,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	`last_polled_at` datetime,
	CONSTRAINT `qb_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_costs` (
	`id` varchar(36) NOT NULL,
	`qb_id` varchar(50),
	`acct_num` varchar(20) NOT NULL,
	`unit` enum('Recruitment','Scholarships','Testing') NOT NULL,
	`sub_category` varchar(50),
	`service` varchar(255) NOT NULL,
	`parent_account` varchar(100),
	`synced_at` datetime,
	CONSTRAINT `service_costs_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_costs_qb_id_unique` UNIQUE(`qb_id`),
	CONSTRAINT `service_costs_acct_num_unique` UNIQUE(`acct_num`)
);
--> statement-breakpoint
CREATE TABLE `service_incomes` (
	`id` varchar(36) NOT NULL,
	`qb_id` varchar(50),
	`acct_num` varchar(20) NOT NULL,
	`unit` enum('Recruitment','Scholarships','Testing') NOT NULL,
	`service` varchar(255) NOT NULL,
	`parent_account` varchar(100),
	`synced_at` datetime,
	CONSTRAINT `service_incomes_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_incomes_qb_id_unique` UNIQUE(`qb_id`),
	CONSTRAINT `service_incomes_acct_num_unique` UNIQUE(`acct_num`)
);
--> statement-breakpoint
CREATE TABLE `support_forms` (
	`id` varchar(36) NOT NULL,
	`campaign_id` varchar(36) NOT NULL,
	`submitter_user_id` varchar(36),
	`form_type` varchar(100) NOT NULL,
	`form_details` json NOT NULL DEFAULT ('{}'),
	`delivery_status` enum('Submitted','Delivered','Acknowledged','Completed') NOT NULL DEFAULT 'Submitted',
	`operations_team` varchar(50) NOT NULL,
	`submitted_on` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `support_forms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` varchar(36) NOT NULL,
	`type` varchar(10) NOT NULL,
	`name` varchar(255),
	`url` text NOT NULL,
	`cloudinary_public_id` varchar(255),
	`cloudinary_resource_type` varchar(50),
	`uploaded_by` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`roles` json NOT NULL DEFAULT ('[]'),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `workplan_templates` (
	`id` varchar(36) NOT NULL,
	`template_id` varchar(100) NOT NULL,
	`template_name` varchar(255) NOT NULL,
	`activity_name` varchar(255) NOT NULL,
	`unit` enum('Recruitment','Scholarships','Testing'),
	`duration_days` int,
	CONSTRAINT `workplan_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `associated_costs` ADD CONSTRAINT `associated_costs_income_id_service_incomes_id_fk` FOREIGN KEY (`income_id`) REFERENCES `service_incomes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `associated_costs` ADD CONSTRAINT `associated_costs_cost_id_service_costs_id_fk` FOREIGN KEY (`cost_id`) REFERENCES `service_costs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_cost_items` ADD CONSTRAINT `campaign_cost_items_campaign_id_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_cost_items` ADD CONSTRAINT `campaign_cost_items_service_cost_id_service_costs_id_fk` FOREIGN KEY (`service_cost_id`) REFERENCES `service_costs`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_revenue_items` ADD CONSTRAINT `campaign_revenue_items_campaign_id_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_revenue_items` ADD CONSTRAINT `campaign_revenue_items_service_income_id_service_incomes_id_fk` FOREIGN KEY (`service_income_id`) REFERENCES `service_incomes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_client_id_client_contacts_id_fk` FOREIGN KEY (`client_id`) REFERENCES `client_contacts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_owner_user_id_users_id_fk` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `configured_workplans` ADD CONSTRAINT `configured_workplans_campaign_id_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jobs_handoffs` ADD CONSTRAINT `jobs_handoffs_form_id_support_forms_id_fk` FOREIGN KEY (`form_id`) REFERENCES `support_forms`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ops_team_members` ADD CONSTRAINT `ops_team_members_team_id_ops_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `ops_teams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ops_team_members` ADD CONSTRAINT `ops_team_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_forms` ADD CONSTRAINT `support_forms_campaign_id_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_forms` ADD CONSTRAINT `support_forms_submitter_user_id_users_id_fk` FOREIGN KEY (`submitter_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uploads` ADD CONSTRAINT `uploads_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_cci_campaign` ON `campaign_cost_items` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `idx_cri_campaign` ON `campaign_revenue_items` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `idx_c_owner_status` ON `campaigns` (`owner_user_id`,`campaign_status`);--> statement-breakpoint
CREATE INDEX `idx_cw_campaign` ON `configured_workplans` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `idx_fho_form` ON `jobs_handoffs` (`form_id`);--> statement-breakpoint
CREATE INDEX `idx_fho_team_status` ON `jobs_handoffs` (`team`,`status`);--> statement-breakpoint
CREATE INDEX `idx_sc_unit_sub` ON `service_costs` (`unit`,`sub_category`);--> statement-breakpoint
CREATE INDEX `idx_si_unit` ON `service_incomes` (`unit`);--> statement-breakpoint
CREATE INDEX `idx_sf_ops_team` ON `support_forms` (`operations_team`,`delivery_status`);--> statement-breakpoint
CREATE INDEX `idx_sf_campaign` ON `support_forms` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `idx_wt_template` ON `workplan_templates` (`template_id`,`unit`);