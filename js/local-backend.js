// Local backend — localStorage twin of the Supabase API layer (?local=1).
// Same surface as js/api.js so the whole app runs offline before Supabase exists.
import { SEED_TASKS } from "./skeleton-tasks.js";

const KEY = "fourth-shift-local-v1";
const SESSION_KEY = "fourth-shift-local-session";

const DEMO_MEMBERS = [
  { id: "m-megan", username: "megan", display_name: "Megan", ink: "#C93F2A", is_admin: true },
  { id: "m-anna",  username: "anna",  display_name: "Anna",  ink: "#2E6C9E", is_admin: false },
  { id: "m-ben",   username: "ben",   display_name: "Ben",   ink: "#4E7A3C", is_admin: false },
  { id: "m-carla", username: "carla", display_name: "Carla", ink: "#7A4E8F", is_admin: false },
];
const DEMO_PASSWORD = "shift";

let db = null;
let me = null;
const listeners = [];

function load() {
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
  if (!db || !Array.isArray(db.tasks)) {
    db = {
      tasks: SEED_TASKS.map((t, i) => ({
        id: i + 1, station: t.station, position: i + 1,
        title: t.title, note: t.note || "", link: t.link || "",
        assignee: null, done_by: null, done_at: null, created_by: null,
      })),
      punches: [],
      log: [],
      nextId: SEED_TASKS.length + 1,
    };
    save();
  }
  if (!Array.isArray(db.punches)) { db.punches = []; save(); }
}
function save() { localStorage.setItem(KEY, JSON.stringify(db)); }
function notify() { listeners.forEach((cb) => cb()); }
function requireMe() { if (!me) throw new Error("Not clocked in."); }
function logLine(action, taskTitle) {
  db.log.unshift({ member_id: me.id, action, task_title: taskTitle, at: new Date().toISOString() });
  db.log = db.log.slice(0, 60);
}

export const isLocal = true;

export async function init() { load(); }

export async function login(username, password) {
  const member = DEMO_MEMBERS.find((m) => m.username === username.trim().toLowerCase());
  if (!member || password !== DEMO_PASSWORD) throw new Error("Wrong username or password.");
  me = member;
  sessionStorage.setItem(SESSION_KEY, member.id);
  return member;
}

export async function restoreSession() {
  const id = sessionStorage.getItem(SESSION_KEY);
  me = DEMO_MEMBERS.find((m) => m.id === id) || null;
  return me;
}

export async function logout() {
  me = null;
  sessionStorage.removeItem(SESSION_KEY);
}

export async function getMembers() { return DEMO_MEMBERS; }

export async function getTasks() {
  return [...db.tasks].sort((a, b) => a.station - b.station || a.position - b.position);
}

export async function getPunches() { return db.punches; }

export async function getLog() { return db.log; }

export async function punchTask(id) {
  requireMe();
  const t = db.tasks.find((x) => x.id === id);
  if (!t) throw new Error("Card not found.");
  if (!t.assignee) {
    // Everyone card: one stamp per member, yours only
    if (db.punches.some((p) => p.task_id === id && p.member_id === me.id)) return;
    db.punches.push({ task_id: id, member_id: me.id, at: new Date().toISOString() });
  } else {
    if (t.done_by) return; // already punched — no double stamp
    t.done_by = me.id;
    t.done_at = new Date().toISOString();
  }
  logLine("punched", t.title);
  save(); notify();
}

export async function unpunchTask(id) {
  requireMe();
  const t = db.tasks.find((x) => x.id === id);
  if (!t) return;
  if (!t.assignee) {
    const before = db.punches.length;
    db.punches = db.punches.filter((p) => !(p.task_id === id && p.member_id === me.id));
    if (db.punches.length === before) return; // no stamp of yours here
  } else {
    if (!t.done_by) return;
    t.done_by = null;
    t.done_at = null;
  }
  logLine("unpunched", t.title);
  save(); notify();
}

export async function addTask({ station, title, note = "", link = "", assignee = null }) {
  requireMe();
  const position = Math.max(0, ...db.tasks.filter((t) => t.station === station).map((t) => t.position)) + 1;
  db.tasks.push({
    id: db.nextId++, station, position,
    title: title.trim(), note: note.trim(), link: link.trim(),
    assignee: assignee || null, done_by: null, done_at: null, created_by: me.id,
  });
  logLine("added", title.trim());
  save(); notify();
}

export async function editTask(id, { title, note = "", link = "", assignee = null }) {
  requireMe();
  const t = db.tasks.find((x) => x.id === id);
  if (!t) throw new Error("Card not found.");
  if (t.created_by !== me.id && t.created_by !== null && !me.is_admin) throw new Error("Only the card's creator (or Megan) can edit it.");
  t.title = title.trim(); t.note = note.trim(); t.link = link.trim(); t.assignee = assignee || null;
  logLine("edited", t.title);
  save(); notify();
}

export async function deleteTask(id) {
  requireMe();
  if (!me.is_admin) throw new Error("Only Megan can delete cards.");
  const i = db.tasks.findIndex((x) => x.id === id);
  if (i === -1) return;
  logLine("deleted", db.tasks[i].title);
  db.tasks.splice(i, 1);
  db.punches = db.punches.filter((p) => p.task_id !== id);
  save(); notify();
}

export function onChange(cb) { listeners.push(cb); }
