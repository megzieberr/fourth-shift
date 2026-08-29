# Fourth Shift

Shared checklist for the **ALDE122 Assessment 2** group essay (due Sun 20 Sep 2026, 23:55).
Four crew members clock in, punch job cards done, and every punch records who and when.
Full plan + design notes: `BUILD-PLAN.md`.

## Run it locally (demo mode, no Supabase needed)

```
python -m http.server 5216
```

Open `http://localhost:5216/?local=1` — demo logins `megan` / `anna` / `ben` / `carla`,
password `shift`. Demo data lives in your browser's localStorage only.

## Going live (each step in order)

1. **Supabase**: create a NEW free project (not the NWU hub's). SQL editor → run
   `supabase/schema.sql`.
2. **Auth**: Authentication → Providers → Email → turn **Confirm email OFF**.
   Authentication → Users → Add user ×4 with emails `<username>@fourth-shift.app`
   and a password each (auto-confirm ON).
3. Copy `supabase/seed-private.sql.template` → `supabase/seed-private.sql`, fill in the
   real usernames + first names, run it in the SQL editor. (Gitignored — real names
   never enter this public repo.)
4. **Wire the app**: paste the project URL + anon/publishable key into `js/config.js`
   (Dashboard → Settings → API). These are safe to commit; RLS guards the data.
5. **Deploy**: public GitHub repo `megzieberr/fourth-shift`, Pages from `main` / root.
6. **Test before sharing**: log in as Megan AND as one ordinary member — the member must
   be able to punch/add but NOT delete cards (delete should error).

## Stack

Static ES-module page (no build step) · Supabase (username+password via synthetic
emails, RLS on, all writes through SECURITY DEFINER RPCs) · realtime board updates ·
PWA (add to home screen). After 20 Sep the project goes idle and Supabase pauses it —
that's fine, the app retires with the assignment.
