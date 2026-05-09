-- Password Reset Tokens
-- Run this in your Neon SQL editor

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour'),
  used_at     TIMESTAMPTZ,                   -- NULL = unused; set when consumed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_prt_token ON password_reset_tokens(token);

-- Clean up expired/used tokens automatically (optional but nice)
-- You can run this manually or as a scheduled job
-- DELETE FROM password_reset_tokens WHERE expires_at < now() OR used_at IS NOT NULL;
