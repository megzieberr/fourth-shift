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
let punches = [];   // per-member stamps on "Everyone" cards
let log = [];
let openFormStation = null;   // station no with an open add-form
let editingTaskId = null;
let freshStampTaskId = null;  // which stamp gets the slam animation this render
let freshClears = [];         // station nos whose STATION CLEAR stamp slams in this render
let tappedStation = null;     // station of your own punch in flight (a clear there scrolls into view)
let filterMode = loadFilter();       // "mine" | "all"
let collapsedState = loadCollapsed(); // { [station.no]: true|false } — explicit user overrides only

/* ── filter + collapse persistence (localStorage can throw — always guarded) ── */
function loadFilter() {
  try { return localStorage.getItem("fs-filter") === "all" ? "all" : "mine"; }
  catch { return "mine"; }
}
function saveFilter(mode) {
  try { localStorage.setItem("fs-filter", mode); } catch {}
}
function loadCollapsed() {
  try { return JSON.parse(localStorage.getItem("fs-collapsed")) || {}; }
  catch { return {}; }
}
function saveCollapsed() {
  try { localStorage.setItem("fs-collapsed", JSON.stringify(collapsedState)); } catch {}
}
function isCollapsed(stationNo, defaultVal) {
  const v = collapsedState[stationNo];
  return typeof v === "boolean" ? v : defaultVal;
}
function setCollapsed(stationNo, val) {
  collapsedState[stationNo] = val;
  saveCollapsed();
}
function isMine(t) { return t.assignee == null || t.assignee === me.id; }

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
  wireFilterToggle();
  me = await backend.restoreSession();
  if (me) await enterBoard();
}

function wireFilterToggle() {
  updateFilterButtons();
  $("#filter-toggle").addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn || btn.dataset.filter === filterMode) return;
    filterMode = btn.dataset.filter;
    saveFilter(filterMode);
    updateFilterButtons();
    renderStations();
  });
}

