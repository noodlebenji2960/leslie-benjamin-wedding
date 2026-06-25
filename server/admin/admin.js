const $ = id => document.getElementById(id);

// ── Auth ──────────────────────────────────────────────────────
async function tryLogin(password) {
  const r = await fetch('/admin/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ password }),
  });
  return r.ok;
}

$('login-btn').addEventListener('click', async () => {
  const pw = $('pw').value;
  if (!pw) return;
  $('login-btn').disabled = true;
  const ok = await tryLogin(pw);
  $('login-btn').disabled = false;
  if (ok) {
    showGallery();
  } else {
    $('login-error').textContent = 'Incorrect password.';
    $('login-error').style.display = 'block';
  }
});

$('pw').addEventListener('keydown', e => { if (e.key === 'Enter') $('login-btn').click(); });

$('logout-btn').addEventListener('click', async () => {
  await fetch('/admin/api/logout', { method: 'POST', credentials: 'same-origin' });
  location.reload();
});

// ── Forgot password ───────────────────────────────────────────
function showCard(id) {
  for (const c of ['login-card', 'forgot-card', 'reset-card']) {
    $(c).style.display = c === id ? '' : 'none';
  }
}

$('forgot-link').addEventListener('click', () => {
  $('forgot-error').style.display = 'none';
  $('forgot-info').style.display = 'none';
  showCard('forgot-card');
});

$('back-to-login-link-1').addEventListener('click', () => showCard('login-card'));
$('back-to-login-link-2').addEventListener('click', () => showCard('login-card'));

$('send-otp-btn').addEventListener('click', async () => {
  $('send-otp-btn').disabled = true;
  $('forgot-error').style.display = 'none';
  try {
    const r = await fetch('/admin/api/forgot-password', { method: 'POST', credentials: 'same-origin' });
    if (r.ok) {
      $('forgot-info').textContent = 'Code sent. Check your email.';
      $('forgot-info').style.display = 'block';
      $('otp').value = '';
      $('new-pw').value = '';
      $('reset-error').style.display = 'none';
      showCard('reset-card');
    } else {
      const data = await r.json().catch(() => ({}));
      $('forgot-error').textContent = data.error || 'Failed to send code.';
      $('forgot-error').style.display = 'block';
    }
  } finally {
    $('send-otp-btn').disabled = false;
  }
});

$('reset-btn').addEventListener('click', async () => {
  const otp = $('otp').value.trim();
  const newPassword = $('new-pw').value;
  if (!otp || !newPassword) return;

  $('reset-btn').disabled = true;
  $('reset-error').style.display = 'none';
  try {
    const r = await fetch('/admin/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ otp, newPassword }),
    });
    if (r.ok) {
      showCard('login-card');
      $('pw').value = '';
      $('login-error').style.display = 'none';
      toast('Password updated. Please sign in.');
    } else {
      const data = await r.json().catch(() => ({}));
      $('reset-error').textContent = data.error || 'Failed to reset password.';
      $('reset-error').style.display = 'block';
    }
  } finally {
    $('reset-btn').disabled = false;
  }
});

// ── State ─────────────────────────────────────────────────────
const PAGE_SIZE = 24;
let images = [];
let reactionDetails = {};
let cursor = null;
let hasMore = false;
let loadingMore = false;
let totalCount = 0;
let observer = null;

// ── API helpers ───────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, credentials: 'same-origin' };
  if (body) { opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify(body); }
  return fetch(path, opts);
}

async function fetchReactionDetailsFor(imgList) {
  await Promise.all(imgList.map(async img => {
    const r2 = await api('GET', `/reactions/${img.id}`);
    if (r2.ok) reactionDetails[img.id] = await r2.json();
  }));
}

async function loadGallery() {
  const r = await api('GET', `/gallery?limit=${PAGE_SIZE}`);
  if (!r.ok) return;
  const data = await r.json();
  images = data.images;
  cursor = data.nextCursor;
  hasMore = Boolean(data.nextCursor);
  totalCount = data.total;
  reactionDetails = {};
  await fetchReactionDetailsFor(data.images);
  renderGrid();
}

async function loadMore() {
  if (!hasMore || loadingMore) return;
  loadingMore = true;
  try {
    const r = await api('GET', `/gallery?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}`);
    if (!r.ok) return;
    const data = await r.json();
    images = images.concat(data.images);
    cursor = data.nextCursor;
    hasMore = Boolean(data.nextCursor);
    totalCount = data.total;
    await fetchReactionDetailsFor(data.images);
    appendCards(data.images);
    updateSubtitle();
  } finally {
    loadingMore = false;
  }
}

