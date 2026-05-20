-- Create the verification-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload their own verification documents
CREATE POLICY "Allow authenticated users to upload verification documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'verification-documents' AND auth.uid() = owner );

-- Policy to allow users to read their own documents (if needed, but mostly for backend)
CREATE POLICY "Allow users to read their own verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING ( bucket_id = 'verification-documents' AND auth.uid() = owner );

-- Policy to allow anonymous uploads to temp folder for before-signup verification
CREATE POLICY "Allow anonymous uploads to temp folder"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK ( bucket_id = 'verification-documents' AND (name LIKE 'temp/%' ));

-- Policy to allow everyone to read from the temp folder (needed for Edge Function context if not using service key)
CREATE POLICY "Allow everyone to read from temp folder"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING ( bucket_id = 'verification-documents' AND (name LIKE 'temp/%' ));
