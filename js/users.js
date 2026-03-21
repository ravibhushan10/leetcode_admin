
let allUsers = [];


async function loadUsers() {
  document.getElementById('users-body').innerHTML =
    '<tr><td colspan="7" class="loading-row"><span class="spinner"></span> Loading…</td></tr>';
  try {
    allUsers = await apiFetch('/api/users');
    renderUsersTable(allUsers);
  } catch (e) {
    toast('Failed to load users: ' + e.message, 'error');
    document.getElementById('users-body').innerHTML =
      `<tr><td colspan="7" class="loading-row" style="color:var(--red)">Error: ${e.message}</td></tr>`;
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-body');
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-row">No users found.</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr class="${u.isAdmin ? 'admin-row' : ''}">
      <td>
        <div class="user-cell">
          <div class="user-avatar">${escHtml(u.initials || '??')}</div>
          <div>
            <div class="user-name">${escHtml(u.name)}</div>
            ${u.isAdmin ? '<span class="badge badge-orange" style="font-size:.62rem">Admin</span>' : ''}
          </div>
        </div>
      </td>
      <td class="muted" style="font-size:.8rem">${escHtml(u.email)}</td>
      <td class="mono text-purple">${u.rating || 0}</td>
      <td class="mono">${(u.solved || []).length}</td>
      <td>
        <span class="badge ${u.plan === 'pro' ? 'badge-green' : 'badge-info'}">${u.plan || 'free'}</span>
      </td>
      <td class="muted" style="font-size:.78rem">${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-ghost btn-sm" onclick="toggleUserPro('${u._id}', '${u.plan}')">
            ${u.plan === 'pro' ? 'Revoke Pro' : ' Pro'}
          </button>
          ${!u.isAdmin
            ? `<button class="btn btn-danger btn-sm" onclick="deleteUser('${u._id}', '${escHtml(u.name).replace(/'/g,"\\'")}')">🗑</button>`
            : ''}
        </div>
      </td>
    </tr>`).join('');
}


async function toggleUserPro(id, currentPlan) {
  try {
    const result = await apiFetch(`/api/users/${id}/plan`, { method: 'PATCH' });
    const u = allUsers.find(x => x._id === id);
    if (u) u.plan = result.plan;
    renderUsersTable(allUsers);
    toast(`User plan updated to ${result.plan}`, 'success');
  } catch (e) {
    toast('Update failed: ' + e.message, 'error');
  }
}


function deleteUser(id, name) {
  cfConfirm(
    `Delete user "${name}"?`,
    'All their data including submissions and progress will be permanently removed.',
    async () => {
      try {
        await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
        toast(`User "${name}" deleted`, 'success');
        loadUsers();
      } catch (e) {
        toast('Delete failed: ' + e.message, 'error');
      }
    }
  );
}


function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
