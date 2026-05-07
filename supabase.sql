-- Supabase Schema Setup

-- Create a table for user profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  email text,
  role text DEFAULT 'Staff',
  display_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read profiles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Profiles are viewable by authenticated users.' AND tablename = 'profiles') THEN
        CREATE POLICY "Profiles are viewable by authenticated users."
          ON profiles FOR SELECT
          USING ( auth.role() = 'authenticated' );
    END IF;
END $$;

-- Allow users to insert their own profile
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own profile.' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can insert their own profile."
          ON profiles FOR INSERT
          WITH CHECK ( auth.uid() = id );
    END IF;
END $$;

-- Allow authenticated users to update profiles (needed for the Admin view role updates)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update profiles.' AND tablename = 'profiles') THEN
        CREATE POLICY "Authenticated users can update profiles."
          ON profiles FOR UPDATE
          USING ( auth.role() = 'authenticated' );
    END IF;
END $$;
