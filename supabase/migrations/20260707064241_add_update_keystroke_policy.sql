-- Add update policy for keystroke_logs
CREATE POLICY "update_keystrokes" ON keystroke_logs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);