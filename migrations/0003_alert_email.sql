-- Where volunteer sign-up alerts are sent. Editable under Site details.
INSERT INTO settings (key, value) VALUES ('alert_email', 'ACIF.org@gmail.com')
  ON CONFLICT(key) DO NOTHING;
