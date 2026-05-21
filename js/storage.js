/**
 * 词刀 - 数据存储与版本迁移模块
 * 负责：加载远程词条、localStorage读写、数据合并、版本迁移
 */

const StorageManager = {
  KEYS: {
    words: 'cidao_words',
    version: 'cidao_data_version',
    userAdded: 'cidao_user_added',
    theme: 'cidao_theme'
  },

  /**
   * 从 data/words.json 加载官方词条
   */
  async loadRemoteWords() {
    try {
      const resp = await fetch('data/words.json');
      if (!resp.ok) throw new Error('Failed to load words.json');
      const words = await resp.json();
      return words;
    } catch (e) {
      console.error('[StorageManager] 加载词条失败:', e);
      return null;
    }
  },

  /**
   * 从 data/version.json 加载版本信息
   */
  async loadVersionInfo() {
    try {
      const resp = await fetch('data/version.json');
      if (!resp.ok) throw new Error('Failed to load version.json');
      return await resp.json();
    } catch (e) {
      console.error('[StorageManager] 加载版本信息失败:', e);
      return { version: '0.5.0', wordsVersion: '3000' };
    }
  },

  /**
   * 获取本地存储的词条
   */
  getLocalWords() {
    try {
      // 尝试新key
      let data = localStorage.getItem(this.KEYS.words);
      if (data) return JSON.parse(data);

      // 兼容旧版本的key（可能是 words、wordEntries 等）
      const legacyKeys = ['words', 'wordEntries', 'cidao_entries'];
      for (const key of legacyKeys) {
        data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
      return null;
    } catch (e) {
      console.error('[StorageManager] 读取本地数据失败:', e);
      return null;
    }
  },

  /**
   * 获取本地数据版本
   */
  getLocalVersion() {
    return localStorage.getItem(this.KEYS.version) || '0';
  },

  /**
   * 保存词条到本地
   */
  saveWords(words) {
    try {
      localStorage.setItem(this.KEYS.words, JSON.stringify(words));
    } catch (e) {
      console.error('[StorageManager] 保存数据失败:', e);
    }
  },

  /**
   * 保存版本号
   */
  saveVersion(version) {
    localStorage.setItem(this.KEYS.version, version);
  },

  /**
   * 核心：合并远程词条和本地词条
   * 策略：
   * 1. 以远程数据为基础
   * 2. 保留用户自己新增的词条（id不在远程中的）
   * 3. 保留用户修改过的词条（如果本地有修改标记或内容不同）
   * 4. 补齐缺失字段
   */
  mergeWords(remoteWords, localWords) {
    if (!localWords || localWords.length === 0) return remoteWords;
    if (!remoteWords || remoteWords.length === 0) return localWords;

    const remoteMap = new Map();
    remoteWords.forEach(w => remoteMap.set(w.id, w));

    const localMap = new Map();
    localWords.forEach(w => localMap.set(w.id, w));

    const merged = [];
    const processedIds = new Set();

    // 1. 遍历远程词条，作为基础
    for (const rw of remoteWords) {
      const lw = localMap.get(rw.id);
      if (lw && lw._userModified) {
        // 用户修改过的，保留用户版本，但补齐字段
        merged.push(this._fillMissingFields(lw, rw));
      } else {
        // 用远程版本
        merged.push(rw);
      }
      processedIds.add(rw.id);
    }

    // 2. 添加用户自己新增的词条（id不在远程中）
    for (const lw of localWords) {
      if (!processedIds.has(lw.id)) {
        merged.push(this._fillMissingFields(lw));
      }
    }

    return merged;
  },

  /**
   * 补齐缺失字段
   */
  _fillMissingFields(word, template) {
    const defaults = {
      id: word.id || `user_${Date.now()}`,
      word: '',
      wrong: '',
      right: '',
      fail: '',
      border: '',
      createdAt: null
    };
    const base = template ? { ...defaults, ...template, ...word } : { ...defaults, ...word };
    return base;
  },

  /**
   * 初始化：加载数据并执行迁移
   * 返回最终的词条数组
   */
  async initialize() {
    const versionInfo = await this.loadVersionInfo();
    const localVersion = this.getLocalVersion();
    const remoteWords = await this.loadRemoteWords();

    // 如果版本相同且本地有数据，直接用本地
    if (localVersion === versionInfo.wordsVersion) {
      const localWords = this.getLocalWords();
      if (localWords && localWords.length > 0) {
        return this._mergeUserWords(localWords);
      }
    }

    // 需要迁移
    const localWords = this.getLocalWords();
    let finalWords;

    if (remoteWords) {
      finalWords = this.mergeWords(remoteWords, localWords);
    } else if (localWords) {
      finalWords = localWords;
    } else {
      finalWords = [];
    }

    // 保存合并后的数据和版本
    this.saveWords(finalWords);
    this.saveVersion(versionInfo.wordsVersion);

    return this._mergeUserWords(finalWords);
  },

  /**
   * 合并刀稿编辑器产生的用户词条（cidao_user_words）
   * 将编辑器中「转为词条」的数据合并到主词条列表中
   */
  _mergeUserWords(words) {
    try {
      const raw = localStorage.getItem('cidao_user_words');
      if (!raw) return words;
      const userWords = JSON.parse(raw);
      if (!Array.isArray(userWords) || userWords.length === 0) return words;

      const existingIds = new Set(words.map(w => w.id));
      const newWords = [];

      for (const uw of userWords) {
        if (!existingIds.has(uw.id)) {
          newWords.push(this._fillMissingFields(uw));
          existingIds.add(uw.id);
        }
      }

      if (newWords.length > 0) {
        const merged = [...words, ...newWords];
        this.saveWords(merged);
        return merged;
      }
      return words;
    } catch (e) {
      console.error('[StorageManager] 合并用户词条失败:', e);
      return words;
    }
  },

  /**
   * 标记词条为用户修改
   */
  markUserModified(word) {
    word._userModified = true;
    return word;
  },

  /**
   * 主题相关
   */
  getTheme() {
    return localStorage.getItem(this.KEYS.theme) || 'light';
  },
  saveTheme(theme) {
    localStorage.setItem(this.KEYS.theme, theme);
  }
};
