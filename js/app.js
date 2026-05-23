/**
 * 词刀 Cidao - 主应用
 * 一把切开概念误区的词典
 */

class CidaoApp {
  constructor() {
    this.words = [];
    this.filteredWords = [];
    this.currentView = 'home';
    this.currentTheme = StorageManager.getTheme();
    this.searchQuery = '';
    this.PAGE_SIZE = 50;
    this.currentPage = 0;
    // 日记状态
    this.diaryMonth = this._getCurrentYearMonth();
  }

  _getCurrentYearMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  _getTodayDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  async init() {
    // 应用主题
    document.body.setAttribute('data-t', this.currentTheme);
    this._updateThemeBtn();

    // 密码锁
    this._setupLock();

    // 加载数据
    document.getElementById('mainView').innerHTML = '<div class="loading">正在加载词典数据…</div>';
    this.words = await StorageManager.initialize();
    this.filteredWords = this.words;

    // 绑定事件
    this._bindEvents();

    // 渲染首页
    this.renderHome();
  }

  // ===== 密码锁 =====
  _setupLock() {
    if (sessionStorage.getItem('cidao_unlocked') === '1') {
      document.getElementById('lockScreen').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      return;
    }

    document.getElementById('lockBtn').addEventListener('click', () => {
      const pwd = document.getElementById('lockPwd').value;
      if (pwd === 'jack') {
        sessionStorage.setItem('cidao_unlocked', '1');
        document.getElementById('lockScreen').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
      } else {
        document.getElementById('lockErr').textContent = '密码错误，请重试';
        document.getElementById('lockPwd').value = '';
      }
    });
  }

