-- Function to assign a default role to new users or existing users without roles
CREATE OR REPLACE FUNCTION public.ensure_user_has_role(_user_id uuid DEFAULT auth.uid(), _default_role app_role DEFAULT 'operator'::app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY definer
SET search_path = public
AS $$
BEGIN
  -- Insert role if user doesn't have any role yet
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _default_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- If user has no roles at all, give them the default role
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _default_role);
  END IF;
END;
$$;

-- Grant default operator role to current authenticated users who don't have roles
DO $$
DECLARE
  user_record record;
BEGIN
  -- This will only work for users who currently have a session
  -- Others will get roles assigned when they first access the system
  FOR user_record IN 
    SELECT DISTINCT auth.uid() as user_id 
    WHERE auth.uid() IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid()
      )
  LOOP
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (user_record.user_id, 'operator'::app_role)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;