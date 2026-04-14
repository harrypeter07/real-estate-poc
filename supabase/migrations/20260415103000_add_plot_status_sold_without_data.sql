DO $$
BEGIN
	ALTER TYPE plot_status ADD VALUE IF NOT EXISTS 'sold_without_data';
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
