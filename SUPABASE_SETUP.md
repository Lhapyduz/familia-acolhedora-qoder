# Supabase Integration Setup

This document explains how to set up Supabase integration for the Foster Family Management Application.

## Prerequisites

1. A Supabase account (free tier available at https://supabase.com)
2. A Supabase project created

## Setup Instructions

### 1. Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to "Project Settings" > "API"
3. Copy the following values:
   - Project URL (starts with https://)
   - Project API Key (anon key, starts with eyJhb...)

### 2. Configure Environment Variables

Update the [.env](file:///c:/Users/grego/OneDrive/%C3%81rea%20de%20Trabalho/Familia%20Acolhedora/.env) file in the project root with your actual Supabase credentials:

```
VITE_SUPABASE_URL=your_actual_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_actual_supabase_anon_key
```

### 3. Create Database Tables

In your Supabase SQL editor, run the following SQL commands to create the necessary tables:

```sql
-- Create users table
create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text not null,
  role text check (role in ('coordinator', 'technician')) not null,
  permissions text[] not null,
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
  composition jsonb[] not null,
  status text check (status in ('available', 'unavailable', 'under_evaluation', 'active_placement')) not null,
  preferences jsonb not null,
  limitations text[] not null,
  history jsonb[] not null,
  documents jsonb[] not null,
  evaluations jsonb[] not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create children table
create table children (
  id uuid primary key default uuid_generate_v4(),
  personal_info jsonb not null,
  current_status text check (current_status in ('awaiting', 'evaluating', 'available', 'in_placement', 'unavailable', 'reunified', 'adopted')) not null,
  special_needs jsonb not null,
  family_background jsonb not null,
  legal_status jsonb not null,
  current_placement jsonb,
  documents jsonb[] not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create placements table
create table placements (
  id uuid primary key default uuid_generate_v4(),
  child_id uuid references children(id),
  family_id uuid references families(id),
  start_date timestamp with time zone not null,
  end_date timestamp with time zone,
  status text check (status in ('active', 'completed', 'interrupted', 'transferred')) not null,
  approximation_process jsonb not null,
  reports jsonb[] not null,
  visits jsonb[] not null,
  budget jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes for better performance
create index idx_users_email on users(email);
create index idx_families_status on families(status);
create index idx_children_status on children(current_status);
create index idx_placements_child on placements(child_id);
create index idx_placements_family on placements(family_id);
create index idx_placements_status on placements(status);
```

### 4. Enable Real-time Subscriptions (Optional)

To enable real-time updates:

1. Go to "Database" > "Replication" in your Supabase dashboard
2. Enable replication for the tables you want to listen to

### 5. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. The application should automatically detect your Supabase configuration and start syncing data between local storage and Supabase.

## How It Works

The application uses a hybrid database approach:

1. **Local Storage**: Provides immediate access to data and works offline
2. **Supabase**: Provides cloud persistence and synchronization across devices

When Supabase is configured:
- Data is automatically synced from local storage to Supabase on startup
- All CRUD operations are performed on both local storage and Supabase
- Data is retrieved from Supabase when available, falling back to local storage

When Supabase is not configured:
- The application works entirely with local storage
- No external dependencies are required

## Troubleshooting

### Common Issues

1. **"Supabase credentials not found" warning**
   - Ensure your [.env](file:///c:/Users/grego/OneDrive/%C3%81rea%20de%20Trabalho/Familia%20Acolhedora/.env) file contains the correct credentials
   - Restart your development server after updating environment variables

2. **CORS errors**
   - Make sure your Supabase project URL is correct
   - Check that you're using the anon key, not the service key

3. **Data not syncing**
   - Check browser console for errors
   - Verify that your Supabase tables match the schema above
   - Ensure your Supabase project has sufficient permissions

### Disabling Supabase

To disable Supabase integration:
1. Remove or comment out the Supabase environment variables in [.env](file:///c:/Users/grego/OneDrive/%C3%81rea%20de%20Trabalho/Familia%20Acolhedora/.env)
2. Restart your development server