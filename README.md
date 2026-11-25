# Wordle Scoreboard

Shared React/Vite Wordle scoreboard backed by Supabase.

## Local test
1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run dev`.

## Deploy with GitHub and Vercel
1. Create a new GitHub repository.
2. Upload all files from this folder, preserving the folder structure.
3. In Vercel, choose Add New > Project and import the repository.
4. Vercel should detect Vite automatically. Click Deploy.
5. Open the public Vercel URL and submit a test score.

The Supabase publishable key is intentionally usable in a browser. Database security depends on the Row Level Security policies already configured in Supabase. Never add a Supabase secret/service-role key to this project.
