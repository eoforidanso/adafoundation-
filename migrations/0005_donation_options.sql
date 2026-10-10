-- The amount buttons in the Donate section, editable from the dashboard.
-- impact: what the gift pays for; *asterisks* mark words shown in bold.
CREATE TABLE donation_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount INTEGER NOT NULL,
  impact TEXT NOT NULL DEFAULT '',
  is_default INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0
);
INSERT INTO donation_options (amount, impact, is_default, sort) VALUES
  (25, 'can buy *exercise books and pens* for a pupil for a full term.', 0, 1),
  (50, 'can supply *treated bed nets* for a family of five.', 1, 2),
  (100, 'can cover *a term of books, uniform and exam fees* for a student.', 0, 3),
  (250, 'can fund *a health outreach day* on one of the Volta islands.', 0, 4),
  (1000, 'can help *repair a broken water point* so a whole community has clean water again.', 0, 5);
