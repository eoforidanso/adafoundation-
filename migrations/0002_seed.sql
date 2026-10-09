-- Starting content: what the site showed before the dashboard existed.
INSERT INTO directors (name, title, sort) VALUES
  ('Frank Quarshie', 'Director', 1),
  ('Loreen Quarshie', 'Director', 2),
  ('Abena Sasu', 'Director', 3),
  ('Linda Quarshie', 'Director', 4),
  ('Jason Herrington', 'Director', 5),
  ('Duke Quarshie', 'Director', 6),
  ('Noah Gblekpo', 'Director', 7),
  ('Vivian Acheampong', 'Director', 8);

INSERT INTO photos (src, caption, alt, credit, credit_url, placement, sort) VALUES
  ('/images/hero-canoes.jpg', 'Canoes on the Volta estuary', 'Brightly painted fishing canoes moored along the palm-lined shore of the Volta estuary at Ada Foah', 'Philip Nalangan, CC BY 4.0, via Wikimedia Commons (resized)', 'https://commons.wikimedia.org/wiki/File:Ada_Foah_Beach_2.jpg', 'hero', 0),
  ('/images/salt-gathering.jpg', 'Salt winning on the Songor Lagoon', 'A woman in a headwrap bends to gather salt beside a thatched salt mound on the Songor Lagoon', 'Els Holmes, CC BY-SA 4.0, via Wikimedia Commons (resized)', 'https://commons.wikimedia.org/wiki/File:Salt_gathering_by_an_Old_Lady_at_Songhor_Lagoon.jpg', 'gallery', 1),
  ('/images/salt-mounds.jpg', 'Salt mounds waiting for harvest', 'Rows of thatched salt mounds waiting to be harvested on the Songor Lagoon', 'Els Holmes, CC BY-SA 4.0, via Wikimedia Commons (resized)', 'https://commons.wikimedia.org/wiki/File:Salt_huts_yet_to_be_harvested_on_the_Songhor_Lagoon,_Ada_Ghana.jpg', 'gallery', 2),
  ('/images/volta-sunset.jpg', 'Evening on the Lower Volta', 'A woman carrying a basin on her head, silhouetted against the sunset over the Lower Volta', 'Laila Seidu, CC BY-SA 4.0, via Wikimedia Commons (resized)', 'https://commons.wikimedia.org/wiki/File:Enjoying_the_view_as_the_sun_sets_on_the_River_Volta.jpg', 'gallery', 3);

INSERT INTO goals (value, label, kind, sort) VALUES
  ('500', 'students on scholarship', 'target', 1),
  ('40', 'community health days a year', 'target', 2),
  ('25', 'boreholes drilled or restored', 'target', 3),
  ('50k', 'mangrove seedlings planted', 'target', 4);

INSERT INTO settings (key, value) VALUES
  ('headline', 'Building *brighter futures* for families in Ada.'),
  ('lede', 'Ada Community Impact Foundation works alongside the fishing, farming and salt-winning families of Ada to open doors in education, health, clean water and fair livelihoods, and to protect the coast that sustains us.'),
  ('phone', '773-329-3016'),
  ('zelle', '773-329-3016'),
  ('email', 'ACIF.org@gmail.com'),
  ('city', 'Chicago, Illinois');
