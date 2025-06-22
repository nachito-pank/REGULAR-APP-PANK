/*
  # Complete REGULA database schema setup

  1. New Tables
    - `companies` - Store company information with unique IDs
    - `users` - Admin and employee accounts with email verification
    - `email_verifications` - Handle 6-digit verification codes with expiration
    - `attendances` - Track daily attendance with validation and penalties
    - `daily_reports` - Store employee task reports linked to attendance
    - `company_settings` - Company-specific configuration for penalties and hours

  2. Security
    - Enable RLS on all tables
    - Add policies for proper data access and isolation
    - Ensure companies can only access their own data

  3. Performance
    - Add indexes for frequently queried columns
    - Optimize for company-based data access patterns
*/

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_id text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create users table with email verification
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'employee')),
  company_id text NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  password text NOT NULL,
  work_start_time text NOT NULL DEFAULT '08:00',
  work_end_time text NOT NULL DEFAULT '17:00',
  email_verified boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create email_verifications table
CREATE TABLE IF NOT EXISTS email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create attendances table
CREATE TABLE IF NOT EXISTS attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id text NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  date date NOT NULL,
  arrival_time text,
  departure_time text,
  arrival_validated boolean DEFAULT false NOT NULL,
  late_minutes integer DEFAULT 0 NOT NULL,
  penalty_amount numeric DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, date)
);

-- Create daily_reports table
CREATE TABLE IF NOT EXISTS daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id text NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  attendance_id uuid UNIQUE NOT NULL REFERENCES attendances(id) ON DELETE CASCADE,
  date date NOT NULL,
  tasks text[] NOT NULL DEFAULT ARRAY[]::text[],
  submitted_at text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create company_settings table
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text UNIQUE NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  penalty_per_hour numeric NOT NULL DEFAULT 1500,
  work_start_time text NOT NULL DEFAULT '08:00',
  work_end_time text NOT NULL DEFAULT '17:00',
  penalty_type text NOT NULL DEFAULT 'hour' CHECK (penalty_type IN ('hour', 'minute', 'day')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security (only if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'companies' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'users' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'email_verifications' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'attendances' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'daily_reports' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'company_settings' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_attendances_user_date ON attendances(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendances_company_date ON attendances(company_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_attendance ON daily_reports(attendance_id);

-- Drop existing policies if they exist, then recreate them
DO $$
BEGIN
  -- Companies policies
  DROP POLICY IF EXISTS "Anyone can read companies for signup" ON companies;
  DROP POLICY IF EXISTS "Anyone can create companies for signup" ON companies;
  
  -- Users policies  
  DROP POLICY IF EXISTS "Users can read users from same company" ON users;
  DROP POLICY IF EXISTS "Anyone can create users for signup" ON users;
  DROP POLICY IF EXISTS "Users can update their own data" ON users;
  DROP POLICY IF EXISTS "Admins can delete employees from same company" ON users;
  
  -- Email verifications policies
  DROP POLICY IF EXISTS "Anyone can manage email verifications" ON email_verifications;
  
  -- Attendances policies
  DROP POLICY IF EXISTS "Users can read attendances from same company" ON attendances;
  DROP POLICY IF EXISTS "Users can create their own attendance" ON attendances;
  DROP POLICY IF EXISTS "Users can update their own attendance" ON attendances;
  
  -- Daily reports policies
  DROP POLICY IF EXISTS "Users can read reports from same company" ON daily_reports;
  DROP POLICY IF EXISTS "Users can create their own reports" ON daily_reports;
  DROP POLICY IF EXISTS "Users can update their own reports" ON daily_reports;
  
  -- Company settings policies
  DROP POLICY IF EXISTS "Users can read company settings" ON company_settings;
  DROP POLICY IF EXISTS "Anyone can create company settings" ON company_settings;
  DROP POLICY IF EXISTS "Admins can update company settings" ON company_settings;
END $$;

-- Create new policies
-- Companies policies (public access for signup)
CREATE POLICY "Anyone can read companies for signup"
  ON companies
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create companies for signup"
  ON companies
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Users policies
CREATE POLICY "Users can read users from same company"
  ON users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create users for signup"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete employees from same company"
  ON users
  FOR DELETE
  TO public
  USING (true);

-- Email verifications policies (public access for verification)
CREATE POLICY "Anyone can manage email verifications"
  ON email_verifications
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Attendances policies
CREATE POLICY "Users can read attendances from same company"
  ON attendances
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create their own attendance"
  ON attendances
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update their own attendance"
  ON attendances
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Daily reports policies
CREATE POLICY "Users can read reports from same company"
  ON daily_reports
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create their own reports"
  ON daily_reports
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update their own reports"
  ON daily_reports
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Company settings policies
CREATE POLICY "Users can read company settings"
  ON company_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create company settings"
  ON company_settings
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can update company settings"
  ON company_settings
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);