# 词刀 Cidao

> 一把切开概念误区的词典

词刀是一个纯静态的词典工具，收录了 3000 个常被误解的概念词条。每个词条用四个维度切开一个概念：

| 维度 | 含义 |
|------|------|
| **误解** | 人们通常以为它是什么 |
| **正解** | 更准确的理解是什么 |
| **失效** | 在什么条件下这个概念会失效 |
| **边界** | 它的适用边界在哪里 |

## 功能

- **浏览词典**：3000 个词条，分页加载
- **搜索**：支持关键词搜索和字段限定搜索
- **随机一词**：随机展示一个词条
- **今日一词**：每天固定展示一个词条，第二天自动更换
- **深色/浅色主题**：一键切换
- **数据版本迁移**：更新词条不会丢失用户本地数据
- **PWA 支持**：可添加到手机主屏幕

## 词条结构

每个词条包含以下字段：

```json
{
  "id": "e001",
  "word": "自由",
  "wrong": "想做什么就做什么。",
  "right": "能在理解后果的前提下自主选择。",
  "fail": "在伤害他人、逃避责任或被欲望奴役时失效。",
  "border": "他人的自由与现实代价。",
  "createdAt": null
}
```

## 搜索语法

普通搜索：

```
责任 代价
```

字段限定搜索：

```
word:自由
right:责任
wrong:想做什么
fail:逃避
border:不是
```

多条件组合：

```
word:自由 right:选择
```

## 项目结构

```
index.html          主页面
css/main.css        样式
js/app.js           主应用逻辑
js/storage.js       数据存储与版本迁移
js/search.js        搜索引擎
data/words.json     词条数据（3000条）
data/version.json   数据版本信息
manifest.json       PWA 配置
README.md           说明文档
CHANGELOG.md        更新日志
```

## 本地运行

由于项目使用 `fetch()` 加载 JSON 数据，需要通过 HTTP 服务器运行（不能直接双击 HTML 打开）。

**方法一：Python**

```bash
cd jack-blog
python3 -m http.server 8080
```

然后打开 http://localhost:8080

**方法二：Node.js**

```bash
npx serve .
```

**方法三：VS Code**

安装 Live Server 插件，右键 `index.html` → Open with Live Server。

## 部署到 GitHub Pages

1. 将整个项目推送到 GitHub 仓库
2. 进入仓库 Settings → Pages
3. Source 选择 "Deploy from a branch"
4. Branch 选择 `main`，路径选 `/ (root)`
5. 点击 Save，等待 1-2 分钟即可访问

访问地址格式：`https://<用户名>.github.io/<仓库名>/`

## 数据文件

- `data/words.json`：所有词条数据，JSON 数组格式
- `data/version.json`：记录当前数据版本号

### 如何更新词条

1. 编辑 `data/words.json`，添加新词条或修改现有词条
2. 更新 `data/version.json` 中的 `wordsVersion` 字段（如改为 `"3500"`）
3. 提交并推送到 GitHub

用户下次访问时，应用会自动检测版本变化，将新词条合并到本地数据中，同时保留用户自己新增或修改过的词条。

## 隐私与安全边界

⚠️ **重要提醒：**

- 本项目包含一个前端密码锁，但这**不是真正的安全功能**
- 前端密码只是轻量遮挡，任何懂前端的人都可以绕过
- **公开的 GitHub Pages 不适合存放**：私人日记、私人文件、音乐、敏感个人信息等
- 所有数据存储在浏览器 localStorage 中，不同设备之间不会同步
- 如果需要真正的隐私保护，请使用带后端认证的方案

## 技术栈

- 纯静态 HTML/CSS/JavaScript
- 无框架依赖
- 无构建流程
- 数据存储：浏览器 localStorage
- 部署：GitHub Pages（或任何静态文件服务器）

## 许可

个人项目，仅供学习参考。
