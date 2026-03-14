// ── Admin Auth Guard ──────────────────────────
const API   = localStorage.getItem('admin_api') || 'http://localhost:5000';
const TOKEN = localStorage.getItem('admin_token');
const ADMIN = JSON.parse(localStorage.getItem('admin_user') || 'null');

// Redirect to login if not authenticated
if (!TOKEN || !ADMIN) {
  window.location.href = 'index.html';
}

// Show admin name in sidebar
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('admin-name');
  if (el && ADMIN) el.textContent = '👤 ' + ADMIN.name;
});

// ── Shared API helper ─────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Sign out ──────────────────────────────────
function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  localStorage.removeItem('admin_api');
  window.location.href = 'index.html';
}

// ── Tab switcher ──────────────────────────────
function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name)?.classList.remove('hidden');
  document.querySelector(`.nav-btn[onclick="showTab('${name}')"]`)?.classList.add('active');
  if (name === 'problems') loadProblems();
  if (name === 'users')    loadUsers();
  if (name === 'stats')    loadStats();
}

// ── Modal helpers ─────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

// ── Toast ─────────────────────────────────────
let _tid = 0;
function toast(msg, type = 'info') {
  const id  = ++_tid;
  const el  = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span><span>${msg}</span>`;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Confirm helper (named cfConfirm to avoid shadowing window.confirm) ──
function cfConfirm(msg, sub, onOk) {
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-sub').textContent = sub || '';
  document.getElementById('confirm-ok').onclick = () => { closeModal('modal-confirm'); onOk(); };
  openModal('modal-confirm');
}

// ── Load stats tab ────────────────────────────
async function loadStats() {
  try {
    const [probs, users] = await Promise.all([
      apiFetch('/api/problems?limit=1000'),
      apiFetch('/api/users'),
    ]);
    document.getElementById('s-problems').textContent = probs.total || probs.problems?.length || 0;
    document.getElementById('s-users').textContent    = users.length || 0;
    document.getElementById('s-pro').textContent      = users.filter(u => u.plan === 'pro').length;
    document.getElementById('s-premium').textContent  = probs.problems?.filter(p => p.premium).length || 0;
  } catch(e) {
    toast('Failed to load stats: ' + e.message, 'error');
  }
}

// ── Init: load problems tab by default ────────
document.addEventListener('DOMContentLoaded', () => {
  loadProblems();
});
