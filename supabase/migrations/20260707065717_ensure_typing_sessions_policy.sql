-- Add insert policy for typing_sessions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'typing_sessions' AND policyname = 'insert_typing_sessions'
  ) THEN
    CREATE POLICY "insert_typing_sessions" ON typing_sessions FOR INSERT
      TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;