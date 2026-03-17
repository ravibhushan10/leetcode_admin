// ════════════════════════════════════════════
//  CODEFORGE ADMIN — Problems Manager
// ════════════════════════════════════════════

let allProblems  = [];
let editingId    = null;
let deleteTarget = null;

// ── Load & render ─────────────────────────────
async function loadProblems() {
  document.getElementById('problems-body').innerHTML =
    '<tr><td colspan="7" class="loading-row"><span class="spinner"></span> Loading…</td></tr>';
  try {
    const data  = await apiFetch('/api/problems?limit=1000');
    allProblems = data.problems || [];
    renderProblemsTable(allProblems);
    updateMiniStats(allProblems);
  } catch (e) {
    toast('Failed to load problems: ' + e.message, 'error');
    document.getElementById('problems-body').innerHTML =
      `<tr><td colspan="7" class="loading-row" style="color:var(--red)">Error: ${e.message}</td></tr>`;
  }
}

function updateMiniStats(probs) {
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('stat-total',   probs.length + ' Problems');
  el('stat-easy',    probs.filter(p => p.difficulty === 'Easy').length   + ' Easy');
  el('stat-medium',  probs.filter(p => p.difficulty === 'Medium').length + ' Medium');
  el('stat-hard',    probs.filter(p => p.difficulty === 'Hard').length   + ' Hard');
  el('stat-premium', probs.filter(p => p.premium).length + ' Premium');
}

function renderProblemsTable(probs) {
  const tbody = document.getElementById('problems-body');
  if (!probs.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-row">No problems found.</td></tr>';
    return;
  }
  const diffBadge = d => d === 'Easy' ? 'badge-easy' : d === 'Medium' ? 'badge-medium' : 'badge-hard';

  tbody.innerHTML = probs.map(p => `
    <tr>
      <td class="mono muted">${p.number}</td>
      <td>
        <div class="prob-title">${escHtml(p.title)}</div>
        <div class="prob-sub">${(p.companies || []).slice(0,3).join(' · ')}</div>
      </td>
      <td><span class="badge ${diffBadge(p.difficulty)}">${p.difficulty}</span></td>
      <td class="tags-cell">${(p.tags || []).slice(0,3).map(t => `<span class="tag-chip">${escHtml(t)}</span>`).join('')}</td>
      <td class="mono">${(p.acceptance || 0).toFixed(1)}%</td>
      <td>
        <label class="toggle">
          <input type="checkbox" ${p.premium ? 'checked' : ''} onchange="togglePremium('${p._id}', this)">
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn btn-ghost btn-sm" onclick="openEditModal('${p._id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProblemById('${p._id}', '${escHtml(p.title).replace(/'/g,"\\'")}', ${p.number})">🗑</button>
        </div>
      </td>
    </tr>`).join('');
}

// ── Filter ────────────────────────────────────
function filterProblems() {
  const q    = (document.getElementById('prob-search')?.value || '').toLowerCase();
  const diff = document.getElementById('prob-diff')?.value || '';
  const prem = document.getElementById('show-premium')?.checked || false;

  const filtered = allProblems.filter(p => {
    const matchQ    = !q    || p.title.toLowerCase().includes(q) || (p.tags || []).some(t => t.toLowerCase().includes(q));
    const matchDiff = !diff || p.difficulty === diff;
    const matchPrem = !prem || p.premium;
    return matchQ && matchDiff && matchPrem;
  });
  renderProblemsTable(filtered);
}

