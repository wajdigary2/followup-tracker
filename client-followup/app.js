/* =====================
   Follow-up Tracker PWA
   Storage: localStorage (on device). Reminders: Google Calendar event link.
   ===================== */

const STORAGE_KEY = 'followups.v1';
const DEFAULT_DELAY = 3;

let state = {
  items: [],          // { id, client, note, createdAt, dueDate (YYYY-MM-DD), done }
  selectedDays: DEFAULT_DELAY,
};

/* ---------- helpers ---------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const todayStr = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};
const addDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const fmtDate = (iso) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};
const dayDiff = (iso) => {
  const a = new Date(iso + 'T00:00:00'); a.setHours(0,0,0,0);
  const b = new Date(); b.setHours(0,0,0,0);
  return Math.round((a - b) / 86400000);
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state.items = JSON.parse(raw);
  } catch (e) { state.items = []; }
}
function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

/* ---------- Google Calendar link (no OAuth needed) ---------- */
function calendarUrl(item) {
  const start = item.dueDate.replace(/-/g, '');
  const end = addDays(item.dueDate, 1).replace(/-/g, '');
  const title = `Follow up: ${item.client}`;
  const details = [
    item.note ? item.note : '',
    '',
    'Logged by Follow-up Tracker',
    `Client: ${item.client}`,
    `Due: ${fmtDate(item.dueDate)}`
  ].join('\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/* ---------- render ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function statusOf(item) {
  if (item.done) return 'done';
  const diff = dayDiff(item.dueDate);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  return 'upcoming';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function badgeFor(item) {
  if (item.done) return '<span class="badge done">done</span>';
  const diff = dayDiff(item.dueDate);
  if (diff < 0) return `<span class="badge overdue">${Math.abs(diff)}d overdue</span>`;
  if (diff === 0) return `<span class="badge today">today</span>`;
  return `<span class="badge upcoming">in ${diff}d</span>`;
}

function itemHtml(item) {
  const st = statusOf(item);
  return `
    <li class="item ${st}" data-id="${item.id}">
      <div class="item-head">
        <p class="item-client">${escapeHtml(item.client)}</p>
        ${badgeFor(item)}
      </div>
      ${item.note ? `<p class="item-note">${escapeHtml(item.note)}</p>` : ''}
      <div class="item-meta">
        <span>Due: ${fmtDate(item.dueDate)}</span>
        ${item.done && item.doneAt ? `<span>Done ${new Date(item.doneAt).toLocaleDateString()}</span>` : ''}
      </div>
      <div class="item-actions">
        ${!item.done ? `
          <button class="btn small primary" data-action="done">Mark done</button>
          <button class="btn small outline" data-action="snooze">Snooze +3d</button>
          <button class="btn small ghost" data-action="calendar">Open calendar</button>
        ` : ''}
        <button class="btn small ghost" data-action="edit">Edit</button>
        <button class="btn small danger" data-action="delete">Delete</button>
      </div>
    </li>`;
}

function render() {
  const pending = state.items.filter(i => !i.done).sort((a,b) => a.dueDate.localeCompare(b.dueDate));
  const done = state.items.filter(i => i.done).sort((a,b) => (b.doneAt||0) - (a.doneAt||0));

  const pendingList = $('#pendingList');
  const doneList = $('#doneList');
  pendingList.innerHTML = pending.map(itemHtml).join('');
  doneList.innerHTML = done.map(itemHtml).join('');

  $('#pendingEmpty').classList.toggle('hidden', pending.length > 0);
  $('#doneEmpty').classList.toggle('hidden', done.length > 0);

  const dueNow = pending.filter(i => dayDiff(i.dueDate) <= 0).length;
  const pill = $('#statusPill');
  pill.textContent = dueNow ? `${dueNow} due` : `${pending.length} pending`;
  pill.className = 'status-pill' + (dueNow > 0 ? ' warn' : pending.length === 0 ? ' ok' : '');
  if (pending.length === 0) pill.textContent = 'All clear ✓';
}

/* ---------- actions ---------- */
function addFollowup(client, note, days) {
  const item = {
    id: uid(),
    client: client.trim(),
    note: note.trim(),
    createdAt: Date.now(),
    dueDate: addDays(todayStr(), days),
    done: false,
  };
  state.items.unshift(item);
  persist();
  render();
  // open Google Calendar event creation in a new tab (synchronously so popup blockers allow it)
  const url = calendarUrl(item);
  let opened = false;
  try { const w = window.open(url, '_blank', 'noopener'); opened = !!w; } catch (e) { opened = false; }
  if (opened) {
    toast(`Logged. Calendar tab opened — tap "Save" to confirm the reminder.`);
  } else {
    toast(`Logged. Popup blocked — tap "Open calendar" on the item to schedule the reminder.`);
  }
  return item;
}

function markDone(id) {
  const it = state.items.find(i => i.id === id);
  if (!it) return;
  it.done = true;
  it.doneAt = Date.now();
  persist(); render();
  toast('Marked done.');
}

function snooze(id) {
  const it = state.items.find(i => i.id === id);
  if (!it) return;
  it.dueDate = addDays(it.dueDate, 3);
  persist(); render();
  toast('Snoozed +3 days.');
}

function deleteItem(id) {
  if (!confirm('Delete this follow-up?')) return;
  state.items = state.items.filter(i => i.id !== id);
  persist(); render();
  toast('Deleted.');
}

function openEdit(id) {
  const it = state.items.find(i => i.id === id);
  if (!it) return;
  $('#editId').value = it.id;
  $('#editClient').value = it.client;
  $('#editNote').value = it.note;
  const diff = dayDiff(it.dueDate);
  // days remaining from today
  $('#editDays').value = Math.max(1, diff >= 0 ? diff : 1);
  $('#editBackdrop').classList.remove('hidden');
}

function closeEdit() {
  $('#editBackdrop').classList.add('hidden');
}

function saveEdit() {
  const id = $('#editId').value;
  const it = state.items.find(i => i.id === id);
  if (!it) return;
  it.client = $('#editClient').value.trim();
  it.note = $('#editNote').value.trim();
  const days = Math.max(1, parseInt($('#editDays').value, 10) || 1);
  it.dueDate = addDays(todayStr(), days);
  persist(); render(); closeEdit();
  toast('Updated.');
}

function clearDone() {
  if (!confirm('Clear all completed follow-ups?')) return;
  state.items = state.items.filter(i => !i.done);
  persist(); render();
  toast('Cleared.');
}

function exportCsv() {
  const rows = [['client','note','dueDate','done','createdAt']];
  state.items.forEach(i => rows.push([
    `"${(i.client||'').replace(/"/g,'""')}"`,
    `"${(i.note||'').replace(/"/g,'""')}"`,
    i.dueDate,
    i.done ? 'yes' : 'no',
    new Date(i.createdAt).toISOString(),
  ]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'followups.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast('Exported CSV.');
}

/* ---------- toast ---------- */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
}

/* ---------- events ---------- */
function bindEvents() {
  // tabs
  $$('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      $('#pendingSection').classList.toggle('hidden', tab !== 'pending');
      $('#doneSection').classList.toggle('hidden', tab !== 'done');
    });
  });

  // delay chips
  const chips = $$('#delayChips .chip');
  chips.forEach(c => {
    c.addEventListener('click', () => {
      state.selectedDays = parseInt(c.dataset.days, 10);
      chips.forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      $('#customDays').value = '';
    });
  });

  $('#useCustom').addEventListener('click', () => {
    const v = parseInt($('#customDays').value, 10);
    if (!v || v < 1) { toast('Enter a valid number of days.'); return; }
    state.selectedDays = v;
    chips.forEach(x => x.classList.remove('active'));
    toast(`Reminder set to ${v} days.`);
  });

  // add form
  $('#addForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const client = $('#client').value.trim();
    if (!client) { toast('Client name is required.'); return; }
    const note = $('#note').value;
    const days = state.selectedDays || DEFAULT_DELAY;
    addFollowup(client, note, days);
    e.target.reset();
    // restore default chip
    state.selectedDays = DEFAULT_DELAY;
    chips.forEach(x => x.classList.toggle('active', parseInt(x.dataset.days,10) === DEFAULT_DELAY));
  });

  // list delegation
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const li = btn.closest('.item');
    const id = li && li.dataset.id;
    const action = btn.dataset.action;
    if (action === 'done') markDone(id);
    else if (action === 'snooze') snooze(id);
    else if (action === 'delete') deleteItem(id);
    else if (action === 'edit') openEdit(id);
    else if (action === 'calendar') {
      const it = state.items.find(i => i.id === id);
      if (it) window.open(calendarUrl(it), '_blank', 'noopener');
    }
  });

  // edit modal
  $('#editForm').addEventListener('submit', (e) => { e.preventDefault(); saveEdit(); });
  $('#cancelEdit').addEventListener('click', closeEdit);
  $('#editBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'editBackdrop') closeEdit();
  });

  $('#clearDone').addEventListener('click', clearDone);
  $('#exportBtn').addEventListener('click', exportCsv);
}

/* ---------- install / service worker ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW reg failed', err));
  });
}

/* ---------- init ---------- */
load();
bindEvents();
render();

// Periodic re-render so "due" counts stay fresh while app is open
setInterval(render, 60000);
