# Update Supabase Service Role Key

The current service role key in `.env.local` appears to be invalid. You need to update it with the correct key from your Supabase dashboard.

## Steps to get the correct Service Role Key:

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/yjsrugmmpzbmyrodufin/settings/api

2. Scroll down to the **Project API keys** section

3. Find the **service_role** key (this has full access to your database, keep it secret!)
   - It should start with `eyJ...` (a JWT token)
   - NOT the anon/public key

4. Copy the entire service_role key

5. Update these lines in `/apps/web/.env.local`:
   ```
   SUPABASE_SERVICE_KEY=[paste the service_role key here]
   SUPABASE_SERVICE_ROLE_KEY=[paste the same service_role key here]
   ```

## Important Notes:
- The service_role key is different from the anon/public key
- Never expose the service_role key in client-side code
- The key should be a long JWT token (usually 200+ characters)

## Alternative: Use Database Password
If you can't find the service role key, you could also try using the database password from the connection string:
- Password from connection string: `[YOUR-PASSWORD]@db.yjsrugmmpzbmyrodufin`

But the service_role key is the recommended approach for the Supabase JS client.