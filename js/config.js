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
  { no: 1, title: "Set up",                 window: "now → 7 Sep" },
  { no: 2, title: "Decode the brief",       window: "7 Sep, the day it lands" },
  { no: 3, title: "Read like markers",      window: "before anyone writes" },
  { no: 4, title: "Build the introduction", window: "one paragraph, no line breaks" },
  { no: 5, title: "Tasks 2–4",              window: "details land 7 Sep" },
  { no: 6, title: "Submit",                 window: "due Sun 20 Sep 23:55" },
];
