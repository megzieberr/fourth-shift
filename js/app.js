// Fourth Shift — UI. Backend chosen by ?local=1 (localStorage demo) vs Supabase.
import { STATIONS, DUE_AT } from "./config.js";

const params = new URLSearchParams(location.search);
const backend = params.has("local")
  ? await import("./local-backend.js")
  : await import("./api.js");

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

let me = null;
let members = [];
let tasks = [];
let log = [];
let openFormStation = null;   // station no with an open add-form
let editingTaskId = null;
let freshStampTaskId = null;  // which stamp gets the slam animation this render

/* ── boot ─────────────────────────────────────────── */
async function boot() {
  if (backend.isLocal) $("#local-hint").hidden = false;
  try {
    await backend.init();
  } catch (err) {
    showLoginError(err.message);
    wireLogin();
    return;
  }
  backend.onChange(() => refresh().catch(() => {}));
  wireLogin();
  me = await backend.restoreSession();
  if (me) await enterBoard();
}

function wireLogin() {
  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#login-btn");
    btn.disabled = true;                       // disable BEFORE the await
    showLoginError("");
    try {
      me = await backend.login($("#login-username").value, $("#login-password").value);
      await enterBoard();
    } catch (err) {
      showLoginError(err.message);
    } finally {
      btn.disabled = false;
    }
  });
  $("#logout-btn").addEventListener("click", async () => {
    await backend.logout();
    location.reload();
  });
  $("#pw-toggle").addEventListener("click", () => {
    const input = $("#login-password");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    $("#pw-slash").setAttribute("visibility", show ? "visible" : "hidden");
    const btn = $("#pw-toggle");
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    btn.setAttribute("aria-pressed", String(show));
    input.focus();
  });
}

function showLoginError(msg) {
  const p = $("#login-error");
  p.textContent = msg;
  p.hidden = !msg;
}

async function enterBoard() {
  $("#view-login").hidden = true;
  $("#view-board").hidden = false;
  renderCountdown();
  await refresh();
}

async function refresh() {
  [members, tasks, log] = await Promise.all([
    backend.getMembers(), backend.getTasks(), backend.getLog(),
  ]);
  renderCrew();
  renderStations();
  renderLog();
}

/* ── header ───────────────────────────────────────── */
function renderCountdown() {
  const due = new Date(DUE_AT);
  const days = Math.ceil((due - Date.now()) / 86400000);
  const n = $("#countdown");
  if (days > 1) n.textContent = `Due Sun 20 Sep 23:55 · ${days} days left`;
  else if (days === 1) n.textContent = "Due TOMORROW 23:55 — final stretch";
  else if (days === 0) n.textContent = "Due TODAY 23:55";
  else n.textContent = "Submission closed 20 Sep";
}

function memberById(id) { return members.find((m) => m.id === id); }
function initialOf(m) { return (m?.display_name || "?").slice(0, 1).toUpperCase(); }

function renderCrew() {
  const strip = $("#crew-strip");
  strip.textContent = "";
  for (const m of members) {
    const punched = tasks.filter((t) => t.done_by === m.id).length;
    const chip = el("span", "crew-chip");
    const av = el("span", "crew-avatar", initialOf(m));
    av.style.background = m.ink;
    chip.append(av, el("span", "", m.display_name), el("span", "crew-count", `×${punched}`));
    strip.append(chip);
  }
}

/* ── stations & job cards ─────────────────────────── */
function renderStations() {
  const wrap = $("#stations");
  wrap.textContent = "";
  for (const st of STATIONS) {
    const section = el("section", "station");
    const h = el("h2", "station-heading");
    h.append(el("span", "station-no", String(st.no)), el("span", "", st.title),
             el("span", "station-window", st.window));
    const stTasks = tasks.filter((t) => t.station === st.no);
    if (stTasks.length && stTasks.every((t) => t.done_by)) {
      h.append(el("span", "station-clear", "STATION CLEAR"));
    }
    section.append(h);

    const list = el("div", "station-tasks");
    for (const t of stTasks) list.append(taskCard(t));
    if (!stTasks.length) list.append(el("p", "empty-note", "No job cards at this station yet — add one."));

    if (editingTaskId === null && openFormStation === st.no) {
      list.append(taskForm(st.no, null));
    } else {
      const add = el("button", "add-card-btn", "+ Add a job card");
      add.type = "button";
      add.addEventListener("click", () => { openFormStation = st.no; editingTaskId = null; renderStations(); });
      list.append(add);
    }
    section.append(list);
    wrap.append(section);
  }
}

