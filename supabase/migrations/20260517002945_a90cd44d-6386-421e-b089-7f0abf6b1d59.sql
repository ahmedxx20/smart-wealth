CREATE TABLE IF NOT EXISTS public.deposit_address_rotation (
  id int PRIMARY KEY DEFAULT 1,
  addresses text[] NOT NULL DEFAULT ARRAY[
    'TJjmjkFEGXCNueYr7MR8bvtoqQJmaGHy6w',
    'TEqqyTMzxiMbngRmq9vaUdVswSv1nbyBwk',
    'TMVS4qvye4Bc9K2BSG9L9DtDuUkvoQk98R',
    'TZ6wSKz291JFnLc7BoVMR7gA7dxvNta2WE'
  ],
  current_index int NOT NULL DEFAULT 0,
  rotated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.deposit_address_rotation (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.deposit_address_rotation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone authenticated can read rotation"
ON public.deposit_address_rotation FOR SELECT
TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.get_current_deposit_address()
RETURNS TABLE(address text, rotates_in_seconds int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; elapsed int; idx int;
BEGIN
  SELECT * INTO r FROM public.deposit_address_rotation WHERE id = 1 FOR UPDATE;
  elapsed := EXTRACT(EPOCH FROM (now() - r.rotated_at))::int;
  IF elapsed >= 300 THEN
    idx := (r.current_index + (elapsed / 300)) % array_length(r.addresses, 1);
    UPDATE public.deposit_address_rotation
      SET current_index = idx, rotated_at = now()
      WHERE id = 1;
    r.current_index := idx;
    elapsed := 0;
  END IF;
  RETURN QUERY SELECT r.addresses[r.current_index + 1], (300 - elapsed);
END;$$;