function updateSubtitle() {
  $('subtitle').textContent = totalCount + ' photo' + (totalCount !== 1 ? 's' : '');
}

function getSentinel() {
  return document.getElementById('scroll-sentinel');
}

function attachObserver() {
  const sentinel = getSentinel();
  if (!sentinel) return;
  if (!observer) {
    observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && hasMore && !loadingMore) loadMore();
    }, { rootMargin: '400px 0px', threshold: 0 });
  } else {
    observer.disconnect();
  }
  observer.observe(sentinel);
}

function appendCards(imgList) {
  const grid = document.querySelector('#grid-container .grid');
  if (!grid) return;
  const sentinel = getSentinel();
  for (const img of imgList) {
    const card = buildCard(img);
    if (sentinel) grid.insertBefore(card, sentinel);
    else grid.appendChild(card);
  }
}

// ── Render ────────────────────────────────────────────────────
function renderGrid() {
  updateSubtitle();
  $('download-btn').style.display = images.length > 0 ? '' : 'none';

  const container = $('grid-container');
  if (images.length === 0) {
    container.innerHTML = '<p class="empty">No photos uploaded yet.</p>';
    return;
  }

  container.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'grid';

  for (const img of images) {
    grid.appendChild(buildCard(img));
  }

  const sentinel = document.createElement('div');
  sentinel.id = 'scroll-sentinel';
  grid.appendChild(sentinel);

  container.appendChild(grid);
  attachObserver();
}