function taskCard(t) {
  if (editingTaskId === t.id) return taskForm(t.station, t);

  const card = el("article", "task-card" + (t.done_by ? " done" : ""));

  const btn = el("button", "punch-btn");
  btn.type = "button";
  btn.setAttribute("aria-label", t.done_by ? `Un-punch: ${t.title}` : `Punch done: ${t.title}`);
  btn.textContent = "•";
  btn.addEventListener("click", async () => {
    btn.disabled = true;                       // disable BEFORE the await
    try {
      if (t.done_by) await backend.unpunchTask(t.id);
      else { freshStampTaskId = t.id; await backend.punchTask(t.id); }
      await refresh();
    } catch (err) { toast(err.message, true); btn.disabled = false; }
  });

  const body = el("div");
  body.append(el("p", "task-title", t.title));
  const meta = el("div", "task-meta");
  const assignee = t.assignee ? memberById(t.assignee) : null;
  const chip = el("span", "assignee-chip");
  const dot = el("span", "assignee-dot");
  dot.style.background = assignee ? assignee.ink : "var(--ink-soft)";
  chip.append(dot, el("span", "", assignee ? assignee.display_name : "Everyone"));
  meta.append(chip);
  body.append(meta);
  if (t.note) body.append(el("p", "task-note", t.note));
  if (t.link) {
    const a = el("a", "task-link", t.link.replace(/^https?:\/\//, ""));
    a.href = t.link; a.target = "_blank"; a.rel = "noopener";
    body.append(a);
  }

  const kebab = el("button", "task-kebab", "⋯");
  kebab.type = "button";
  kebab.setAttribute("aria-label", `Edit card: ${t.title}`);
  kebab.addEventListener("click", () => { editingTaskId = t.id; openFormStation = null; renderStations(); });

  card.append(btn, body, kebab);

  if (t.done_by) {
    const by = memberById(t.done_by);
    const when = t.done_at ? fmtTime(t.done_at) : "";
    const stamp = el("span", "stamp", `DONE · ${(by?.display_name || "?").toUpperCase()} · ${when}`);
    stamp.style.color = by?.ink || "var(--ink)";
    if (freshStampTaskId === t.id) { stamp.classList.add("fresh"); freshStampTaskId = null; }
    card.append(stamp);
  }
  return card;
}

function taskForm(stationNo, existing) {
  const frag = $("#tpl-task-form").content.cloneNode(true);
  const form = frag.querySelector("form");
  const select = form.querySelector("select[name=assignee]");
  for (const m of members) {
    const opt = el("option", "", m.display_name);
    opt.value = m.id;
    select.append(opt);
  }
  if (existing) {
    form.title.value = existing.title;
    form.note.value = existing.note || "";
    form.link.value = existing.link || "";
    select.value = existing.assignee || "";
    if (me.is_admin || existing.created_by === me.id) {
      const del = el("button", "btn-ghost btn-small", "Delete card");
      del.type = "button";
      del.addEventListener("click", async () => {
        try { await backend.deleteTask(existing.id); closeForm(); await refresh(); }
        catch (err) { toast(err.message, true); }
      });
      form.querySelector(".task-form-row").append(del);
    }
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fields = {
      title: form.title.value, note: form.note.value,
      link: form.link.value, assignee: select.value || null,
    };
    try {
      if (existing) await backend.editTask(existing.id, fields);
      else await backend.addTask({ station: stationNo, ...fields });
      closeForm(); await refresh();
    } catch (err) { toast(err.message, true); }
  });
  form.querySelector("[data-act=cancel]").addEventListener("click", () => { closeForm(); renderStations(); });
  return frag;
}

function closeForm() { openFormStation = null; editingTaskId = null; }

/* ── punch log ────────────────────────────────────── */
const ACTION_TEXT = {
  punched: "punched", unpunched: "un-punched",
  added: "added", edited: "edited", deleted: "deleted",
};
function renderLog() {
  const listEl = $("#punch-log");
  listEl.textContent = "";
  $("#punch-log-empty").hidden = log.length > 0;
  for (const line of log) {
    const m = memberById(line.member_id);
    const li = el("li");
    const dot = el("span", "log-dot");
    dot.style.background = m?.ink || "var(--ink-soft)";
    li.append(
      dot,
      el("span", "log-time", fmtLogTime(line.at)),
      el("span", "", `${m?.display_name || "?"} ${ACTION_TEXT[line.action] || line.action} “${line.task_title}”`),
    );
    listEl.append(li);
  }
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}
function fmtLogTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) + " " + fmtTime(iso);
}

/* ── toasts ───────────────────────────────────────── */
function toast(msg, isError = false) {
  const t = el("div", "toast" + (isError ? " error" : ""), msg);
  $("#toasts").append(t);
  setTimeout(() => t.remove(), 4200);
}

/* ── service worker ───────────────────────────────── */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

boot();
