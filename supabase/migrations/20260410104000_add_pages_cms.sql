/*
  # LOXER Clone - CMS Pages
  Adds a `pages` table to store visual editor output (Puck JSON).
*/

CREATE TABLE IF NOT EXISTS pages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  data          jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at  timestamptz,
  updated_at    timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now(),
  updated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read pages" ON pages;
CREATE POLICY "Anyone can read pages"
  ON pages FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Employers can insert pages" ON pages;
CREATE POLICY "Employers can insert pages"
  ON pages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1
    FROM users_meta um
    WHERE um.id = auth.uid() AND um.role = 'employer'
  ));

DROP POLICY IF EXISTS "Employers can update pages" ON pages;
CREATE POLICY "Employers can update pages"
  ON pages FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM users_meta um
    WHERE um.id = auth.uid() AND um.role = 'employer'
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM users_meta um
    WHERE um.id = auth.uid() AND um.role = 'employer'
  ));

DROP POLICY IF EXISTS "Employers can delete pages" ON pages;
CREATE POLICY "Employers can delete pages"
  ON pages FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM users_meta um
    WHERE um.id = auth.uid() AND um.role = 'employer'
  ));

CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_updated_at ON pages(updated_at DESC);