function buildCard(img) {
  const date = new Date(img.uploadedAt).toLocaleString();
  const kb = Math.round(img.fileSize / 1024);
  const details = reactionDetails[img.id] ?? [];

  const card = document.createElement('div');
  card.className = 'card';
  card.id = 'card-' + img.id;

  // thumbnail
  const thumb = document.createElement('img');
  thumb.src = img.thumbnailUrl;
  thumb.loading = 'lazy';
  card.appendChild(thumb);

  // meta
  const meta = document.createElement('div');
  meta.className = 'card-meta';
  const dateEl = document.createElement('span');
  dateEl.className = 'date';
  dateEl.textContent = date;
  const sizeEl = document.createElement('span');
  sizeEl.className = 'size';
  sizeEl.textContent = kb + ' KB';
  meta.appendChild(dateEl);
  meta.appendChild(sizeEl);
  card.appendChild(meta);

  // reactions
  const reactionNameBtns = [];
  if (details.length > 0) {
    const grouped = {};
    for (const { emoji, name, visitorId } of details) {
      (grouped[emoji] = grouped[emoji] || []).push({ name, visitorId });
    }

    const reactionsEl = document.createElement('div');
    reactionsEl.className = 'card-reactions';

    for (const [emoji, entries] of Object.entries(grouped)) {
      const row = document.createElement('div');
      row.className = 'reaction-row';

      const emojiEl = document.createElement('span');
      emojiEl.className = 'reaction-emoji';
      emojiEl.textContent = emoji;

      const namesEl = document.createElement('span');
      namesEl.className = 'reaction-names';

      entries.forEach(({ name, visitorId }, i) => {
        const nameBtn = document.createElement('button');
        nameBtn.className = 'reaction-name-chip';
        nameBtn.textContent = name;
        nameBtn.title = 'Click to rename';
        nameBtn.disabled = true;
        nameBtn.addEventListener('click', async () => {
          const newName = prompt('Rename this reactor:', name);
          if (newName === null) return;
          await api('POST', '/admin/api/reactions/rename/' + img.id + '/' + encodeURIComponent(visitorId), { name: newName });
          const r2 = await api('GET', '/reactions/' + img.id);
          if (r2.ok) reactionDetails[img.id] = await r2.json();
          const old = document.getElementById('card-' + img.id);
          if (old) old.replaceWith(buildCard(img));
          toast('Reactor renamed');
        });
        reactionNameBtns.push(nameBtn);
        namesEl.appendChild(nameBtn);
        if (i < entries.length - 1) namesEl.appendChild(document.createTextNode(', '));
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'reaction-del edit-only';
      delBtn.textContent = '✕';
      delBtn.title = 'Remove this reaction';
      delBtn.addEventListener('click', async () => {
        const r = await api('POST', '/admin/api/reactions/delete/' + img.id + '/' + encodeURIComponent(emoji));
        if (r.ok) {
          const data = await r.json();
          img.reactions = data.reactions;
        }
        const r2 = await api('GET', '/reactions/' + img.id);
        if (r2.ok) reactionDetails[img.id] = await r2.json();
        const old = document.getElementById('card-' + img.id);
        if (old) old.replaceWith(buildCard(img));
        toast('Reaction removed');
      });

      row.appendChild(emojiEl);
      row.appendChild(namesEl);
      row.appendChild(delBtn);
      reactionsEl.appendChild(row);
    }

    card.appendChild(reactionsEl);
  }

  // edit name
  const editForm = document.createElement('div');
  editForm.className = 'edit-form';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = 'uploader-name-' + img.id;
  nameInput.className = 'name-input';
  nameInput.value = img.uploaderName || '';
  nameInput.placeholder = 'Anonymous';
  nameInput.maxLength = 100;
  nameInput.disabled = true;
  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !nameInput.disabled) editBtn.click();
  });
  const nameInputLabel = document.createElement('label');
  nameInputLabel.textContent = 'Uploader';
  nameInputLabel.setAttribute('for', nameInput.id);
  editForm.appendChild(nameInputLabel);
  editForm.appendChild(nameInput);
  card.appendChild(editForm);

  // toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'card-toolbar';

  const editBtn = document.createElement('button');
  editBtn.className = 'toolbar-btn';
  editBtn.innerHTML = '✎';
  editBtn.title = 'Edit uploader name';

  const downloadBtn = document.createElement('a');
  downloadBtn.className = 'toolbar-btn';
  downloadBtn.innerHTML = '⬇';
  downloadBtn.title = 'Download photo';
  downloadBtn.href = img.url;
  downloadBtn.download = img.filename;
  toolbar.appendChild(downloadBtn);

  const clearReactionsBtn = document.createElement('button');
  clearReactionsBtn.className = 'toolbar-btn edit-only';
  clearReactionsBtn.innerHTML = '⟲';
  clearReactionsBtn.title = 'Clear all reactions';
  clearReactionsBtn.disabled = details.length === 0;
  clearReactionsBtn.addEventListener('click', async () => {
    if (!confirm('Remove all reactions from this photo?')) return;
    await api('POST', '/admin/api/reactions/clear/' + img.id);
    img.reactions = {};
    reactionDetails[img.id] = [];
    const old = document.getElementById('card-' + img.id);
    if (old) old.replaceWith(buildCard(img));
    toast('Reactions cleared');
  });
  toolbar.appendChild(clearReactionsBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'toolbar-btn toolbar-btn--danger edit-only';
  deleteBtn.innerHTML = '🗑';
  deleteBtn.title = 'Delete photo';
  deleteBtn.addEventListener('click', async () => {
    if (!confirm('Delete this photo?')) return;
    await api('POST', '/admin/api/delete/' + img.id);
    images = images.filter(i => i.id !== img.id);
    delete reactionDetails[img.id];
    renderGrid();
    toast('Photo deleted');
  });
  toolbar.appendChild(deleteBtn);

  editBtn.addEventListener('click', async () => {
    const isEditing = editBtn.dataset.editing === 'true';
    if (!isEditing) {
      editBtn.dataset.editing = 'true';
      editBtn.innerHTML = '✓';
      editBtn.title = 'Save uploader name';
      nameInput.disabled = false;
      reactionNameBtns.forEach(btn => { btn.disabled = false; });
      card.classList.add('is-editing');
    } else {
      await api('POST', '/admin/api/update/' + img.id, { uploaderName: nameInput.value });
      img.uploaderName = nameInput.value || null;
      editBtn.dataset.editing = 'false';
      editBtn.innerHTML = '✎';
      editBtn.title = 'Edit uploader name';
      nameInput.disabled = true;
      reactionNameBtns.forEach(btn => { btn.disabled = true; });
      card.classList.remove('is-editing');
      toast('Name saved');
    }
  });
  toolbar.insertBefore(editBtn, toolbar.firstChild);

  card.appendChild(toolbar);

  return card;
}

