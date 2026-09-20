ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_source_type_check;
ALTER TABLE public.exercises ADD CONSTRAINT exercises_source_type_check
  CHECK (source_type IN ('manual', 'ai', 'local', 'image', 'pdf', 'web', 'instagram'));

COMMENT ON COLUMN public.exercises.source_images IS
  'Original private Storage attachments: array of {path, name, type}; maximum 5 items.';
