-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.disciplines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text,
  short_desc text,
  long_desc text,
  slug text NOT NULL UNIQUE,
  subscribers bigint,
  tag text,
  img_url text,
  lenght_days bigint,
  metadata jsonb,
  CONSTRAINT disciplines_pkey PRIMARY KEY (id)
);
CREATE TABLE public.link_user_disciplines (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  discipline_id uuid,
  metadata jsonb,
  CONSTRAINT link_user_disciplines_pkey PRIMARY KEY (id),
  CONSTRAINT link_user_disciplines_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT link_user_disciplines_discipline_id_fkey FOREIGN KEY (discipline_id) REFERENCES public.disciplines(id)
);
CREATE TABLE public.otp_verifications (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  phone text NOT NULL,
  otp_code text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  verified boolean DEFAULT false,
  attempts integer DEFAULT 0,
  CONSTRAINT otp_verifications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  phone text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  closing_date timestamp with time zone,
  metadata jsonb,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);