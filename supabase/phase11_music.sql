-- ==========================================
-- Noesis Phase 11: Admin Music Management
-- ==========================================

-- 1. Create the music_tracks table
CREATE TABLE IF NOT EXISTS public.music_tracks (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    url TEXT NOT NULL,
    thumb TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Setup Row Level Security (RLS) for music_tracks
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

-- Allow public read access to music tracks
CREATE POLICY "Public profiles can view music tracks"
    ON public.music_tracks
    FOR SELECT
    USING (true);

-- Allow authenticated admins to insert/update/delete tracks
CREATE POLICY "Admins can manage music tracks"
    ON public.music_tracks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND is_admin = true
        )
    );

-- 3. Create the 'music' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('music', 'music', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Setup Storage RLS for the 'music' bucket
-- Allow public to read/download from the music bucket
CREATE POLICY "Public Read Access Music"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'music');

-- Allow authenticated admins to upload/delete from the music bucket
CREATE POLICY "Admin Upload Access Music"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'music' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "Admin Delete Access Music"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'music' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND is_admin = true
        )
    );
