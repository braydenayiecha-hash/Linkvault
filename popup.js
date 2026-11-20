const listEl = document.getElementById('list');
const searchEl = document.getElementById('search');
const filterEl = document.getElementById('filterCat');
const countEl = document.getElementById('count');

function autoTag(url, title) {
  const s = (url + ' ' + title).toLowerCase();
  if (/github|stackoverflow|npm|vscode|mdn|dev\.|code|api/.test(s)) return 'dev';
  if (/udemy|coursera|medium|wikipedia|docs|tutorial|learn|course|elearning/.test(s)) return 'learn';
  if (/youtube|netflix|tiktok|vimeo|video/.test(s)) return 'video';
  if (/twitter|x\.com|instagram|facebook|linkedin|reddit/.test(s)) return 'social';
  if (/amazon|jumia|aliexpress|shop|store|checkout|price/.test(s)) return 'shop';
  return 'other';
}

async function getSaved() {
  const { links = [] } = await chrome.storage.local.get('links');
  return links;
}
async function setSaved(links) {
  await chrome.storage.local.set({ links });
}

async function saveTabs(tabs) {
  let links = await getSaved();
  for (const t of tabs) {
    if (!t.url || t.url.startsWith('chrome://')) continue;
    if (links.some(l => l.url === t.url)) continue;
    links.unshift({
      url: t.url,
      title: t.title || t.url,
      cat: autoTag(t.url, t.title || ''),
      date: new Date().toLocaleString()
    });
  }
  await setSaved(links);
  render();
}

document.getElementById('saveOne').onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await saveTabs([tab]);
};

document.getElementById('saveAll').onclick = async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  await saveTabs(tabs);
};

document.getElementById('clearAll').onclick = async () => {
  if (confirm('Delete all saved links?')) {
    await setSaved([]);
    render();
  }
};

searchEl.oninput = render;
filterEl.onchange = render;

async function render() {
  const links = await getSaved();
  const q = searchEl.value.toLowerCase();
  const cat = filterEl.value;

  const filtered = links.filter(l =>
    (cat === 'all' || l.cat === cat) &&
    (l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q))
  );

  countEl.textContent = `${filtered.length} / ${links.length} saved`;
  listEl.innerHTML = filtered.map((l, i) => `
    <div class="item">
      <a href="${l.url}" target="_blank">${l.title}</a>
      <small>${new URL(l.url).hostname} • ${l.date}</small><br>
      <span class="badge">${l.cat}</span>
      <div class="row">
        <button class="open" data-open="${l.url}">Open</button>
        <button class="del" data-del="${l.url}">Delete</button>
      </div>
    </div>
  `).join('') || '<p style="color:#64748b">No links yet. Save this tab to start.</p>';

  listEl.querySelectorAll('[data-del]').forEach(b => {
    b.onclick = async () => {
      let links = await getSaved();
      links = links.filter(x => x.url !== b.dataset.del);
      await setSaved(links);
      render();
    };
  });
  listEl.querySelectorAll('[data-open]').forEach(b => {
    b.onclick = () => chrome.tabs.create({ url: b.dataset.open });
  });
}

render();