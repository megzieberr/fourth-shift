# Fourth Shift — build plan
**ALDE122 Assessment 2 group checklist · Megan + 3 group members · 2026-08-29**

A tiny shared to-do board for the A2 group essay (due Sun 20 Sep 23:55). Four people log in,
tick off job cards, and every tick records **who and when** — the evidence trail runs itself.
Independent of the NWU hub: own repo, own Supabase project, GitHub Pages.

## Why "Fourth Shift"
The essay is about the Fourth Industrial Revolution; the group is four people working a
two-week shift. The whole look leans into that: manila job cards, a punch-clock, stamped
completions.

## Design plan

**Palette (manila + ink + safety orange)**
| Name | Hex | Job |
|---|---|---|
| Paper | `#EFE4CC` | page background (manila) |
| Card | `#F9F1DE` | job cards |
| Ink | `#2B2B26` | text |
| Soft ink | `#6B6353` | meta text |
| Safety orange | `#E05A1F` | primary actions, current station |
| Member inks | `#C93F2A` `#2E6C9E` `#4E7A3C` `#7A4E8F` | one stamp-ink colour per member |

**Type** — display: *Big Shoulders Display* (industrial, Chicago-factory face) ·
body: *Work Sans* · timestamps/log: *IBM Plex Mono* (the punch-card company's own face).

**Signature element (the one risk):** completing a task doesn't show a checkmark — it slams
a rotated rubber **stamp** onto the card: `DONE · MEGAN · 14:05`, in that member's ink
colour. The activity feed is the **punch log**. Logging in is **clocking in**. Everything
else stays quiet. `prefers-reduced-motion` gets a fade instead of the slam.

**Layout (phone-first, one column)**
```
┌──────────────────────────────┐
│ FOURTH SHIFT      [nameplate]│
│ ALDE122 · A2 · due in 22 days│
│ (M)(A)(B)(C)  crew chips     │
├──────────────────────────────┤
│ ① SET UP            STATION  │
│ │ ┌─ job card ──────────┐    │
│ │ │ ◯ Join the WhatsApp │    │
│ │ │   group   [everyone]│    │
│ │ └─────────────────────┘    │
│ │ ┌─ job card (done) ───┐    │
│ │ │ ╔ DONE·MEGAN·14:05 ╗│    │
│ │ └─────────────────────┘    │
│ │  + add a job card          │
│ ② DECODE THE BRIEF …         │
├──────────────────────────────┤
│ THE PUNCH LOG  (mono feed)   │
└──────────────────────────────┘
```
Stations run down a vertical conveyor line, numbered — a real sequence, so the numbers
carry meaning. Login screen is a single time-clock card: username + password → **Clock in**.

## Architecture (canonical stack)
- Static ES-module site, no build step. `python -m http.server` locally (port **5216**,
  launch.json entry `fourth-shift`), GitHub Pages from `main`/root when we ship.
- PWA: manifest + versioned service-worker cache + icons, `.nojekyll`, relative paths.
- **Local-first:** `js/local-backend.js` is a localStorage twin of the API; `?local=1`
  runs the whole app with demo members (Megan/Anna/Ben/Carla, password `shift`) before
  Supabase exists.
- Realtime: Supabase `postgres_changes` on `tasks` + `punch_log`, so a tick appears on
  everyone's phone without refreshing.

## Supabase (own project — NOT the hub's)
The hub project assumes Megan is the only login; three classmates never go near it.
A fresh free project holds only this app's three tables. After 20 Sep it goes idle and
Supabase pauses it by itself — the app retires with the assignment.

- **Auth:** username + password via synthetic email `<username>@fourth-shift.app`,
  Confirm email OFF. Megan creates the 4 users in the dashboard; members just get a
  username + password over WhatsApp.
- **Tables:** `members` (uid → display name, ink colour, is_admin), `tasks`
  (station, title, note, link, assignee, done_by, done_at), `punch_log` (append-only feed).
- **RLS on everywhere, zero direct write policies.** Reads: members only. All writes go
  through `SECURITY DEFINER` RPCs with `search_path` pinned:
  `punch_task` · `unpunch_task` · `add_task` · `edit_task` · `delete_task`.
- `is_admin` is set only in seed SQL — no RPC can touch it.
- `supabase/schema.sql` = idempotent, seeds the generic task skeleton.
  `seed-private.sql` (from the template, NOT committed) maps the four real accounts.
  Real names and passwords never enter the repo (it's public).

## Decisions taken in this skeleton (cheap to change)
1. **Everyone can add job cards and punch/unpunch anything** — the log records every
   action, so nothing is lost silently; that IS the trail.
2. **Only Megan (admin) can delete cards**; editing = card creator or admin.
3. **Notes + link field per card** (for pasting a Google Docs link etc.); WhatsApp stays
   the chat channel.
4. English UI (NWU group, English module).

## The task skeleton (seeded, editable in-app)
- **① Set up (now → 7 Sep):** right tutor WhatsApp group (13 exist — wrong one = missed
  info) · tutor's email with the group list · create group WhatsApp · everyone clocks in
  here once · ask the tutor: shared mark or split?
- **② Decode the brief (7 Sep):** all read it same day · list the four tasks + rubric ·
  name an owner per task · internal deadline = 19 Sep, not 20.
- **③ Read like markers:** everyone reads student X's essay · conclusion FIRST (the
  thesis lives there) · list the body's main ideas in order (= the preview).
- **④ Build the introduction:** background (~2 sentences) → problem statement → thesis
  (reworded from the conclusion) → preview → assemble as ONE paragraph, 3+ connectors →
  Addendum C checklist (workbook p.269).
- **⑤ Tasks 2–4:** placeholders — details land 7 Sep.
- **⑥ Submit:** full-group read-through · NWU Harvard on any references · submit on
  eFundi by Sun 20 Sep 23:55 · screenshot the confirmation into WhatsApp.

## What happens after the skeleton (each step gets its own yes)
1. Megan picks which Supabase account hosts the new project → create project, run
   `schema.sql`, create 4 auth users, run `seed-private.sql`.
2. Live test: login per account + the privilege-escalation check (member tries admin acts).
3. Public repo `megzieberr/fourth-shift`, Pages on, verify live URL.
4. Real member names + inks when the tutor's email arrives (~7 Sep).
5. Nice-to-have later: "night shift" dark variant.
