-- Drop the old select policy
DROP POLICY IF EXISTS "select_keystrokes_admin" ON keystroke_logs;

-- Create new select policy allowing anon to read
CREATE POLICY "select_keystrokes" ON keystroke_logs FOR SELECT
  TO anon, authenticated USING (true);