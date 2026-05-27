-- Migration: Add property type column to plots table
ALTER TABLE plots ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'plot';
