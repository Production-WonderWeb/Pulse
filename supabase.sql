-- Supabase Schema Setup

-- Create a table for user profiles
CREATE TABLE profiles (
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
CREATE POLICY "Profiles are viewable by authenticated users."
  ON profiles FOR SELECT
  USING ( auth.role() = 'authenticated' );

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile."
  ON profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

-- Allow authenticated users to update profiles (needed for the Admin view role updates)
CREATE POLICY "Authenticated users can update profiles."
  ON profiles FOR UPDATE
  USING ( auth.role() = 'authenticated' );
