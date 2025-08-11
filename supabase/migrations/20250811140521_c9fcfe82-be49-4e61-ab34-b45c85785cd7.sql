-- Add customer_owned field to cylinders table
ALTER TABLE public.cylinders 
ADD COLUMN customer_owned BOOLEAN NOT NULL DEFAULT false;

-- Add customer_info field for customer-owned cylinders
ALTER TABLE public.cylinders 
ADD COLUMN customer_info TEXT;