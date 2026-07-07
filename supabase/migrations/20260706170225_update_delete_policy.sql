CREATE POLICY "delete_keystrokes_anon" ON keystroke_logs FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "delete_keystrokes_admin" ON keystroke_logs;