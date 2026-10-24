-- Zelle now goes to the foundation's email, with a QR code donors can scan.
UPDATE settings SET value = 'AdaCommunityImpact@gmail.com' WHERE key = 'zelle';
INSERT INTO settings (key, value) VALUES ('zelle_qr', '/images/zelle-qr.png')
  ON CONFLICT(key) DO UPDATE SET value = excluded.value;
