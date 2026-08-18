# Odysseus Quiz App

This site is a student-facing Odyssey guide with private quiz submissions. It uses Supabase email magic links for sign-in and a server-side Edge Function to calculate scores and write responses. The browser never receives a service-role key or the answer key.

## 1. Create the Supabase project

1. Create a Supabase project.
2. In **Authentication → URL Configuration**, set the Site URL to the HTTPS address where this app will be hosted, for example `https://your-school.github.io/odyssey-guide/`.
3. Add that same address to **Redirect URLs**.
4. In **Authentication → Providers → Email**, enable magic-link sign-in.
5. In **SQL Editor**, run `supabase/schema.sql`.

## 2. Deploy the protected scoring function

Install and sign in to the Supabase CLI, then run these commands from this folder:

```powershell
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set APP_ORIGIN=https://your-school.github.io
supabase functions deploy submit-quiz
```

`APP_ORIGIN` must be the scheme and host only, with no path or trailing slash. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are supplied to hosted Edge Functions by Supabase. Do not put the service-role key in `config.js`, GitHub Pages, or any other client-side file.

## 3. Connect the student site

In `config.js`, replace:

```js
supabaseUrl: "https://YOUR_PROJECT.supabase.co",
supabasePublishableKey: "YOUR_PUBLISHABLE_OR_ANON_KEY"
```

with the Project URL and publishable/anon key from **Project Settings → API**. This browser key is safe to publish; it is constrained by the database policies in `supabase/schema.sql`.

## 4. Host and share

This repository includes `.github/workflows/deploy-pages.yml`, which deploys the site to GitHub Pages whenever the `main` branch changes. In the repository’s **Settings → Pages**, choose **GitHub Actions** as the build source. Do not distribute it as a local `file://` page because email sign-in redirects require an HTTPS site URL. Share the deployed URL with the 20 students.

Each student can submit once. On submission, they see only their own score. Row Level Security allows a signed-in student to read only their own score; there are no client-side insert, update, delete, or all-student read policies. The project owner can review written responses in the Supabase Table Editor.
