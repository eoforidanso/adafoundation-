-- Completed projects, shown in the "Completed projects" section of the home page.
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  completed_on TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Other',
  impact TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL DEFAULT '',
  focus_x INTEGER NOT NULL DEFAULT 50,
  focus_y INTEGER NOT NULL DEFAULT 50,
  zoom INTEGER NOT NULL DEFAULT 100,
  published INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);

-- Extra photos for a project, shown when someone opens the full story.
CREATE TABLE project_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  src TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX project_photos_project ON project_photos (project_id, sort);
