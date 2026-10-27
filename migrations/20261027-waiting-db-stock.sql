-- Operator-confirmed 20 real customers awaiting registration; no customer records are fabricated.
CREATE TABLE IF NOT EXISTS lead_waiting_batches (
  id TEXT PRIMARY KEY,
  initial_quantity INTEGER NOT NULL CHECK(initial_quantity >= 0),
  remaining INTEGER NOT NULL CHECK(remaining >= 0 AND remaining <= initial_quantity),
  created_at TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS consume_waiting_lead_on_registration
AFTER INSERT ON assigned_leads BEGIN
  UPDATE lead_waiting_batches SET remaining = remaining - 1
  WHERE id = (SELECT id FROM lead_waiting_batches WHERE remaining > 0 ORDER BY created_at, id LIMIT 1);
END;
INSERT OR IGNORE INTO lead_waiting_batches(id, initial_quantity, remaining, created_at)
VALUES('operator-confirmed-20261027', 20, 20, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