// ── SSE live updates ──────────────────────────────────────────
function connectSSE() {
  const es = new EventSource('/events');

  es.addEventListener('new-image', async e => {
    const img = JSON.parse(e.data);
    if (!images.find(i => i.id === img.id)) {
      images.unshift(img);
      reactionDetails[img.id] = [];
      totalCount += 1;
      const grid = document.querySelector('#grid-container .grid');
      if (grid) {
        grid.insertBefore(buildCard(img), grid.firstChild);
        updateSubtitle();
        $('download-btn').style.display = '';
      } else {
        renderGrid();
      }
    }
  });

  es.addEventListener('delete-image', e => {
    const { id } = JSON.parse(e.data);
    images = images.filter(i => i.id !== id);
    delete reactionDetails[id];
    totalCount = Math.max(0, totalCount - 1);
    const card = document.getElementById('card-' + id);
    if (card) {
      card.remove();
      updateSubtitle();
      if (images.length === 0) renderGrid();
    } else {
      renderGrid();
    }
  });

  es.addEventListener('update-image', e => {
    const { id, uploaderName } = JSON.parse(e.data);
    const img = images.find(i => i.id === id);
    if (img) { img.uploaderName = uploaderName; renderGrid(); }
  });

  es.addEventListener('react-image', async e => {
    const { id, reactions } = JSON.parse(e.data);
    const img = images.find(i => i.id === id);
    if (img) {
      if (reactions) img.reactions = reactions;
      delete reactionDetails[id]; // force re-fetch of names on next render
      const r = await api('GET', '/reactions/' + id);
      if (r.ok) reactionDetails[id] = await r.json();
      const old = document.getElementById('card-' + id);
      if (old) old.replaceWith(buildCard(img));
    }
  });

  es.addEventListener('clear-all', () => {
    images = [];
    reactionDetails = {};
    cursor = null;
    hasMore = false;
    totalCount = 0;
    renderGrid();
  });

  es.onopen = () => $('live-dot').classList.add('connected');
  es.onerror = () => {
    $('live-dot').classList.remove('connected');
    es.close();
    setTimeout(connectSSE, 5000);
  };
}

// ── Service controls ────────────────────────────────────────────
function applyServiceStatus({ uploadsDisabled, galleryApiDisabled }) {
  const uploadsBtn = $('toggle-uploads-btn');
  const uploadsEffectivelyOff = uploadsDisabled || galleryApiDisabled;
  uploadsBtn.textContent = 'Uploads: ' + (uploadsEffectivelyOff ? 'off' : 'on') +
    (galleryApiDisabled && !uploadsDisabled ? ' (gallery disabled)' : '');
  uploadsBtn.classList.toggle('is-off', uploadsEffectivelyOff);
  uploadsBtn.disabled = galleryApiDisabled;
  uploadsBtn.title = galleryApiDisabled
    ? 'Re-enable the Gallery API to control uploads independently.'
    : '';

  const galleryBtn = $('toggle-gallery-btn');
  galleryBtn.textContent = 'Gallery API: ' + (galleryApiDisabled ? 'off' : 'on');
  galleryBtn.classList.toggle('is-off', galleryApiDisabled);
}

async function loadServiceStatus() {
  const r = await api('GET', '/admin/api/service-status');
  if (r.ok) applyServiceStatus(await r.json());
}

$('toggle-uploads-btn').addEventListener('click', async () => {
  const isOff = $('toggle-uploads-btn').classList.contains('is-off');
  const r = await api('POST', '/admin/api/service/uploads/' + (isOff ? 'on' : 'off'));
  if (r.ok) {
    applyServiceStatus(await r.json());
    toast(isOff ? 'Uploads enabled' : 'Uploads disabled');
  }
});

$('toggle-gallery-btn').addEventListener('click', async () => {
  const isOff = $('toggle-gallery-btn').classList.contains('is-off');
  const r = await api('POST', '/admin/api/service/gallery/' + (isOff ? 'on' : 'off'));
  if (r.ok) {
    applyServiceStatus(await r.json());
    toast(isOff ? 'Gallery API enabled' : 'Gallery API disabled');
  }
});

$('delete-all-btn').addEventListener('click', async () => {
  if (!confirm('Delete ALL photos and reactions? This cannot be undone.')) return;
  if (!confirm('Are you absolutely sure? This will permanently delete every photo.')) return;
  $('delete-all-btn').disabled = true;
  try {
    const r = await api('POST', '/admin/api/delete-all');
    if (r.ok) {
      images = [];
      reactionDetails = {};
      cursor = null;
      hasMore = false;
      loadingMore = false;
      totalCount = 0;
      renderGrid();
      toast('All photos deleted');
    }
  } finally {
    $('delete-all-btn').disabled = false;
  }
});

// ── Toast ─────────────────────────────────────────────────────
let toastTimer;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

// ── Boot ──────────────────────────────────────────────────────
async function showGallery() {
  $('login-screen').style.display = 'none';
  $('gallery-screen').style.display = 'block';
  await Promise.all([loadGallery(), loadServiceStatus()]);
  connectSSE();
}

// Check if already authenticated
(async () => {
  const r = await api('GET', '/admin/api/check');
  if (r.ok) showGallery();
})();
