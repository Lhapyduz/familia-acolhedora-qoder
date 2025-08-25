-- Supabase Schema for Foster Family Management Application
-- This file contains all the necessary tables and relationships for the application to work

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create users table
create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text not null,
  role text check (role in ('coordinator', 'technician')) not null,
  permissions text[] not null default '{}',
  is_active boolean default true,
  last_login timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create families table
create table families (
  id uuid primary key default uuid_generate_v4(),
  primary_contact jsonb not null,
  address jsonb not null,
  composition jsonb[] not null default '{}',
  status text check (status in ('available', 'unavailable', 'under_evaluation', 'active_placement')) not null default 'under_evaluation',
  preferences jsonb not null,
  limitations text[] not null default '{}',
  history jsonb[] not null default '{}',
  documents jsonb[] not null default '{}',
  evaluations jsonb[] not null default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create children table
create table children (
  id uuid primary key default uuid_generate_v4(),
  personal_info jsonb not null,
  current_status text check (current_status in ('awaiting', 'evaluating', 'available', 'in_placement', 'unavailable', 'reunified', 'adopted')) not null default 'awaiting',
  special_needs jsonb not null,
  family_background jsonb not null,
  legal_status jsonb not null,
  current_placement jsonb,
  documents jsonb[] not null default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create placements table
create table placements (
  id uuid primary key default uuid_generate_v4(),
  child_id uuid references children(id) on delete cascade,
  family_id uuid references families(id) on delete cascade,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone,
  status text check (status in ('active', 'completed', 'interrupted', 'transferred')) not null default 'active',
  approximation_process jsonb not null,
  reports jsonb[] not null default '{}',
  visits jsonb[] not null default '{}',
  budget jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create budget table
create table budget (
  id uuid primary key default uuid_generate_v4(),
  fiscal_year integer not null,
  total_amount numeric not null default 0,
  allocated_amount numeric not null default 0,
  available_amount numeric not null default 0,
  allocations jsonb[] not null default '{}',
  transactions jsonb[] not null default '{}',
  settings jsonb not null default '{
    "minimumWage": 1320,
    "siblingMultiplier": 0.30,
    "specialNeedsMultiplier": 0.50
  }'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create notifications table
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid references users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  priority text check (priority in ('low', 'medium', 'high')) not null default 'medium',
  read boolean default false,
  action_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create documents table
create table documents (
  id uuid primary key default uuid_generate_v4(),
  entity_id uuid not null,
  entity_type text check (entity_type in ('child', 'family', 'placement')) not null,
  file_name text not null,
  file_url text not null,
  file_type text not null,
  uploaded_by uuid references users(id),
  uploaded_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create matchings table
create table matchings (
  id uuid primary key default uuid_generate_v4(),
  child_id uuid references children(id) on delete cascade,
  family_id uuid references families(id) on delete cascade,
  compatibility_score jsonb,
  status text check (status in ('pending', 'approved', 'rejected', 'completed')) not null default 'pending',
  notes text,
  created_by uuid references users(id),
  approved_by uuid references users(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create technical_visits table
create table technical_visits (
  id uuid primary key default uuid_generate_v4(),
  placement_id uuid references placements(id) on delete cascade,
  visit_date timestamp with time zone not null,
  technician_id uuid references users(id),
  purpose text not null,
  observations text,
  recommendations jsonb[] not null default '{}',
  follow_up_required boolean default false,
  completed boolean default false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create report_templates table
create table report_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  content text not null,
  created_by uuid references users(id),
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create generated_reports table
create table generated_reports (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references report_templates(id),
  placement_id uuid references placements(id),
  child_id uuid references children(id),
  family_id uuid references families(id),
  generated_by uuid references users(id),
  content text not null,
  file_url text,
  generated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create scheduled_reports table
create table scheduled_reports (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references report_templates(id),
  placement_id uuid references placements(id),
  child_id uuid references children(id),
  family_id uuid references families(id),
  schedule_type text check (schedule_type in ('daily', 'weekly', 'monthly', 'custom')) not null,
  schedule_config jsonb not null,
  next_run timestamp with time zone,
  last_run timestamp with time zone,
  is_active boolean default true,
  created_by uuid references users(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create audit_logs table
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  action text not null,
  resource text not null,
  resource_id text,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default now()
);

-- Create indexes for better performance
create index idx_users_email on users(email);
create index idx_users_role on users(role);
create index idx_families_status on families(status);
create index idx_children_status on children(current_status);
create index idx_placements_child on placements(child_id);
create index idx_placements_family on placements(family_id);
create index idx_placements_status on placements(status);
create index idx_notifications_recipient on notifications(recipient_id);
create index idx_notifications_read on notifications(read);
create index idx_documents_entity on documents(entity_id, entity_type);
create index idx_matchings_child on matchings(child_id);
create index idx_matchings_family on matchings(family_id);
create index idx_matchings_status on matchings(status);
create index idx_technical_visits_placement on technical_visits(placement_id);
create index idx_technical_visits_technician on technical_visits(technician_id);
create index idx_technical_visits_date on technical_visits(visit_date);
create index idx_scheduled_reports_active on scheduled_reports(is_active);
create index idx_scheduled_reports_next_run on scheduled_reports(next_run);
create index idx_audit_logs_user on audit_logs(user_id);
create index idx_audit_logs_action on audit_logs(action);
create index idx_audit_logs_resource on audit_logs(resource);
create index idx_audit_logs_created_at on audit_logs(created_at);

-- Insert default coordinator user
insert into users (email, name, role, permissions, is_active) values 
('admin@familiacolhedora.gov.br', 'Administrador', 'coordinator', 
  array[
    'families:read', 'families:write', 'families:delete',
    'children:read', 'children:write', 'children:delete',
    'matching:read', 'matching:write',
    'budget:read', 'budget:write',
    'reports:read', 'reports:write',
    'settings:read', 'settings:write',
    'users:read', 'users:write', 'users:delete'
  ], 
  true);

-- Insert default budget settings
insert into budget (fiscal_year, total_amount, allocated_amount, available_amount) values 
(extract(year from now())::integer, 0, 0, 0);

-- Enable Row Level Security (RLS) on all tables
alter table users enable row level security;
alter table families enable row level security;
alter table children enable row level security;
alter table placements enable row level security;
alter table budget enable row level security;
alter table notifications enable row level security;
alter table documents enable row level security;
alter table matchings enable row level security;
alter table technical_visits enable row level security;
alter table report_templates enable row level security;
alter table generated_reports enable row level security;
alter table scheduled_reports enable row level security;
alter table audit_logs enable row level security;

-- Create policies for users table
create policy "Users can view their own profile" on users
  for select using (id = auth.uid() or role = 'coordinator');

create policy "Coordinators can manage users" on users
  for all using (role = 'coordinator');

-- Create policies for families table
create policy "Users can view families" on families
  for select using (true);

create policy "Technicians can create families" on families
  for insert with check (true);

create policy "Users can update families" on families
  for update using (true);

create policy "Users can delete families" on families
  for delete using (true);

-- Create policies for children table
create policy "Users can view children" on children
  for select using (true);

create policy "Technicians can create children" on children
  for insert with check (true);

create policy "Users can update children" on children
  for update using (true);

create policy "Users can delete children" on children
  for delete using (true);

-- Create policies for placements table
create policy "Users can view placements" on placements
  for select using (true);

create policy "Technicians can create placements" on placements
  for insert with check (true);

create policy "Users can update placements" on placements
  for update using (true);

create policy "Users can delete placements" on placements
  for delete using (true);

-- Create policies for budget table
create policy "Users can view budget" on budget
  for select using (true);

create policy "Coordinators can manage budget" on budget
  for all using (exists (select 1 from users where id = auth.uid() and role = 'coordinator'));

-- Create policies for notifications table
create policy "Users can view their notifications" on notifications
  for select using (recipient_id = auth.uid());

create policy "Users can update their notifications" on notifications
  for update using (recipient_id = auth.uid());

create policy "System can create notifications" on notifications
  for insert with check (true);

-- Create policies for documents table
create policy "Users can view documents" on documents
  for select using (true);

create policy "Users can create documents" on documents
  for insert with check (true);

create policy "Users can update documents" on documents
  for update using (true);

create policy "Users can delete documents" on documents
  for delete using (true);

-- Create policies for matchings table
create policy "Users can view matchings" on matchings
  for select using (true);

create policy "Technicians can create matchings" on matchings
  for insert with check (true);

create policy "Users can update matchings" on matchings
  for update using (true);

-- Create policies for technical_visits table
create policy "Users can view technical visits" on technical_visits
  for select using (true);

create policy "Technicians can manage technical visits" on technical_visits
  for all using (true);

-- Create policies for report_templates table
create policy "Users can view report templates" on report_templates
  for select using (is_active = true);

create policy "Coordinators can manage report templates" on report_templates
  for all using (exists (select 1 from users where id = auth.uid() and role = 'coordinator'));

-- Create policies for generated_reports table
create policy "Users can view generated reports" on generated_reports
  for select using (true);

create policy "Users can create generated reports" on generated_reports
  for insert with check (true);

-- Create policies for scheduled_reports table
create policy "Users can view scheduled reports" on scheduled_reports
  for select using (true);

create policy "Coordinators can manage scheduled reports" on scheduled_reports
  for all using (exists (select 1 from users where id = auth.uid() and role = 'coordinator'));

-- Create policies for audit_logs table
create policy "Coordinators can view audit logs" on audit_logs
  for select using (exists (select 1 from users where id = auth.uid() and role = 'coordinator'));

-- Create updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

-- Create triggers for all tables to automatically update updated_at
create trigger update_users_updated_at before update on users for each row execute procedure update_updated_at_column();
create trigger update_families_updated_at before update on families for each row execute procedure update_updated_at_column();
create trigger update_children_updated_at before update on children for each row execute procedure update_updated_at_column();
create trigger update_placements_updated_at before update on placements for each row execute procedure update_updated_at_column();
create trigger update_budget_updated_at before update on budget for each row execute procedure update_updated_at_column();
create trigger update_notifications_updated_at before update on notifications for each row execute procedure update_updated_at_column();
create trigger update_documents_updated_at before update on documents for each row execute procedure update_updated_at_column();
create trigger update_matchings_updated_at before update on matchings for each row execute procedure update_updated_at_column();
create trigger update_technical_visits_updated_at before update on technical_visits for each row execute procedure update_updated_at_column();
create trigger update_report_templates_updated_at before update on report_templates for each row execute procedure update_updated_at_column();
create trigger update_generated_reports_updated_at before update on generated_reports for each row execute procedure update_updated_at_column();
create trigger update_scheduled_reports_updated_at before update on scheduled_reports for each row execute procedure update_updated_at_column();
create trigger update_audit_logs_updated_at before update on audit_logs for each row execute procedure update_updated_at_column();