function updateFilterButtons() {
  for (const btn of $("#filter-toggle").querySelectorAll(".filter-btn")) {
    const active = btn.dataset.filter === filterMode;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  }
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
  [members, tasks, punches, log] = await Promise.all([
    backend.getMembers(), backend.getTasks(), backend.getPunches(), backend.getLog(),
  ]);
  const newClears = takeNewClears();
  freshClears = newClears;
  renderCrew();
  renderStations();
  freshClears = [];
  renderLog();
  if (newClears.length) celebrate(newClears);
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

/* "Everyone" card = no assignee: one stamp per member. Assigned card: single stamp. */
function isEveryoneCard(t) { return !t.assignee; }
function punchesFor(taskId) { return punches.filter((p) => p.task_id === taskId); }
function isDone(t) {
  return isEveryoneCard(t)
    ? members.length > 0 && punchesFor(t.id).length >= members.length
    : !!t.done_by;
}

function renderCrew() {
  const strip = $("#crew-strip");
  strip.textContent = "";
  for (const m of members) {
    const punched = tasks.filter((t) => t.done_by === m.id).length
                  + punches.filter((p) => p.member_id === m.id).length;
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
    section.dataset.station = st.no;
    const h = el("h2", "station-heading");
    const stTasks = tasks.filter((t) => t.station === st.no);
    const doneCount = stTasks.filter(isDone).length;
    const stationClear = stTasks.length > 0 && doneCount === stTasks.length;
    const collapsed = isCollapsed(st.no, stationClear);

    const toggle = el("button", "station-toggle");
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", String(!collapsed));
    // Title gets its own line; date, stamp and job count wrap on a small line under it.
    const meta = el("span", "station-meta");
    meta.append(el("span", "station-window", st.window));
    if (stationClear) {
      const stamp = el("span", "station-clear", "STATION CLEAR");
      if (freshClears.includes(st.no)) stamp.classList.add("fresh");
      meta.append(stamp);
    }
    if (collapsed) meta.append(el("span", "station-summary", `${stTasks.length} jobs · ${doneCount} done`));
    const text = el("span", "station-text");
    text.append(el("span", "station-title", st.title), meta);
    toggle.append(el("span", "station-chevron", collapsed ? "▸" : "▾"),
      el("span", "station-no", String(st.no)), text);
    toggle.addEventListener("click", () => { setCollapsed(st.no, !collapsed); renderStations(); });
    h.append(toggle);
    section.append(h);

    if (!collapsed) {
      const list = el("div", "station-tasks");
      const visible = filterMode === "mine" ? stTasks.filter(isMine) : stTasks;
      for (const t of visible) list.append(taskCard(t));
      if (!stTasks.length) {
        list.append(el("p", "empty-note", "No job cards at this station yet — add one."));
      } else if (!visible.length) {
        list.append(el("p", "empty-note", "No jobs of yours at this station."));
      }

      if (editingTaskId === null && openFormStation === st.no) {
        list.append(taskForm(st.no, null));
      } else {
        const add = el("button", "add-card-btn", "+ Add a job card");
        add.type = "button";
        add.addEventListener("click", () => { openFormStation = st.no; editingTaskId = null; renderStations(); });
        list.append(add);
      }
      section.append(list);
    }
    wrap.append(section);
  }
}

// "cohesion/clarity/formality" is one long word to the browser, so it got cut mid-word.
// A <wbr> after each slash lets the line wrap there instead (copied text stays clean).
function withSlashBreaks(node, text) {
  text.split("/").forEach((part, i) => {
    if (i > 0) node.append("/", document.createElement("wbr"));
    node.append(part);
  });
  return node;
}

function taskCard(t) {
  if (editingTaskId === t.id) return taskForm(t.station, t);

  const everyone = isEveryoneCard(t);
  const done = isDone(t);
  const mine = everyone && punchesFor(t.id).some((p) => p.member_id === me.id);
  const card = el("article", "task-card" + (done ? " done" : ""));

  const btn = el("button", "punch-btn" + (mine ? " mine" : ""));
  btn.type = "button";
  const willUnpunch = everyone ? mine : !!t.done_by;
  btn.setAttribute("aria-label", everyone
    ? (mine ? `Remove your stamp: ${t.title}` : `Add your stamp: ${t.title}`)
    : (t.done_by ? `Un-punch: ${t.title}` : `Punch done: ${t.title}`));
  btn.textContent = "•";
  btn.addEventListener("click", async () => {
    btn.disabled = true;                       // disable BEFORE the await
    try {
      if (willUnpunch) await backend.unpunchTask(t.id);
      else { freshStampTaskId = t.id; tappedStation = t.station; await backend.punchTask(t.id); }
      await refresh();
    } catch (err) { toast(err.message, true); btn.disabled = false; }
    tappedStation = null;
  });

  const body = el("div");
  body.append(withSlashBreaks(el("p", "task-title"), t.title));
  const meta = el("div", "task-meta");
  const assignee = t.assignee ? memberById(t.assignee) : null;
  const chip = el("span", "assignee-chip");
  const dot = el("span", "assignee-dot");
  dot.style.background = assignee ? assignee.ink : "var(--ink-soft)";
  chip.append(dot, el("span", "", assignee ? assignee.display_name : "Everyone"));
  meta.append(chip);
  body.append(meta);
  if (t.note) body.append(withSlashBreaks(el("p", "task-note"), t.note));
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

  if (everyone) {
    // one ink slot per crew member — your tap only ever touches your own
    const row = el("div", "crew-stamps");
    let lastAt = null;
    for (const m of members) {
      const p = punchesFor(t.id).find((x) => x.member_id === m.id);
      const slot = el("span", "crew-stamp" + (p ? " punched" : ""), initialOf(m));
      if (p) {
        slot.style.background = m.ink;
        slot.style.borderColor = m.ink;
        slot.title = `${m.display_name} · ${fmtLogTime(p.at)}`;
        if (!lastAt || p.at > lastAt) lastAt = p.at;
        if (freshStampTaskId === t.id && m.id === me.id) { slot.classList.add("fresh"); freshStampTaskId = null; }
      } else {
        slot.title = `${m.display_name} — not stamped yet`;
      }
      row.append(slot);
    }
    card.append(row);
    if (done) {
      const stamp = el("span", "stamp", `DONE · WHOLE CREW · ${lastAt ? fmtTime(lastAt) : ""}`);
      stamp.style.color = "var(--ink)";
      card.append(stamp);
    }
  } else if (t.done_by) {
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
  restored: "restored",
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

/* ── station clear: confetti ──────────────────────── */
// Each phone remembers, per member, which stations it has already celebrated. The finisher
// gets confetti on the tap; the rest of the crew gets it once, the next time they open the
// board. A station that stops being clear (un-punch, new card) is forgotten, so clearing it
// again celebrates again. The in-memory copy stops repeats when localStorage is blocked.
let seenClears = null;   // { memberId, nos: Set }
function seenClearKey() { return `fs-clear-seen-${me.id}`; }
function takeNewClears() {
  if (!me || !tasks.length || !members.length) return [];   // half-loaded board: change nothing
  if (seenClears?.memberId !== me.id) {
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(seenClearKey())) || []; } catch {}
    seenClears = { memberId: me.id, nos: new Set(Array.isArray(saved) ? saved : []) };
  }
  const clear = STATIONS.map((st) => st.no).filter((no) => {
    const stTasks = tasks.filter((t) => t.station === no);
    return stTasks.length > 0 && stTasks.every(isDone);
  });
  const fresh = clear.filter((no) => !seenClears.nos.has(no));
  seenClears.nos = new Set(clear);
  try { localStorage.setItem(seenClearKey(), JSON.stringify(clear)); } catch {}
  return fresh;
}

function celebrate(nos) {
  const first = STATIONS.find((st) => st.no === nos[0]);
  toast(nos.length === 1
    ? `Station ${first.no} clear: ${first.title}`
    : `Stations ${nos.slice(0, -1).join(", ")} & ${nos.at(-1)} clear`);
  // Your own clearing tap folds the station shut, which can leave its heading above the
  // screen. Bring it back so you see the stamp land. Other people's clears never scroll you.
  if (nos.includes(tappedStation)) {
    const stamp = document.querySelector(`.station[data-station="${tappedStation}"] .station-clear`);
    const r = stamp?.getBoundingClientRect();
    if (r && (r.top < 0 || r.bottom > innerHeight)) stamp.closest(".station-heading").scrollIntoView({ block: "center" });
  }
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const origins = nos.map((no) => {
    const r = document.querySelector(`.station[data-station="${no}"] .station-clear`)?.getBoundingClientRect();
    return r
      ? { x: r.left + r.width / 2, y: Math.min(Math.max(r.top + r.height / 2, 80), innerHeight - 80) }
      : { x: innerWidth / 2, y: innerHeight / 3 };
  });
  throwConfetti(origins);
}

function throwConfetti(origins) {
  const canvas = el("canvas", "confetti");
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);
  const w = innerWidth, h = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // crew inks + orange, and every fifth bit a little manila job ticket with a pencil edge
  const css = getComputedStyle(document.documentElement);
  const inks = [...members.map((m) => m.ink), css.getPropertyValue("--orange").trim()];
  const manila = css.getPropertyValue("--paper-deep").trim();
  const edge = css.getPropertyValue("--ink-soft").trim();

  const bits = [];
  const perOrigin = Math.max(50, Math.round(160 / origins.length));
  for (const o of origins) {
    for (let i = 0; i < perOrigin; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2;   // upward fan
      const speed = 4 + Math.random() * 9;
      const ticket = i % 5 === 0;
      bits.push({
        x: o.x, y: o.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        w: ticket ? 9 : 4 + Math.random() * 5, h: ticket ? 6 : 3 + Math.random() * 3,
        rot: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.3,
        flip: Math.random() * Math.PI * 2, flipSpeed: 0.08 + Math.random() * 0.12,
        colour: ticket ? manila : inks[Math.floor(Math.random() * inks.length)], ticket,
      });
    }
  }

  const LIFE = 2200, FADE = 600;
  let elapsed = 0, last = performance.now();
  function frame(now) {
    // capped step: a phone that was in the background still plays the whole burst on return
    const dt = Math.max(0, Math.min(now - last, 34));
    last = now;
    elapsed += dt;
    const k = dt / 16.7;
    const drag = Math.pow(0.985, k);
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = elapsed > LIFE - FADE ? Math.max(0, (LIFE - elapsed) / FADE) : 1;
    for (const b of bits) {
      b.vx *= drag;
      b.vy = b.vy * drag + 0.28 * k;
      b.x += b.vx * k; b.y += b.vy * k;
      b.rot += b.spin * k; b.flip += b.flipSpeed * k;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.scale(1, Math.cos(b.flip));   // flutter
      ctx.fillStyle = b.colour;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      if (b.ticket) { ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h); }
      ctx.restore();
    }
    if (elapsed < LIFE) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
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