  // ===== 事件绑定 =====
  _bindEvents() {
    // 主题切换
    document.getElementById('themeBtn').addEventListener('click', () => {
      this.toggleTheme();
    });

    // 模态框关闭
    document.getElementById('modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal') this.closeModal();
    });

    // 底部 Tab 导航
    const tabBar = document.getElementById('tabBar');
    if (tabBar) {
      tabBar.addEventListener('click', (e) => {
        const item = e.target.closest('.tab-item');
        if (!item) return;
        const tab = item.dataset.tab;
        if (tab === 'draft') {
          window.location.href = './editor.html';
          return;
        }
        tabBar.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        item.classList.add('active');
        this.currentTab = tab;
        if (tab === 'dict') {
          this.switchView('home');
        } else if (tab === 'diary') {
          this.switchView('diary');
        }
      });
    }
  }

  // ===== 主题 =====
  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-t', this.currentTheme);
    StorageManager.saveTheme(this.currentTheme);
    this._updateThemeBtn();
  }

  _updateThemeBtn() {
    const btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
  }

  // ===== 视图切换 =====
  switchView(view) {
    this.currentView = view;
    const mainView = document.getElementById('mainView');
    mainView.className = 'content-area';

    switch (view) {
      case 'home': this.renderHome(); break;
      case 'browse': this.renderBrowse(); break;
      case 'random': this.renderRandom(); break;
      case 'today': this.renderToday(); break;
      case 'diary': this.renderDiary(); break;
      case 'diaryEdit': this.renderDiaryEdit(); break;
      default: this.renderHome();
    }
  }

  // ===== 日记列表 =====
  renderDiary() {
    const mainView = document.getElementById('mainView');
    const diaries = StorageManager.getDiariesByMonth(this.diaryMonth);
    const [year, month] = this.diaryMonth.split('-');
    const monthLabel = `${year}年${parseInt(month)}月`;

    mainView.innerHTML = `
      <div class="diary-view">
        <div class="diary-header">
          <button class="bn" onclick="app._diaryPrevMonth()">←</button>
          <span class="diary-month-label">${monthLabel}</span>
          <button class="bn" onclick="app._diaryNextMonth()">→</button>
        </div>
        <div class="diary-today-action">
          <button class="bn p" onclick="app._newDiary()">写新日记</button>
        </div>
        <div class="diary-list">
          ${diaries.length > 0 ? diaries.map(d => this._renderDiaryCard(d)).join('') : `
            <div class="empty-result">
              <div class="empty-result-icon">📓</div>
              <div class="empty-result-text">这个月还没有记录</div>
              <div class="empty-result-hint">写下第一篇吧</div>
            </div>
          `}
        </div>
      </div>
    `;
  }

  _renderDiaryCard(diary) {
    const date = new Date(diary.date + 'T00:00:00');
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    const monthDay = `${parseInt(diary.date.split('-')[1])}月${day}日`;
    const moods = { calm: '😌 平静', inspired: '✨ 受启发', confused: '🤔 困惑', tired: '😮‍💨 笫惫', grateful: '🙏 感恩' };
    const moodText = diary.mood && moods[diary.mood] ? moods[diary.mood] : '';
    const preview = diary.content ? this._truncate(diary.content, 80) : '空白日记';

    return `
      <div class="diary-card" onclick="app._editDiaryById('${diary.id}')">
        <div class="diary-card-head">
          <span class="diary-card-date">${monthDay} · ${weekday}</span>
          ${moodText ? `<span class="diary-card-mood">${moodText}</span>` : ''}
        </div>
        <div class="diary-card-content">${this._escapeHtml(preview)}</div>
      </div>
    `;
  }

  _diaryPrevMonth() {
    const [y, m] = this.diaryMonth.split('-').map(Number);
    const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    this.diaryMonth = prev;
    this.renderDiary();
  }

  _diaryNextMonth() {
    const [y, m] = this.diaryMonth.split('-').map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    this.diaryMonth = next;
    this.renderDiary();
  }

  _newDiary() {
    const today = this._getTodayDate();
    const diary = StorageManager.createDiary(today);
    if (diary) {
      this._currentDiaryId = diary.id;
      this.currentView = 'diaryEdit';
      this.renderDiaryEdit();
    }
  }

  _editDiaryById(id) {
    this._currentDiaryId = id;
    this.currentView = 'diaryEdit';
    this.renderDiaryEdit();
  }

  // ===== 日记编辑 =====
  renderDiaryEdit() {
    const mainView = document.getElementById('mainView');
    const diary = StorageManager.getDiaryById(this._currentDiaryId);
    if (!diary) {
      this.switchView('diary');
      return;
    }

    const date = new Date(diary.date + 'T00:00:00');
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dateLabel = `${parseInt(diary.date.split('-')[1])}月${date.getDate()}日 ${weekdays[date.getDay()]}`;

    const moods = [
      { key: 'calm', emoji: '😌', label: '平静' },
      { key: 'inspired', emoji: '✨', label: '受启发' },
      { key: 'confused', emoji: '🤔', label: '困惑' },
      { key: 'tired', emoji: '😮‍💨', label: '笫惫' },
      { key: 'grateful', emoji: '🙏', label: '感恩' }
    ];

    mainView.innerHTML = `
      <div class="diary-edit">
        <div class="diary-edit-header">
          <button class="bn" onclick="app.switchView('diary')">← 返回</button>
          <span class="diary-edit-date">${dateLabel}</span>
        </div>
        <div class="diary-mood-picker">
          ${moods.map(m => `
            <button class="mood-btn${diary.mood === m.key ? ' active' : ''}" data-mood="${m.key}" type="button" onclick="app._setDiaryMood('${m.key}')">
              <span class="mood-emoji">${m.emoji}</span>
              <span class="mood-label">${m.label}</span>
            </button>
          `).join('')}
        </div>
        <textarea class="diary-textarea" id="diaryContent" placeholder="写下今天的感悟…">${this._escapeHtml(diary.content || '')}</textarea>
        <div class="diary-edit-meta">
          <span id="diaryCharCount">${(diary.content || '').length} 字</span>
          <span id="diarySaveState">已保存</span>
        </div>
        <div class="diary-edit-actions">
          <button class="bn p" onclick="app._saveDiary()">保存</button>
          <button class="bn" onclick="app._exportDiaryImage()">保存为图片</button>
          <button class="bn" style="color:var(--red);border-color:var(--red)" onclick="app._deleteDiary()">删除</button>
        </div>
      </div>
    `;

    // 绑定自动保存
    const textarea = document.getElementById('diaryContent');
    let saveTimer = null;
    textarea.addEventListener('input', () => {
      document.getElementById('diaryCharCount').textContent = textarea.value.length + ' 字';
      document.getElementById('diarySaveState').textContent = '未保存';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        this._saveDiaryQuiet();
      }, 2000);
    });
  }

  _setDiaryMood(mood) {
    const diary = StorageManager.getDiaryById(this._currentDiaryId);
    if (!diary) return;
    diary.mood = diary.mood === mood ? '' : mood;
    StorageManager.saveDiary(diary);
    this.renderDiaryEdit();
  }

  _saveDiaryQuiet() {
    const diary = StorageManager.getDiaryById(this._currentDiaryId);
    if (!diary) return;
    const textarea = document.getElementById('diaryContent');
    if (!textarea) return;
    diary.content = textarea.value;
    StorageManager.saveDiary(diary);
    const stateEl = document.getElementById('diarySaveState');
    if (stateEl) stateEl.textContent = '已保存';
  }

  _saveDiary() {
    this._saveDiaryQuiet();
    this.toast('已保存');
  }

  _deleteDiary() {
    if (!confirm('确定删除这篇日记吗？')) return;
    StorageManager.deleteDiary(this._currentDiaryId);
    this._currentDiaryId = null;
    this.toast('已删除');
    this.switchView('diary');
  }

  _exportDiaryImage() {
    // 第五步实现
    this.toast('即将支持');
  }

  // ===== 首页 =====
  renderHome() {
    const todayWord = this._getTodayWord();
    const mainView = document.getElementById('mainView');
    mainView.innerHTML = `
      <div class="home-hero">
        <h1>True</h1>
        <div class="subtitle">一把切开概念误区的词典</div>
        <div class="home-actions">
          <button class="bn p" onclick="app.switchView('browse')">浏览词典</button>
          <button class="bn" onclick="app.switchView('random')">随机一词</button>
          <button class="bn" onclick="app.switchView('today')">今日一词</button>
        </div>
      </div>
      <div class="stats">
        <span>共 ${this.words.length} 个词条</span>
        <span>·</span>
        <span>四维切割：误解 / 正解 / 失效 / 边界</span>
      </div>
      ${todayWord ? this._renderFeaturedWord(todayWord, '今日一词') : ''}
    `;
  }

  // ===== 浏览 =====
  renderBrowse() {
    this.currentPage = 0;
    this.searchQuery = '';
    this.filteredWords = this.words;
    this._renderBrowseView();
  }

  _renderBrowseView() {
    const mainView = document.getElementById('mainView');
    const start = 0;
    const end = (this.currentPage + 1) * this.PAGE_SIZE;
    const visibleWords = this.filteredWords.slice(start, end);
    const hasMore = end < this.filteredWords.length;

    mainView.innerHTML = `
      <div class="search-bar">
        <input type="text" id="searchInput" placeholder="搜索词条..." value="${this._escapeHtml(this.searchQuery)}" 
               oninput="app._onSearchInput(this.value)">
        <button class="bn" onclick="app.switchView('home')">返回</button>
      </div>
      <div class="search-hint">
        支持：word:自由 · right:责任 · wrong:想做什么 · fail:逃避 · border:不是 · 或直接输入关键词
      </div>
      <div id="wordList">
        ${visibleWords.map(w => this._renderWordCard(w)).join('')}
      </div>
      ${visibleWords.length === 0 ? `<div class="empty-result">
        <div class="empty-result-icon">∅</div>
        <div class="empty-result-text">没有找到匹配的词条</div>
        <div class="empty-result-hint">试试换个关键词，或用 word: / right: 等前缀限定搜索字段</div>
      </div>` : ''}
      ${visibleWords.length > 0 && hasMore ? `<div style="padding:16px 20px;text-align:center;">
        <button class="bn" onclick="app._loadMore()">加载更多（已显示 ${visibleWords.length} / ${this.filteredWords.length}）</button>
      </div>` : ''}
      ${visibleWords.length > 0 && !hasMore ? `<div style="padding:16px 20px;text-align:center;font-size:12px;color:var(--ink-f);">
        共 ${this.filteredWords.length} 条结果
      </div>` : ''}
    `;

    // 聚焦搜索框
    const input = document.getElementById('searchInput');
    if (input && this.searchQuery) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }

  _onSearchInput(value) {
    this.searchQuery = value;
    this.currentPage = 0;

    if (!value.trim()) {
      this.filteredWords = this.words;
    } else {
      this.filteredWords = SearchEngine.search(this.words, value);
    }

    this._renderBrowseView();
  }

  _loadMore() {
    this.currentPage++;
    this._renderBrowseView();
  }

  _renderWordCard(word) {
    return `
      <div class="card" onclick="app.showWordDetail('${word.id}')">
        <div class="card-title">${this._escapeHtml(word.word)}</div>
        <div class="card-meta">${this._escapeHtml(this._truncate(word.right, 50))}</div>
      </div>
    `;
  }

  // ===== 词条详情 =====
  showWordDetail(id) {
    const word = this.words.find(w => w.id === id);
    if (!word) return;

    const html = `
      <div class="word-detail">
        <h2>${this._escapeHtml(word.word)}</h2>
        <div class="word-field f-wrong">
          <div class="word-field-label">误解</div>
          <div class="word-field-content">${this._escapeHtml(word.wrong || '—')}</div>
        </div>
        <div class="word-field f-right">
          <div class="word-field-label">正解</div>
          <div class="word-field-content">${this._escapeHtml(word.right || '—')}</div>
        </div>
        <div class="word-field f-fail">
          <div class="word-field-label">失效</div>
          <div class="word-field-content">${this._escapeHtml(word.fail || '—')}</div>
        </div>
        <div class="word-field f-border">
          <div class="word-field-label">边界</div>
          <div class="word-field-content">${this._escapeHtml(word.border || '—')}</div>
        </div>
        <div class="modal-acts">
          <button class="bn p" onclick="app.exportWordAsImage('${word.id}')">保存为图片</button>
          <button class="bn" onclick="app.closeModal()">关闭</button>
        </div>
      </div>
    `;
    this.openModal(html);
  }

  // ===== 随机一词 =====
  renderRandom() {
    const randomWord = this.words[Math.floor(Math.random() * this.words.length)];
    const mainView = document.getElementById('mainView');
    mainView.innerHTML = `
      <div style="padding:20px;">
        <div style="margin-bottom:16px;">
          <button class="bn" onclick="app.switchView('home')">← 返回</button>
        </div>
        ${this._renderFeaturedWord(randomWord, '随机一词')}
        <div style="text-align:center;margin-top:16px;">
          <button class="bn p" onclick="app.renderRandom()">再来一个</button>
        </div>
      </div>
    `;
  }

  // ===== 今日一词 =====
  renderToday() {
    const todayWord = this._getTodayWord();
    const mainView = document.getElementById('mainView');
    mainView.innerHTML = `
      <div style="padding:20px;">
        <div style="margin-bottom:16px;">
          <button class="bn" onclick="app.switchView('home')">← 返回</button>
        </div>
        ${this._renderFeaturedWord(todayWord, '今日一词')}
        <div style="text-align:center;margin-top:12px;font-size:12px;color:var(--ink-f);">
          每天固定展示一个词条，明天自动更换
        </div>
      </div>
    `;
  }

  /**
   * 根据日期确定今日词条（同一天不变）
   */
  _getTodayWord() {
    if (!this.words.length) return null;
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    // 简单哈希：把日期字符串转为数字索引
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    const index = Math.abs(hash) % this.words.length;
    return this.words[index];
  }

  // ===== 渲染辅助 =====
  _renderFeaturedWord(word, tag) {
    if (!word) return '';
    return `
      <div class="featured-word">
        <span class="tag">${tag}</span>
        <h3>${this._escapeHtml(word.word)}</h3>
        <div class="word-field">
          <div class="word-field-label">误解</div>
          <div class="word-field-content">${this._escapeHtml(word.wrong || '—')}</div>
        </div>
        <div class="word-field">
          <div class="word-field-label">正解</div>
          <div class="word-field-content">${this._escapeHtml(word.right || '—')}</div>
        </div>
        <div class="word-field">
          <div class="word-field-label">失效</div>
          <div class="word-field-content">${this._escapeHtml(word.fail || '—')}</div>
        </div>
        <div class="word-field">
          <div class="word-field-label">边界</div>
          <div class="word-field-content">${this._escapeHtml(word.border || '—')}</div>
        </div>
      </div>
    `;
  }

  // ===== 模态框 =====
  openModal(html) {
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modal').classList.add('show');
  }

  closeModal() {
    document.getElementById('modal').classList.remove('show');
  }

  exportWordAsImage(id) {
    const word = this.words.find(w => w.id === id);
    if (!word) return;
    try {
      window.TrueImageExporter.save({
        type: '词条',
        title: word.word || '未命名词条',
        sections: [
          { label: '误解', value: word.wrong || '—' },
          { label: '正解', value: word.right || '—' },
          { label: '失效', value: word.fail || '—' },
          { label: '边界', value: word.border || '—' }
        ],
        footer: `True · ${new Date().toLocaleDateString('zh-CN')}`
      });
      this.toast('已保存图片');
    } catch (err) {
      this.toast('导出失败，请重试');
    }
  }

  // ===== Toast =====
  toast(msg, duration = 2000) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.style.display = 'block';
    el.classList.add('show');
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => { el.style.display = 'none'; }, 200);
    }, duration);
  }

  // ===== 工具方法 =====
  _escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  _truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '...' : str;
  }
}

// 启动应用
const app = new CidaoApp();
document.addEventListener('DOMContentLoaded', () => app.init());
