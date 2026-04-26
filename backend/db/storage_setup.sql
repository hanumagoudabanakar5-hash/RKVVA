-- 1. Create the bucket for restaurant documents
-- Run this in the Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public) 
VALUES ('restaurant-docs', 'restaurant-docs', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Clear existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Allow Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Allow Admin Delete" ON storage.objects;

-- 3. Policy: Allow only Admins to upload files
-- We check the 'role' field inside the user_metadata
CREATE POLICY "Allow Admin Upload" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'restaurant-docs' AND 
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
);

-- 4. Policy: Allow anyone to view/download files (Public)
CREATE POLICY "Allow Public Read" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'restaurant-docs');

-- 5. Policy: Allow Admins to delete files
CREATE POLICY "Allow Admin Delete" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'restaurant-docs' AND 
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'Admin'
);
