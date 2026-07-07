CREATE TABLE keystroke_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  key_text TEXT NOT NULL,
  key_code INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  page_url TEXT,
  user_agent TEXT
);

ALTER TABLE keystroke_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert_keystrokes" ON keystroke_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "select_keystrokes_admin" ON keystroke_logs FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "delete_keystrokes_admin" ON keystroke_logs FOR DELETE
  TO authenticated USING (true);

CREATE INDEX idx_keystroke_session ON keystroke_logs(session_id);
CREATE INDEX idx_keystroke_timestamp ON keystroke_logs(timestamp DESC);