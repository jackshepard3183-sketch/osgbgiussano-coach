-- Incremental migration for the existing OSGB Coach exercises table.
-- The owner-based exercises and private Storage policies remain unchanged.
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS source_images jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_source_type_check;
ALTER TABLE public.exercises ADD CONSTRAINT exercises_source_type_check
  CHECK (source_type IN ('manual', 'ai', 'local', 'image', 'web', 'instagram'));

ALTER TABLE public.exercises ADD CONSTRAINT exercises_source_images_check
  CHECK (jsonb_typeof(source_images) = 'array' AND jsonb_array_length(source_images) <= 5);

COMMENT ON COLUMN public.exercises.source_images IS
  'Original private Storage images: array of {path, name}; first image is mirrored in source_image_path/source_image_name for compatibility.';
COMMENT ON COLUMN public.exercises.notes IS 'Editable exercise notes, separate from variants and the source transcript.';
