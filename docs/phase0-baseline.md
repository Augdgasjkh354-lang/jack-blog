# Phase 0 基线盘点（True 改造前）

日期：2026-05-22

## 1) 页面与能力现状

- 主站仅有 `index.html`，核心是词典浏览与词条详情弹窗，不存在“日记 / 句记”独立页面。当前可确认的详情页仅有：
  - 词条详情（`showWordDetail` 模态框）。
- 存在独立草稿编辑器页 `editor.html`（刀稿），支持：新建草稿、自动保存、导出 Markdown、转词条。
- 全项目为静态前端（HTML/CSS/JS + localStorage + JSON 数据文件），无后端、无构建。

## 2) 品牌名出现位置（词刀 -> True）

### 明显展示位（用户可见）
- `index.html`
  - `<title>词刀 Cidao</title>`
  - `<meta name="description" ... 词刀 ...>`
  - 锁屏标题 `<h1>词刀</h1>`
  - 顶栏标题 `词刀`
- `editor.html`
  - `<title>刀稿 - 词刀</title>`
  - 品牌区 `词刀 · 刀稿`
  - 返回按钮文案 `返回词刀`
- `js/app.js`
  - 首页大标题 `词刀`
- `manifest.json`
  - `name: "词刀 Cidao"`
  - `short_name: "词刀"`
  - `description: "一把切开概念误区的词典"`
- `README.md` / `CHANGELOG.md`
  - 项目名与描述文案使用“词刀 Cidao”。

### 程序内部标识（建议暂不改或分阶段改）
- localStorage / sessionStorage key 使用 `cidao_*` 前缀（如 `cidao_unlocked`, `cidao_theme`, `cidao_drafts`）。
- JS 类名与文件名：`CidaoApp`、`cidao-editor.js` 等。

> 阶段性建议：先改“展示名”，内部 key 与文件名后置处理，避免破坏已有用户本地数据。

## 3) “保存为图片”目标与接口确认

- 代码库当前未发现 `TrueImageExporter` 定义或引用。
- 代码库当前未发现“保存为图片”按钮。
- 代码库当前也未发现截图库（如 html2canvas）集成。

结论：
1. 需要先引入/创建 `TrueImageExporter` 模块；
2. 四类详情页里，当前只有“词条详情”和“草稿详情（编辑态）”具备落点；
3. “日记 / 句记”需先定义数据结构与页面承载位置，再接导出按钮。

## 4) 兼容 GitHub Pages 的实现边界

- 现状完全兼容（相对路径资源、无服务端依赖）。
- 后续新增功能应继续遵守：
  - 仅前端实现；
  - 数据落 localStorage；
  - 不引入 Node 构建步骤为必需条件。

## 5) Phase 1 前置决策清单（需确认）

1. 展示名切换节奏：
   - A. 先 `True（原词刀）` 一段时间再完全替换；
   - B. 一次性全量替换为 `True`。
2. `TrueImageExporter` 来源：
   - A. 你提供现成模块文件；
   - B. 我在仓库内先实现一个统一卡片模板版本。
3. “日记/句记”范围：
   - A. 本轮先做“词条 + 草稿”；
   - B. 同时新增“日记/句记”最小数据模型与详情页。

## 6) 建议的下一步（进入阶段 1）

- 建立统一品牌常量（仅作用于 UI 展示层）。
- 第一批替换：`index.html`, `editor.html`, `js/app.js`, `manifest.json`。
- 保留存储 key 不变（`cidao_*`），确保老用户数据无感迁移。
