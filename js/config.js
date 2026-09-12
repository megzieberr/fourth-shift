// Fourth Shift — config.
// Fill these two in once the Supabase project exists (Dashboard → Settings → API).
// They are safe to commit: the anon key is public by design; RLS does the guarding.
export const SUPABASE_URL = "https://njamrkcwppzxeitnnbem.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_eZBpsvXmREiB5CmxFoNiVg_ySBspbJG";

// Synthetic-email domain for username+password login (Confirm email OFF).
export const EMAIL_DOMAIN = "fourth-shift.app";

// A2 deadline (SAST).
export const DUE_AT = "2026-09-20T23:55:00+02:00";

export const STATIONS = [
  { no: 1, title: "Set up",                   window: "done — group formed 29 Aug" },
  { no: 2, title: "Decode the brief",         window: "brief landed 7 Sep" },
  { no: 3, title: "Task 1 · Source check",    window: "no AI · due Sun 13 Sep" },
  { no: 4, title: "Task 2 · The introduction", window: "no AI · due Sun 13 Sep" },
  { no: 5, title: "Tasks 3 + 4 · The AI week", window: "limited AI · day by day, everything by Sun 20 Sep" },
  { no: 7, title: "Wrap",                     window: "everything due Sun 20 Sep 23:55" },
];
