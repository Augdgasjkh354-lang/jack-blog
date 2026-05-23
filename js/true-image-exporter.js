/**
 * TrueImageExporter
 * 统一卡片模板导出器（阶段三：大标题 / 黑白灰 / 蓝点 / 留白 / 日记卡片感）
 */
(function () {
  'use strict';

  const TOKENS = {
    width: 1080,
    height: 1350,
    padX: 84,
    top: 86,
    bg: '#f7f7f8',
    cardBg: '#ffffff',
    ink: '#0f172a',
    inkSoft: '#475569',
    inkMute: '#94a3b8',
    blue: '#2563eb',
    radius: 24
  };

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function lines(ctx, text, maxWidth) {
    const src = String(text || '').replace(/\s+/g, ' ').trim() || '—';
    const out = [];
    let buf = '';
    for (const ch of src) {
      const n = buf + ch;
      if (ctx.measureText(n).width > maxWidth && buf) {
        out.push(buf);
        buf = ch;
      } else {
        buf = n;
      }
    }
    if (buf) out.push(buf);
    return out;
  }

  function drawHeader(ctx, type) {
    const { padX, top, blue, ink, inkSoft } = TOKENS;
    ctx.fillStyle = blue;
    ctx.beginPath();
    ctx.arc(padX, top, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = ink;
    ctx.font = '700 38px sans-serif';
    ctx.fillText('True', padX + 26, top + 12);

    ctx.fillStyle = inkSoft;
    ctx.font = '500 24px sans-serif';
    ctx.fillText(type || '卡片', padX, top + 58);
  }

  function drawTitle(ctx, title) {
    const { padX, ink, width } = TOKENS;
    ctx.fillStyle = ink;
    ctx.font = '700 72px sans-serif';
    const lns = lines(ctx, title || '未命名', width - padX * 2).slice(0, 2);
    lns.forEach((line, i) => ctx.fillText(line, padX, 250 + i * 82));
    return 250 + lns.length * 82 + 24;
  }

  function drawSection(ctx, y, section) {
    const { padX, width, radius, cardBg, ink, inkSoft } = TOKENS;
    const boxW = width - padX * 2;
    const boxH = 190;
    roundRect(ctx, padX, y, boxW, boxH, radius);
    ctx.fillStyle = cardBg;
    ctx.fill();

    ctx.fillStyle = ink;
    ctx.font = '600 30px sans-serif';
    ctx.fillText(section.label || '内容', padX + 30, y + 52);

    ctx.fillStyle = inkSoft;
    ctx.font = '400 28px sans-serif';
    const textLines = lines(ctx, section.value, boxW - 60).slice(0, 3);
    textLines.forEach((line, i) => ctx.fillText(line, padX + 30, y + 102 + i * 36));
  }

  function save(data) {
    if (!data || typeof data !== 'object') throw new Error('导出数据无效');
    const { width, height, bg, inkMute, padX } = TOKENS;
    const type = data.type || '卡片';
    const title = data.title || 'True';
    const sections = Array.isArray(data.sections) ? data.sections : [];
    const footer = data.footer || `True · ${new Date().toLocaleDateString('zh-CN')}`;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    drawHeader(ctx, type);
    let y = drawTitle(ctx, title);

    const maxSections = Math.min(4, sections.length);
    for (let i = 0; i < maxSections; i++) {
      drawSection(ctx, y, sections[i] || {});
      y += 214;
    }

    ctx.fillStyle = inkMute;
    ctx.font = '400 22px sans-serif';
    ctx.fillText(footer, padX, height - 62);

    const filename = `true-${type}-${new Date().toISOString().slice(0, 10)}.png`;
    const a = document.createElement('a');
    a.download = filename;
    a.href = canvas.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  window.TrueImageExporter = { save };
})();
