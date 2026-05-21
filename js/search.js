/**
 * 词刀 - 搜索引擎模块
 * 支持：
 * - 普通关键词搜索（全字段）
 * - 字段限定搜索（word:自由, right:责任, wrong:想做什么, fail:逃避, border:不是）
 * - 结果排序：词语完全匹配 > 词语包含 > 其他字段匹配
 */

const SearchEngine = {
  /**
   * 解析搜索查询
   * 支持格式：
   *   "自由" -> 普通搜索
   *   "word:自由" -> 字段限定搜索
   *   "word:自由 right:责任" -> 多字段限定
   *   "责任 代价" -> 多关键词（AND逻辑）
   */
  parseQuery(query) {
    if (!query || !query.trim()) return null;

    const trimmed = query.trim();
    const fieldPattern = /\b(word|wrong|right|fail|border):([^\s]+)/g;
    const fieldFilters = [];
    let remaining = trimmed;

    let match;
    while ((match = fieldPattern.exec(trimmed)) !== null) {
      fieldFilters.push({ field: match[1], value: match[2] });
      remaining = remaining.replace(match[0], '');
    }

    remaining = remaining.trim();
    const keywords = remaining ? remaining.split(/\s+/).filter(k => k.length > 0) : [];

    return {
      fieldFilters,
      keywords,
      hasFieldFilters: fieldFilters.length > 0,
      hasKeywords: keywords.length > 0
    };
  },

  /**
   * 搜索词条
   * @param {Array} words - 词条数组
   * @param {string} query - 搜索查询
   * @returns {Array} 排序后的搜索结果
   */
  search(words, query) {
    const parsed = this.parseQuery(query);
    if (!parsed || (!parsed.hasFieldFilters && !parsed.hasKeywords)) {
      return words;
    }

    const results = [];

    for (const word of words) {
      const score = this._scoreWord(word, parsed);
      if (score > 0) {
        results.push({ word, score });
      }
    }

    // 按分数降序排列
    results.sort((a, b) => b.score - a.score);
    return results.map(r => r.word);
  },

  /**
   * 计算词条的匹配分数
   * 分数越高排越前
   */
  _scoreWord(word, parsed) {
    let score = 0;

    // 字段限定搜索
    if (parsed.hasFieldFilters) {
      for (const filter of parsed.fieldFilters) {
        const fieldValue = (word[filter.field] || '').toLowerCase();
        const searchValue = filter.value.toLowerCase();

        if (!fieldValue.includes(searchValue)) {
          return 0; // 字段限定必须全部匹配
        }

        // 完全匹配加分
        if (fieldValue === searchValue) {
          score += 100;
        } else if (filter.field === 'word' && fieldValue.includes(searchValue)) {
          score += 80;
        } else {
          score += 40;
        }
      }
    }

    // 关键词搜索
    if (parsed.hasKeywords) {
      for (const keyword of parsed.keywords) {
        const kw = keyword.toLowerCase();
        const wordMatch = this._matchKeyword(word, kw);
        if (wordMatch === 0) {
          return 0; // 所有关键词必须匹配（AND逻辑）
        }
        score += wordMatch;
      }
    }

    return score;
  },

  /**
   * 单个关键词在词条中的匹配分数
   */
  _matchKeyword(word, keyword) {
    const wordName = (word.word || '').toLowerCase();

    // 词语完全匹配：最高分
    if (wordName === keyword) return 100;

    // 词语包含：次高分
    if (wordName.includes(keyword)) return 80;

    // right 字段匹配
    if ((word.right || '').toLowerCase().includes(keyword)) return 40;

    // wrong 字段匹配
    if ((word.wrong || '').toLowerCase().includes(keyword)) return 35;

    // border 字段匹配
    if ((word.border || '').toLowerCase().includes(keyword)) return 30;

    // fail 字段匹配
    if ((word.fail || '').toLowerCase().includes(keyword)) return 25;

    return 0;
  }
};
