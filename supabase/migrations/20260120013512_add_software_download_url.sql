-- Add download_url column to software table
ALTER TABLE software ADD COLUMN IF NOT EXISTS download_url TEXT;

-- Add comment to the column
COMMENT ON COLUMN software.download_url IS 'Optional download URL for the software product';
