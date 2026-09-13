ALTER TABLE `campaigns` ADD `atlas_campaign_id` varchar(30);--> statement-breakpoint
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_atlas_campaign_id_unique` UNIQUE(`atlas_campaign_id`);