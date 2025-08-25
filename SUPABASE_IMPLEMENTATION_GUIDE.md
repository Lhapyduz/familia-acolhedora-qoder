# Supabase Implementation Guide

This guide will help you set up the complete database schema for the Foster Family Management Application.

## Prerequisites

1. A Supabase account (free tier available at https://supabase.com)
2. A Supabase project created
3. Your Supabase project URL and anon key

## Step 1: Update Environment Variables

1. Open the [.env](file:///c:/Users/grego/OneDrive/%C3%81rea%20de%20Trabalho/Familia%20Acolhedora/.env) file in your project
2. Replace the placeholder values with your actual Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_actual_supabase_project_url_here
   VITE_SUPABASE_ANON_KEY=your_actual_supabase_anon_key_here
   ```
3. Save the file

## Step 2: Create Database Tables

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of [SUPABASE_SCHEMA.sql](file:///c:/Users/grego/OneDrive/%C3%81rea%20de%20Trabalho/Familia%20Acolhedora/SUPABASE_SCHEMA.sql) into the editor
5. Click **Run** to execute the script

### Option 2: Using Supabase CLI

1. Open a terminal in your project directory
2. Link your project (replace `your-project-ref` with your actual project reference):
   ```bash
   npx supabase link --project-ref your-project-ref
   ```
3. Push the schema to your database:
   ```bash
   npx supabase db push
   ```

## Step 3: Verify Table Creation

After running the schema script, you should see the following tables in your Supabase database:

1. **users** - User management
2. **families** - Foster family information
3. **children** - Child information and status
4. **placements** - Child placement records
5. **budget** - Budget management
6. **notifications** - User notifications
7. **documents** - Document storage references
8. **matchings** - Family-child matching records
9. **technical_visits** - Technical visit scheduling
10. **report_templates** - Report template management
11. **generated_reports** - Generated reports
12. **scheduled_reports** - Scheduled report configurations
13. **audit_logs** - System audit logs

## Step 4: Verify Default Data

The schema includes default data that should be automatically created:

1. A default coordinator user with email `admin@familiacolhedora.gov.br`
2. Default budget settings for the current fiscal year

## Step 5: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```
2. Open your application in the browser
3. Try logging in with the default admin credentials:
   - Email: `admin@familiacolhedora.gov.br`
   - Password: `admin123` (as defined in the AuthService)

## Troubleshooting

### Common Issues

1. **"Supabase credentials not found" warning**
   - Ensure your [.env](file:///c:/Users/grego/OneDrive/%C3%81rea%20de%20Trabalho/Familia%20Acolhedora/.env) file contains the correct credentials
   - Restart your development server after updating environment variables

2. **CORS errors**
   - Make sure your Supabase project URL is correct
   - Check that you're using the anon key, not the service key

3. **Tables not appearing in dashboard**
   - Refresh the Supabase dashboard
   - Check the SQL editor output for any errors

4. **Authentication issues**
   - Verify that the default user was created in the `users` table
   - Check that RLS (Row Level Security) policies are correctly applied

### Checking Table Creation

You can verify that tables were created correctly by running this SQL query in your Supabase SQL editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Checking Default User

Verify the default user was created:

```sql
SELECT id, email, name, role, is_active 
FROM users 
WHERE email = 'admin@familiacolhedora.gov.br';
```

## Next Steps

1. Customize the default budget settings in the `budget` table if needed
2. Add additional users through the application interface
3. Begin adding families and children to the system
4. Configure report templates for automated reporting

## Security Notes

The schema includes Row Level Security (RLS) policies that:
- Allow users to view their own profile
- Restrict certain operations based on user roles
- Protect sensitive data access

You can modify these policies in the Supabase dashboard under **Authentication > Policies** for each table.