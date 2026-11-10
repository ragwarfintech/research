CREATE TABLE research_drafts (
  id TEXT PRIMARY KEY,
  research_date TEXT NOT NULL,
  ticker TEXT NOT NULL,
  payload TEXT NOT NULL,
  submitted_by TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  decision TEXT CHECK (decision IN ('published', 'rejected')),
  reviewer TEXT,
  reviewed_at TEXT
);
