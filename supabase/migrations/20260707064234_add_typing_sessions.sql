-- Create typing_sessions table to group keystrokes
CREATE TABLE typing_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  key_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE typing_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert_typing_sessions" ON typing_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "select_typing_sessions" ON typing_sessions FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "update_typing_sessions" ON typing_sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Update keystroke_logs to link to typing sessions
ALTER TABLE keystroke_logs ADD COLUMN IF NOT EXISTS typing_session_id UUID REFERENCES typing_sessions(id);
ALTER TABLE keystroke_logs ADD COLUMN IF NOT EXISTS device_id TEXT;

-- Create indexes for performance
CREATE INDEX idx_typing_sessions_device ON typing_sessions(device_id);
CREATE INDEX idx_typing_sessions_start ON typing_sessions(session_start DESC);
CREATE INDEX idx_keystroke_device ON keystroke_logs(device_id);
CREATE INDEX idx_keystroke_typing_session ON keystroke_logs(typing_session_id);