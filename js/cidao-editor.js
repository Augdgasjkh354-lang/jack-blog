(() => {
  'use strict';

  /**
   * 词刀「刀稿」轻量编辑器
   *
   * 整合点：
   * 1. 默认草稿保存到 localStorage.cidao_drafts
   * 2. 默认从草稿转成的词条保存到 localStorage.cidao_user_words
   * 3. 如果主应用已经有自己的写入逻辑，可在载入本脚本前设置：
   *
   * window.CIDAO_EDITOR_CONFIG = {
   *   draftsKey: 'cidao_drafts',
   *   userWordsKey: 'cidao_user_words',
   *   homeHref: './index.html'
   * };
   *
   * window.CIDAO_WORDS_INTEGRATION = {
   *   addWord(word) {
   *     // 可选：由主应用接管词条写入
   *   }
   * };
   */

  const config = Object.assign({
    draftsKey: 'cidao_drafts',
    userWordsKey: 'cidao_user_words',
    themeKey: 'cidao_theme',
    homeHref: './index.html'
  }, window.CIDAO_EDITOR_CONFIG || {});

  const $ = (id) => document.getElementById(id);

  const els = {
    themeBtn: $('themeBtn'),
    newDraftBtn: $('newDraftBtn'),
    emptyNewBtn: $('emptyNewBtn'),
    exportAllBtn: $('exportAllBtn'),
    draftSearch: $('draftSearch'),
    draftList: $('draftList'),
    emptyState: $('emptyState'),
    editorPanel: $('editorPanel'),
    draftTitle: $('draftTitle'),
    draftContent: $('draftContent'),
    saveState: $('saveState'),
    draftStats: $('draftStats'),
    draftTime: $('draftTime'),
    saveBtn: $('saveBtn'),
    exportMdBtn: $('exportMdBtn'),
    toWordBtn: $('toWordBtn'),
    deleteDraftBtn: $('deleteDraftBtn'),
    wordModal: $('wordModal'),
    wordField: $('wordField'),
    wrongField: $('wrongField'),
    rightField: $('rightField'),
    failField: $('failField'),
    borderField: $('borderField'),
    cancelWordBtn: $('cancelWordBtn'),
    saveWordBtn: $('saveWordBtn'),
    toast: $('toast')
  };

  let drafts = [];
  let activeId = null;
  let dirty = false;
  let saveTimer = null;

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function makeId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function formatTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('zh-CN', { hour12: false });
  }

  function plainPreview(text, max = 92) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    return clean.length > max ? `${clean.slice(0, max)}…` : clean;
  }

  function countText(text) {
    const s = String(text || '').trim();
    if (!s) return 0;
    const cjk = (s.match(/[\u3400-\u9fff]/g) || []).length;
    const latinWords = (s.replace(/[\u3400-\u9fff]/g, ' ').match(/[A-Za-z0-9]+(?:[-_'][A-Za-z0-9]+)*/g) || []).length;
    return cjk + latinWords;
  }

  function sanitizeFileName(name) {
    return String(name || 'untitled')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, '-')
      .slice(0, 80) || 'untitled';
  }

  function downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.hidden = false;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      els.toast.hidden = true;
    }, 1800);
  }

  function normalizeDraft(input) {
    const t = nowIso();
    return {
      id: input.id || makeId('draft'),
      title: input.title || '未命名草稿',
      content: input.content || '',
      createdAt: input.createdAt || t,
      updatedAt: input.updatedAt || t,
      linkedWordIds: Array.isArray(input.linkedWordIds) ? input.linkedWordIds : []
    };
  }

  function loadDrafts() {
    const loaded = readJson(config.draftsKey, []);
    drafts = Array.isArray(loaded) ? loaded.map(normalizeDraft) : [];
    drafts.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  function persistDrafts() {
    writeJson(config.draftsKey, drafts);
  }

  function currentDraft() {
    return drafts.find((d) => d.id === activeId) || null;
  }

  function createDraft() {
    const draft = normalizeDraft({
      title: '未命名草稿',
      content: ''
    });
    drafts.unshift(draft);
    activeId = draft.id;
    persistDrafts();
    render();
    focusEditor();
    toast('已新建草稿');
  }

  function focusEditor() {
    setTimeout(() => {
      els.draftTitle.focus();
      els.draftTitle.select();
    }, 0);
  }

  function selectDraft(id) {
    if (activeId === id) return;
    flushSave();
    activeId = id;
    render();
  }

  function deleteActiveDraft() {
    const draft = currentDraft();
    if (!draft) return;
    const ok = window.confirm(`确定删除草稿「${draft.title || '未命名草稿'}」？`);
    if (!ok) return;
    drafts = drafts.filter((d) => d.id !== draft.id);
    activeId = drafts[0]?.id || null;
    persistDrafts();
    render();
    toast('草稿已删除');
  }

  function updateActiveDraftFromInputs() {
    const draft = currentDraft();
    if (!draft) return;
    draft.title = els.draftTitle.value.trim() || '未命名草稿';
    draft.content = els.draftContent.value;
    draft.updatedAt = nowIso();
    dirty = true;
    updateMeta();
  }

  function scheduleSave() {
    updateActiveDraftFromInputs();
    els.saveState.textContent = '正在保存…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      flushSave();
    }, 520);
  }

  function flushSave() {
    if (!dirty) return;
    const draft = currentDraft();
    if (!draft) return;
    persistDrafts();
    dirty = false;
    els.saveState.textContent = '已保存';
    renderDraftList();
  }

  function updateMeta() {
    const draft = currentDraft();
    const count = countText(els.draftContent.value);
    els.draftStats.textContent = `${count} 字`;
    els.draftTime.textContent = draft ? `更新 ${formatTime(draft.updatedAt)}` : '—';
  }

  function render() {
    renderDraftList();
    renderEditor();
  }

  function getFilteredDrafts() {
    const q = els.draftSearch.value.trim().toLowerCase();
    if (!q) return drafts;
    return drafts.filter((d) => {
      return `${d.title}\n${d.content}`.toLowerCase().includes(q);
    });
  }

  function renderDraftList() {
    const filtered = getFilteredDrafts();
    els.draftList.innerHTML = '';

    if (!filtered.length) {
      const div = document.createElement('div');
      div.className = 'draft-item';
      div.innerHTML = '<div class="draft-title">没有匹配草稿</div><div class="draft-preview">换一个关键词，或新建一篇。</div>';
      els.draftList.appendChild(div);
      return;
    }

    for (const d of filtered) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `draft-item${d.id === activeId ? ' active' : ''}`;
      item.dataset.id = d.id;
      item.innerHTML = `
        <div class="draft-title">${escapeHtml(d.title || '未命名草稿')}</div>
        <div class="draft-preview">${escapeHtml(plainPreview(d.content) || '空白草稿')}</div>
        <div class="draft-date">${escapeHtml(formatTime(d.updatedAt))}</div>
      `;
      item.addEventListener('click', () => selectDraft(d.id));
      els.draftList.appendChild(item);
    }
  }

  function renderEditor() {
    const draft = currentDraft();

    if (!draft) {
      els.emptyState.hidden = false;
      els.editorPanel.hidden = true;
      return;
    }

    els.emptyState.hidden = true;
    els.editorPanel.hidden = false;
    els.draftTitle.value = draft.title || '';
    els.draftContent.value = draft.content || '';
    els.saveState.textContent = dirty ? '未保存' : '已保存';
    updateMeta();
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function exportActiveMarkdown() {
    const draft = currentDraft();
    if (!draft) return;
    flushSave();
    const md = [
      `# ${draft.title || '未命名草稿'}`,
      '',
      `- 创建：${formatTime(draft.createdAt)}`,
      `- 更新：${formatTime(draft.updatedAt)}`,
      '',
      '---',
      '',
      draft.content || ''
    ].join('\n');
    downloadText(`${sanitizeFileName(draft.title)}.md`, md, 'text/markdown;charset=utf-8');
    toast('已导出 Markdown');
  }

  function exportAllDrafts() {
    flushSave();
    const pack = {
      exportedAt: nowIso(),
      source: 'cidao-editor',
      drafts
    };
    downloadText(`cidao-drafts-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(pack, null, 2), 'application/json;charset=utf-8');
    toast('已导出全部草稿');
  }

  function openWordModal() {
    const draft = currentDraft();
    if (!draft) return;

    const selected = els.draftContent.value.slice(
      els.draftContent.selectionStart,
      els.draftContent.selectionEnd
    ).trim();

    els.wordField.value = selected && selected.length <= 18 ? selected : cleanTitleAsWord(draft.title);
    els.wrongField.value = '';
    els.rightField.value = '';
    els.failField.value = '';
    els.borderField.value = '';

    els.wordModal.hidden = false;
    setTimeout(() => els.wordField.focus(), 0);
  }

  function cleanTitleAsWord(title) {
    return String(title || '')
      .replace(/^关于/, '')
      .replace(/[：:｜|].*$/, '')
      .trim()
      .slice(0, 18);
  }

  function closeWordModal() {
    els.wordModal.hidden = true;
  }

  function saveWordFromModal() {
    const draft = currentDraft();
    if (!draft) return;

    const word = {
      id: makeId('user_entry'),
      word: els.wordField.value.trim(),
      wrong: els.wrongField.value.trim(),
      right: els.rightField.value.trim(),
      fail: els.failField.value.trim(),
      border: els.borderField.value.trim(),
      createdAt: nowIso(),
      source: 'draft',
      sourceDraftId: draft.id
    };

    if (!word.word) {
      toast('请填写词语');
      els.wordField.focus();
      return;
    }

    if (!word.right) {
      toast('请至少填写正解');
      els.rightField.focus();
      return;
    }

    if (window.CIDAO_WORDS_INTEGRATION && typeof window.CIDAO_WORDS_INTEGRATION.addWord === 'function') {
      window.CIDAO_WORDS_INTEGRATION.addWord(word);
    } else {
      const existing = readJson(config.userWordsKey, []);
      const list = Array.isArray(existing) ? existing : [];
      list.push(word);
      writeJson(config.userWordsKey, list);
    }

    draft.linkedWordIds = Array.from(new Set([...(draft.linkedWordIds || []), word.id]));
    draft.updatedAt = nowIso();
    persistDrafts();

    window.dispatchEvent(new CustomEvent('cidao:word-created', { detail: { word } }));
    closeWordModal();
    render();
    toast('已保存为词条');
  }

  function applyTheme(theme) {
    document.body.setAttribute('data-t', theme);
    els.themeBtn.textContent = theme === 'dark' ? '日间' : '夜间';
    localStorage.setItem(config.themeKey, theme);
  }

  function toggleTheme() {
    const next = document.body.getAttribute('data-t') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }

  function bindEvents() {
    els.themeBtn.addEventListener('click', toggleTheme);
    els.newDraftBtn.addEventListener('click', createDraft);
    els.emptyNewBtn.addEventListener('click', createDraft);
    els.exportAllBtn.addEventListener('click', exportAllDrafts);
    els.draftSearch.addEventListener('input', renderDraftList);

    els.draftTitle.addEventListener('input', scheduleSave);
    els.draftContent.addEventListener('input', scheduleSave);

    els.saveBtn.addEventListener('click', () => {
      updateActiveDraftFromInputs();
      flushSave();
      toast('已保存');
    });

    els.exportMdBtn.addEventListener('click', exportActiveMarkdown);
    els.toWordBtn.addEventListener('click', openWordModal);
    els.deleteDraftBtn.addEventListener('click', deleteActiveDraft);

    els.cancelWordBtn.addEventListener('click', closeWordModal);
    els.saveWordBtn.addEventListener('click', saveWordFromModal);

    els.wordModal.addEventListener('click', (event) => {
      if (event.target === els.wordModal) closeWordModal();
    });

    window.addEventListener('beforeunload', () => {
      updateActiveDraftFromInputs();
      flushSave();
    });

    window.addEventListener('keydown', (event) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault();
        updateActiveDraftFromInputs();
        flushSave();
        toast('已保存');
      }
      if (mod && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        createDraft();
      }
      if (event.key === 'Escape' && !els.wordModal.hidden) {
        closeWordModal();
      }
    });
  }

  function init() {
    const theme = localStorage.getItem(config.themeKey) || 'light';
    applyTheme(theme);

    const homeLink = document.querySelector('.top-actions a[href="./index.html"]');
    if (homeLink) homeLink.setAttribute('href', config.homeHref);

    loadDrafts();
    activeId = drafts[0]?.id || null;
    bindEvents();
    render();
  }

  init();
})();
