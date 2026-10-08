-- Supabase Database Setup Schema for INA-Edutour Platform

-- 1. Table for Destination & Classroom Discussions / Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_code() PRIMARY KEY,
  dest_id TEXT NOT NULL,
  author TEXT NOT NULL,
  role TEXT NOT NULL,
  text TEXT NOT NULL,
  likes INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table for Student Task Submissions & Lecturer Grading
CREATE TABLE IF NOT EXISTS public.tasks (
  task_id TEXT PRIMARY KEY,
  student_name TEXT DEFAULT 'Student Learner',
  status TEXT NOT NULL DEFAULT 'submitted',
  text TEXT NOT NULL,
  grade INT DEFAULT NULL,
  feedback TEXT DEFAULT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Table for Coordinator Hybrid Readiness Checklists
CREATE TABLE IF NOT EXISTS public.checklists (
  id UUID DEFAULT gen_random_code() PRIMARY KEY,
  phase TEXT NOT NULL,
  item_id TEXT NOT NULL,
  checked BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(phase, item_id)
);

-- Enable Row Level Security (RLS) & Public Read/Write Access Policies
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Public Insert Comments" ON public.comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Comments" ON public.comments FOR UPDATE USING (true);

CREATE POLICY "Public Read Tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Public Insert Tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Tasks" ON public.tasks FOR UPDATE USING (true);

CREATE POLICY "Public Read Checklists" ON public.checklists FOR SELECT USING (true);
CREATE POLICY "Public Insert Checklists" ON public.checklists FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Checklists" ON public.checklists FOR UPDATE USING (true);