// ── Add modal ─────────────────────────────────
function openAddModal() {
  editingId = null;
  document.getElementById('modal-prob-title').textContent = '+ Add New Problem';
  document.getElementById('pm-save-btn').textContent = 'Add Problem';
  const ids = ['pm-title','pm-tags','pm-companies','pm-desc','pm-ex-in','pm-ex-out',
                'pm-ex-exp','pm-constraints','pm-hints','pm-testcases','pm-py','pm-cpp','pm-java','pm-js'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const sel = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  sel('pm-diff', 'Medium');
  sel('pm-acceptance', '50');
  sel('pm-premium', 'false');
  openModal('modal-problem');
}

// ── Edit modal ────────────────────────────────
function openEditModal(id) {
  const p = allProblems.find(x => x._id === id);
  if (!p) { toast('Problem not found in cache — try refreshing', 'error'); return; }
  editingId = id;

  document.getElementById('modal-prob-title').textContent = `✏️ Edit — #${p.number} ${p.title}`;
  document.getElementById('pm-save-btn').textContent = 'Save Changes';

  const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val ?? ''; };
  set('pm-title',       p.title);
  set('pm-diff',        p.difficulty);
  set('pm-tags',        (p.tags || []).join(', '));
  set('pm-companies',   (p.companies || []).join(', '));
  set('pm-acceptance',  p.acceptance || 50);
  set('pm-premium',     p.premium ? 'true' : 'false');
  set('pm-desc',        p.description || '');
  set('pm-ex-in',       p.examples?.[0]?.input || '');
  set('pm-ex-out',      p.examples?.[0]?.output || '');
  set('pm-ex-exp',      p.examples?.[0]?.explanation || '');
  set('pm-constraints', (p.constraints || []).join('\n'));
  set('pm-hints',       (p.hints || []).join('\n'));
  set('pm-testcases',   p.testCases?.length ? JSON.stringify(p.testCases, null, 2) : '');
  set('pm-py',          p.starter?.python || '');
  set('pm-cpp',         p.starter?.cpp || '');
  set('pm-java',        p.starter?.java || '');
  set('pm-js',          p.starter?.javascript || '');

  openModal('modal-problem');
}

