ALTER TABLE `campaign_cost_items` ADD `created_by` varchar(36);--> statement-breakpoint
ALTER TABLE `campaign_cost_items` ADD `updated_by` varchar(36);--> statement-breakpoint
ALTER TABLE `campaign_cost_items` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `campaign_revenue_items` ADD `created_by` varchar(36);--> statement-breakpoint
ALTER TABLE `campaign_revenue_items` ADD `updated_by` varchar(36);--> statement-breakpoint
ALTER TABLE `campaign_revenue_items` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `name` varchar(255);--> statement-breakpoint
ALTER TABLE `campaigns` ADD `updated_by` varchar(36);--> statement-breakpoint
ALTER TABLE `campaigns` ADD `is_archived` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `is_deleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `configured_workplans` ADD `created_by` varchar(36);--> statement-breakpoint
ALTER TABLE `configured_workplans` ADD `updated_by` varchar(36);--> statement-breakpoint
ALTER TABLE `support_forms` ADD `updated_by` varchar(36);--> statement-breakpoint
ALTER TABLE `campaign_cost_items` ADD CONSTRAINT `campaign_cost_items_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_cost_items` ADD CONSTRAINT `campaign_cost_items_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_revenue_items` ADD CONSTRAINT `campaign_revenue_items_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_revenue_items` ADD CONSTRAINT `campaign_revenue_items_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `configured_workplans` ADD CONSTRAINT `configured_workplans_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `configured_workplans` ADD CONSTRAINT `configured_workplans_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_forms` ADD CONSTRAINT `support_forms_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;