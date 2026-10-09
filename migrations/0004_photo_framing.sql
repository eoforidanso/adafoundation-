-- How each photo is framed: the point to keep in view (0-100 %) and zoom (100 = fit).
ALTER TABLE photos ADD COLUMN focus_x INTEGER NOT NULL DEFAULT 50;
ALTER TABLE photos ADD COLUMN focus_y INTEGER NOT NULL DEFAULT 50;
ALTER TABLE photos ADD COLUMN zoom INTEGER NOT NULL DEFAULT 100;
ALTER TABLE directors ADD COLUMN focus_x INTEGER NOT NULL DEFAULT 50;
ALTER TABLE directors ADD COLUMN focus_y INTEGER NOT NULL DEFAULT 50;
ALTER TABLE directors ADD COLUMN zoom INTEGER NOT NULL DEFAULT 100;
-- The canoe banner was already shown slightly below centre.
UPDATE photos SET focus_y = 62 WHERE src = '/images/hero-canoes.jpg';
