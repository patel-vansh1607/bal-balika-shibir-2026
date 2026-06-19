-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.attendees (
  id text NOT NULL DEFAULT lpad((nextval('attendees_id_seq'::regclass))::text, 4, '0'::text),
  created_at timestamp with time zone DEFAULT now(),
  name text NOT NULL,
  age integer NOT NULL,
  center text NOT NULL,
  parent_contact text,
  status text DEFAULT 'Pending'::text,
  photo_url text,
  qr_code_url text,
  gender character varying NOT NULL DEFAULT 'Balak'::character varying CHECK (gender::text = ANY (ARRAY['Balak'::text, 'Balika'::text, 'Shishu'::text, 'Shishika'::text])),
  region text,
  member_id text UNIQUE,
  parent_email text,
  is_archived boolean DEFAULT false,
  CONSTRAINT attendees_pkey PRIMARY KEY (id)
);
CREATE TABLE public.gate_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  scanned_id text NOT NULL,
  status text NOT NULL,
  message text NOT NULL,
  operator_email text NOT NULL,
  attendee_name text,
  operator_name text,
  CONSTRAINT gate_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  member_id text,
  checked_in_at timestamp with time zone DEFAULT now(),
  checked_by uuid,
  status text DEFAULT 'present'::text,
  CONSTRAINT attendance_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.attendees(id),
  CONSTRAINT attendance_checked_by_fkey FOREIGN KEY (checked_by) REFERENCES auth.users(id)
);
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text DEFAULT 'operator'::text CHECK (role = ANY (ARRAY['master_admin'::text, 'super_admin'::text, 'admin'::text, 'operator'::text])),
  updated_at timestamp with time zone DEFAULT now(),
  name text,
  region text NOT NULL DEFAULT 'Kenya'::text CHECK (region = ANY (ARRAY['All'::text, 'Kenya'::text, 'Tanzania'::text, 'Uganda'::text, 'Zambia'::text, 'Malawi'::text, 'Botswana'::text, 'South Africa'::text])),
  authorized_regions ARRAY DEFAULT '{}'::text[],
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT fk_user_id FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  speaker text,
  location text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.session_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid,
  attendee_id text,
  status text DEFAULT 'absent'::text CHECK (status = ANY (ARRAY['present'::text, 'absent'::text])),
  scanned_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT session_logs_pkey PRIMARY KEY (id),
  CONSTRAINT session_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT session_logs_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES public.attendees(id)
);