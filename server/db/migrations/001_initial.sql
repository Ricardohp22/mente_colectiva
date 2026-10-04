CREATE TABLE players (
  external_id text PRIMARY KEY,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE lives (
  id text PRIMARY KEY,
  state text NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_limit_seconds integer NOT NULL
);

CREATE TABLE questions (
  id text PRIMARY KEY,
  category text NOT NULL,
  type text NOT NULL,
  presentation text NOT NULL,
  difficulty integer NOT NULL,
  prompt text NOT NULL,
  value integer NOT NULL,
  initial_time_seconds integer NOT NULL,
  answer_kind text NOT NULL,
  nightmare_question_id text REFERENCES questions (id)
);

CREATE TABLE question_answers (
  question_id text NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
  position integer NOT NULL,
  answer text NOT NULL,
  PRIMARY KEY (question_id, position)
);

CREATE TABLE question_hints (
  question_id text NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
  position integer NOT NULL,
  body text NOT NULL,
  PRIMARY KEY (question_id, position)
);

CREATE TABLE question_instances (
  live_id text NOT NULL REFERENCES lives (id),
  id text NOT NULL,
  question_id text NOT NULL REFERENCES questions (id),
  opened_at timestamptz NOT NULL,
  closed_at timestamptz,
  value integer NOT NULL,
  initial_time_seconds integer NOT NULL,
  PRIMARY KEY (live_id, id)
);

CREATE TABLE answers (
  live_id text NOT NULL,
  id text NOT NULL,
  instance_id text NOT NULL,
  player_external_id text NOT NULL REFERENCES players (external_id),
  raw_answer text NOT NULL,
  normalized_answer text NOT NULL,
  received_at timestamptz NOT NULL,
  response_time_ms integer NOT NULL,
  valid boolean NOT NULL,
  PRIMARY KEY (live_id, id),
  FOREIGN KEY (live_id, instance_id) REFERENCES question_instances (live_id, id)
);

CREATE TABLE live_scores (
  live_id text NOT NULL REFERENCES lives (id),
  player_external_id text NOT NULL REFERENCES players (external_id),
  points integer NOT NULL,
  PRIMARY KEY (live_id, player_external_id)
);

CREATE TABLE events (
  live_id text NOT NULL REFERENCES lives (id),
  id text NOT NULL,
  instance_id text,
  player_external_id text,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (live_id, id)
);
