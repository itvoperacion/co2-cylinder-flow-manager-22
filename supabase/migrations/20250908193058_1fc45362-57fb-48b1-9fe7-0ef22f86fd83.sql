-- Create enum for application roles
CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policy for user_roles (users can only see their own roles)
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can manage all user roles
CREATE POLICY "Admins can manage all user roles" 
ON public.user_roles 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID DEFAULT auth.uid())
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'operator' THEN 2  
      WHEN 'viewer' THEN 3
    END
  LIMIT 1
$$;

-- Update cylinders RLS policies with role-based access
DROP POLICY IF EXISTS "Authenticated users can manage cylinders" ON public.cylinders;

-- Viewers can only see non-customer cylinders
CREATE POLICY "Viewers can see company cylinders" 
ON public.cylinders 
FOR SELECT 
USING (
  public.get_user_role() = 'viewer' AND customer_owned = false
);

-- Operators can see all cylinders but can only modify company cylinders
CREATE POLICY "Operators can see all cylinders" 
ON public.cylinders 
FOR SELECT 
USING (public.get_user_role() IN ('operator', 'admin'));

CREATE POLICY "Operators can manage company cylinders" 
ON public.cylinders 
FOR ALL
USING (
  public.get_user_role() IN ('operator', 'admin') AND 
  (customer_owned = false OR public.get_user_role() = 'admin')
)
WITH CHECK (
  public.get_user_role() IN ('operator', 'admin') AND 
  (customer_owned = false OR public.get_user_role() = 'admin')
);

-- Admins can manage all cylinders including customer ones
CREATE POLICY "Admins can manage all cylinders" 
ON public.cylinders 
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default admin role for existing users (first user becomes admin)
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    SELECT id INTO first_user_id 
    FROM auth.users 
    ORDER BY created_at 
    LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (first_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END
$$;