// ── Save (create or update) ───────────────────
async function saveProblem() {
  const title = document.getElementById('pm-title')?.value.trim();
  const desc  = document.getElementById('pm-desc')?.value.trim();
  const exIn  = document.getElementById('pm-ex-in')?.value.trim();
  const exOut = document.getElementById('pm-ex-out')?.value.trim();

  if (!title) { toast('Title is required', 'error'); return; }
  if (!desc)  { toast('Description is required', 'error'); return; }
  if (!exIn || !exOut) { toast('Example input and output are required', 'error'); return; }

  let testCases = [];
  const tcRaw = document.getElementById('pm-testcases')?.value.trim();
  if (tcRaw) {
    try { testCases = JSON.parse(tcRaw); }
    catch { toast('Test Cases must be valid JSON — e.g. [{"input":"...","expected":"..."}]', 'error'); return; }
  }

  const payload = {
    title,
    difficulty:  document.getElementById('pm-diff')?.value || 'Medium',
    tags:        (document.getElementById('pm-tags')?.value || '').split(',').map(t => t.trim()).filter(Boolean),
    companies:   (document.getElementById('pm-companies')?.value || '').split(',').map(c => c.trim()).filter(Boolean),
    acceptance:  parseFloat(document.getElementById('pm-acceptance')?.value) || 50,
    premium:     document.getElementById('pm-premium')?.value === 'true',
    description: desc,
    examples:    [{ input: exIn, output: exOut, explanation: document.getElementById('pm-ex-exp')?.value.trim() || '' }],
    constraints: (document.getElementById('pm-constraints')?.value || '').split('\n').map(c => c.trim()).filter(Boolean),
    hints:       (document.getElementById('pm-hints')?.value || '').split('\n').map(h => h.trim()).filter(Boolean),
    testCases,
    starter: {
      python:     document.getElementById('pm-py')?.value  || '',
      cpp:        document.getElementById('pm-cpp')?.value || '',
      java:       document.getElementById('pm-java')?.value || '',
      javascript: document.getElementById('pm-js')?.value  || '',
    },
  };

  const btn = document.getElementById('pm-save-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving…';

  try {
    if (editingId) {
      await apiFetch(`/api/problems/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      toast(`Updated: ${title}`, 'success');
    } else {
      const result = await apiFetch('/api/problems', { method: 'POST', body: JSON.stringify(payload) });
      toast(`Added: ${title} (#${result.number})`, 'success');
    }
    closeModal('modal-problem');
    loadProblems();
  } catch (e) {
    toast('Save failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = editingId ? 'Save Changes' : 'Add Problem';
  }
}

// ── Toggle premium ────────────────────────────
async function togglePremium(id, checkbox) {
  const prev = checkbox.checked;
  try {
    const result = await apiFetch(`/api/problems/${id}/toggle-premium`, { method: 'PATCH' });
    checkbox.checked = result.premium;
    const p = allProblems.find(x => x._id === id);
    if (p) p.premium = result.premium;
    updateMiniStats(allProblems);
    toast(`Premium ${result.premium ? 'enabled ' : 'disabled'}`, 'success');
  } catch (e) {
    checkbox.checked = prev;
    toast('Toggle failed: ' + e.message, 'error');
  }
}

// ── Delete by MongoDB _id ─────────────────────
function deleteProblemById(id, title, number) {
  cfConfirm(
    `Delete "${title}"?`,
    `Problem #${number} will be permanently deleted and all remaining problems renumbered.`,
    async () => {
      try {
        const result = await apiFetch(`/api/problems/${id}`, { method: 'DELETE' });
        toast(result.message, 'success');
        loadProblems();
      } catch (e) {
        toast('Delete failed: ' + e.message, 'error');
      }
    }
  );
}

// ── Delete by number modal ────────────────────
function openDeleteModal() {
  deleteTarget = null;
  const numEl = document.getElementById('del-num');
  const prevEl = document.getElementById('del-preview');
  const confirmBtn = document.getElementById('del-confirm-btn');
  if (numEl)     numEl.value = '';
  if (prevEl)    { prevEl.style.display = 'none'; prevEl.innerHTML = ''; }
  if (confirmBtn) confirmBtn.disabled = true;
  openModal('modal-delete-num');
}

async function previewDelete() {
  const num = parseInt(document.getElementById('del-num')?.value);
  const prevEl = document.getElementById('del-preview');
  const confirmBtn = document.getElementById('del-confirm-btn');
  if (!num || num < 1) { toast('Enter a valid problem number', 'error'); return; }

  const prob = allProblems.find(p => p.number === num);
  if (!prevEl) return;

  if (!prob) {
    prevEl.style.display = 'block';
    prevEl.innerHTML = `<span style="color:var(--red)">Problem #${num} not found.</span>`;
    if (confirmBtn) confirmBtn.disabled = true;
    deleteTarget = null;
    return;
  }

  deleteTarget = { id: prob._id, num, title: prob.title };
  prevEl.style.display = 'block';
  prevEl.innerHTML = `
    <div class="preview-found">
      <strong>Found:</strong> #${prob.number} — ${escHtml(prob.title)}
      <span class="badge badge-${prob.difficulty.toLowerCase()}">${prob.difficulty}</span>
    </div>
    <div class="preview-note">
      After deletion, problems #${num + 1}…${allProblems.length} will be renumbered to
      #${num}…${allProblems.length - 1}.
    </div>`;
  if (confirmBtn) confirmBtn.disabled = false;
}

async function confirmDeleteByNum() {
  if (!deleteTarget) return;
  const btn = document.getElementById('del-confirm-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Deleting…'; }
  try {
    const result = await apiFetch(`/api/problems/number/${deleteTarget.num}`, { method: 'DELETE' });
    toast(result.message, 'success');
    closeModal('modal-delete-num');
    loadProblems();
  } catch (e) {
    toast('Delete failed: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Delete & Renumber'; }
  }
}

// ── Upload JSON file ──────────────────────────
async function uploadJSON(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = ''; // reset so same file can be re-uploaded

  let parsed;
  try {
    const text = await file.text();
    parsed = JSON.parse(text);
  } catch {
    toast('Invalid JSON file — must be valid JSON', 'error');
    return;
  }

  const problems = Array.isArray(parsed) ? parsed : [parsed];
  if (!problems.length || !problems[0].title) {
    toast('JSON must contain problem objects with at least a "title" field', 'error');
    return;
  }

  const uploadBtn = document.querySelector('[onclick*="json-upload"]');
  if (uploadBtn) { uploadBtn.disabled = true; uploadBtn.innerHTML = '<span class="spinner"></span> Uploading…'; }

  try {
    const result = await apiFetch('/api/problems/bulk', {
      method: 'POST',
      body: JSON.stringify({ problems }),
    });
    const added   = result.results.filter(r => r.status === 'added').length;
    const skipped = result.results.filter(r => r.status === 'skipped').length;
    toast(` ${added} problem${added !== 1 ? 's' : ''} added, ${skipped} skipped (duplicates)`, 'success');
    loadProblems();
  } catch (e) {
    toast('Upload failed: ' + e.message, 'error');
  } finally {
    if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.textContent = 'Upload JSON'; }
  }
}

// ── Utility ───────────────────────────────────
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
