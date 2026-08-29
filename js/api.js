// Supabase API layer. Same surface as js/local-backend.js.
// Reads are direct selects (RLS: members only); ALL writes go through SECURITY DEFINER RPCs.
import { SUPABASE_URL, SUPABASE_ANON_KEY, EMAIL_DOMAIN } from "./config.js";

let supabase = null;
let me = null;
const listeners = [];

export const isLocal = false;

export async function init() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase isn't wired up yet — open with ?local=1 for demo mode.");
  }
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  supabase
    .channel("board")
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => notify())
    .on("postgres_changes", { event: "*", schema: "public", table: "punch_log" }, () => notify())
    .subscribe();
}

function notify() { listeners.forEach((cb) => cb()); }

async function fetchMe() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("members").select("*").eq("id", user.id).single();
  if (error) return null;
  return data;
}

export async function login(username, password) {
  const email = `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error("Wrong username or password.");
  me = await fetchMe();
  if (!me) {
    await supabase.auth.signOut();
    throw new Error("That account isn't on the crew list yet — ask Megan.");
  }
  return me;
}

export async function restoreSession() {
  me = await fetchMe();
  return me;
}

export async function logout() {
  me = null;
  await supabase.auth.signOut();
}

export async function getMembers() {
  const { data, error } = await supabase.from("members").select("*").order("display_name");
  if (error) throw new Error("Couldn't load the crew list.");
  return data;
}

export async function getTasks() {
  const { data, error } = await supabase
    .from("tasks").select("*")
    .order("station").order("position");
  if (error) throw new Error("Couldn't load the job cards.");
  return data;
}

export async function getLog() {
  const { data, error } = await supabase
    .from("punch_log").select("*")
    .order("at", { ascending: false })
    .limit(60);
  if (error) throw new Error("Couldn't load the punch log.");
  return data;
}

async function rpc(fn, args) {
  const { error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message || `${fn} failed — nothing was saved.`);
  notify(); // realtime also fires; this keeps the UI honest if the socket is slow
}

export const punchTask   = (id) => rpc("punch_task",   { p_task_id: id });
export const unpunchTask = (id) => rpc("unpunch_task", { p_task_id: id });

export const addTask = ({ station, title, note = "", link = "", assignee = null }) =>
  rpc("add_task", { p_station: station, p_title: title, p_note: note, p_link: link, p_assignee: assignee });

export const editTask = (id, { title, note = "", link = "", assignee = null }) =>
  rpc("edit_task", { p_task_id: id, p_title: title, p_note: note, p_link: link, p_assignee: assignee });

export const deleteTask = (id) => rpc("delete_task", { p_task_id: id });

export function onChange(cb) { listeners.push(cb); }
