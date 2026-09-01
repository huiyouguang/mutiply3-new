# Xove Dashboard × Thino（obsidian-memos）闪念互通补丁

> **用途**：本补丁修改 Xove Dashboard 的编译产物 `main.js` 与 `styles.css`，让「快速捕捉」与「灵感看板」与 Thino 共用同一份日记数据，实现双向互通。
> 当插件更新覆盖这两个文件后，依据本文档重新打补丁即可恢复功能。
>
> | 项 | 值 |
> |---|---|
> | 文档创建 / 最后更新 | 2026-09-01 |
> | 适用 Xove Dashboard 版本 | **0.3.1** |
> | 适用 Thino（obsidian-memos）版本 | **3.0.30** |
> | 修改文件 | `.obsidian/plugins/xove-dashboard/main.js`、`styles.css` |
> | 行号说明 | 文中行号为 0.3.1 当时的快照，仅作参考；重新定位一律以**函数名 / 关键字**为准（见 §3） |
> | 当前状态 | 已应用并验证通过 |

---

## 1. 背景与修改原因

Xove Dashboard 的「快速捕捉」原本用 `vault.create()` **新建独立文件**，且写入的是裸文本（无时间戳前缀）。而 Thino 的判定规则是：只有匹配 `- HH:mm 内容` 开头的列表项才算一条 memo，多行续行以 tab 缩进。两者格式不兼容，导致：

1. 当天日记已存在时，`vault.create()` 必然失败（即 `⚠️ Capture failed`）；
2. 即使写进去，Thino 也解析不出时间戳，**两边数据不互通**。

用户的「捕捉存储路径」已指向 `thino/2026`、`命名规则=YYYY-MM-DD`，方向与 Thino 的 Journal 完全一致，只差写入格式与读取逻辑。本补丁把 Xove 捕捉改造为**追加一行 `- HH:mm 内容` 到当日日记**，并新增读取逻辑，使两侧共用同一份数据。

> 注：用户口述中的 "discard 方案" 即指本补丁（命名为互通补丁）。

---

## 2. 核心逻辑（4 项改动）

1. **快速捕捉 → 追加到当日日记（Thino 格式）**
   新增设置项 `writeMode`：`daily`（默认，追加到日记）/ `file`（保留原行为新建文件）。
   daily 模式下写入 `thino/2026/YYYY-MM-DD.md`，格式 `- HH:mm 内容`，多行 tab 续行。

2. **首页「今日闪念」列表（双向可见）**
   快速捕捉卡下方读取当日日记的全部 memo 并渲染；**Thino 录入的条目同样可见**，点击跳转日记。

3. **灵感看板「⟲ 从日记拾取」**
   看板右上角按钮，扫描日记文件夹，把正文含 `boardImportTag`（默认 `#灵感`）的 memo 导入看板第一个阶段（收集箱）。
   用 `<!-- memo: 路径#HH:mm -->` 指纹注释去重，重复点击不会重复导入。

4. **设置面板补充开关**
   捕捉写入模式、首页显示今日闪念、闪念拾取标签三个控件 + 中英文字典。

---

## 3. 涉及的代码位置（main.js，按函数名定位）

| 函数 / 关键字 | 0.3.1 行号 | 文件 | 作用 |
|---|---|---|---|
| `DEFAULT_SETTINGS`（含 `quickCapture` 对象） | ~ 前段 | main.js | 新增 `quickCapture.writeMode`、`memoShowOnHome`、`boardImportTag` 默认值 |
| `normalizeSettings()` | 10547 | main.js | 浅合并会丢失嵌套默认值，此处补齐新字段 |
| `createCaptureNote()` | 7215 | main.js | 按 `writeMode` 分流 |
| `dailyMemoPath()` | 7246 | main.js | 计算当日日记路径（新增） |
| `buildMemoLine()` | 7257 | main.js | 文本 → `- HH:mm 内容`（新增） |
| `parseMemos()` | 7271 | main.js | 日记正文 → memo 数组（新增） |
| `appendMemoToDaily()` | 7303 | main.js | 追加 memo 到当日日记（新增） |
| `renderQuickCapture()` | 7115 | main.js | 加 memo 列表容器 + 提交后刷新 |
| `renderMemoList()` | 7154 | main.js | 渲染今日闪念列表（新增） |
| `op-import-btn`（看板 `renderPanels`/`renderTabs` 工具条） | 3351 | main.js | 新增「从日记拾取」按钮 |
| `importMemosFromDaily()` | 3778 | main.js | 拾取逻辑（新增，位于 `OpportunityBoard` 类内） |
| `memoFingerprintOf()` | 3761 | main.js | 从备注还原去重指纹（新增） |
| `memoTitleOf()` | 3768 | main.js | memo → 看板标题（新增） |
| `DashboardSettingTab.display()` | ~ 中段 | main.js | 设置面板新增 3 个控件 |
| i18n `const zh = {` / `const en = {` | 11 / 299 | main.js | 新增 19 个文案 key |
| `.ad-memo*` / `.op-import-btn` | — | styles.css | 新增样式 |

**快速定位命令**（插件更新后用这些确认锚点是否还在）：
```bash
cd .obsidian/plugins/xove-dashboard
grep -n "async createCaptureNote" main.js
grep -n "dailyMemoPath(" main.js
grep -n "parseMemos(" main.js
grep -n "renderMemoList(" main.js
grep -n "importMemosFromDaily" main.js
grep -n "op-import-btn" main.js
```

---

## 4. 完整补丁

> 下列代码块为 0.3.1 中**已写入的最终源码**，直接复制到对应位置即可。若更新后上下文（前后代码）有变化，以"在何处插入"的描述为准微调。

### 4.1 DEFAULT_SETTINGS：新增字段
定位 `quickCapture: {` 对象（`main.js` 中 `DEFAULT_SETTINGS` 内），在其 `templateFile: ''` 后增加 `writeMode`，并在 `quickCapture` 对象外（同层级）增加 `memoShowOnHome`、`boardImportTag`：
```js
    quickCapture: {
        storagePath: '00 inbox/速记',
        namingPattern: 'YYYY-MM-DD HH-mm 捕捉',
        templateFile: '',
        writeMode: 'daily',
    },
    memoShowOnHome: true,
    boardImportTag: '#灵感',
```

### 4.2 normalizeSettings()：补齐默认值（防浅合并丢字段）
在 `normalizeSettings()` 的「3) 看板默认名随语言」之后、`if (changed)` 之前插入：
```js
        // 4) 闪念互通相关字段：旧 data.json 缺失时补默认值。
        //    ⚠️ loadSettings 用的是浅合并，loaded.quickCapture 会整体覆盖默认值，
        //       因此新增的嵌套字段必须在这里补齐，否则老用户读到 undefined。
        if (!this.settings.quickCapture || typeof this.settings.quickCapture !== 'object') {
            this.settings.quickCapture = { ...DEFAULT_SETTINGS.quickCapture };
            changed = true;
        }
        if (this.settings.quickCapture.writeMode !== 'daily' && this.settings.quickCapture.writeMode !== 'file') {
            this.settings.quickCapture.writeMode = 'daily';
            changed = true;
        }
        if (typeof this.settings.memoShowOnHome !== 'boolean') {
            this.settings.memoShowOnHome = true;
            changed = true;
        }
        if (typeof this.settings.boardImportTag !== 'string') {
            this.settings.boardImportTag = getLang() === 'en' ? '#idea' : '#灵感';
            changed = true;
        }
```

### 4.3 createCaptureNote 改造 + 新增 4 个方法（位于 `DashboardView` 类内）
把原 `createCaptureNote` 改成按 `writeMode` 分流，并在其后（原 `/* ---- Create diary note ---- */` 注释之前）插入 4 个新方法：
```js
    async createCaptureNote(content) {
        const qc = this.plugin.settings.quickCapture;
        const now = new Date();
        // 「追加到日记」：按 Thino(memos) 的 - HH:mm 格式写入当日日记，两边数据天然互通
        if (qc.writeMode !== 'file')
            return this.appendMemoToDaily(content, now);
        // Ensure folder exists
        const folderPath = qc.storagePath;
        await this.ensureFolder(folderPath);
        // Generate filename
        const filename = this.applyNamingPattern(qc.namingPattern, now);
        const filepath = `${folderPath}/${filename}.md`;
        // Build content: template or plain
        let fileContent = content;
        if (qc.templateFile) {
            const tplPath = this.resolveTemplatePath(qc.templateFile);
            const tplFile = this.app.vault.getAbstractFileByPath(tplPath);
            if (tplFile instanceof obsidian.TFile) {
                const tpl = await this.app.vault.read(tplFile);
                fileContent = this.applyTemplate(tpl, content, filename, now);
            }
        }
        await this.app.vault.create(filepath, fileContent);
    }
    /* ============================================================
       闪念（memo）— 与 Thino / obsidian-memos 共用同一份日记数据
       格式约定：首行 `- HH:mm 内容`，续行以 tab 缩进。
       ============================================================ */
    dailyMemoPath(now = new Date()) {
        const qc = this.plugin.settings.quickCapture;
        const folder = (qc.storagePath || '').trim().replace(/\/+$/, '');
        // daily 模式必须「一天一个文件」：命名规则里若带时间占位符，
        // 每次捕捉都会算出不同文件名 → 退化成新建独立文件，与日记语义矛盾。
        const raw = (qc.namingPattern || 'YYYY-MM-DD').trim();
        const pattern = /HH|hh|mm|ss|SS/.test(raw) ? 'YYYY-MM-DD' : raw;
        const filename = this.applyNamingPattern(pattern, now) || 'YYYY-MM-DD';
        return folder ? `${folder}/${filename}.md` : `${filename}.md`;
    }
    buildMemoLine(content, d) {
        const pad = (n) => String(n).padStart(2, '0');
        const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
        const lines = content.replace(/\r\n?/g, '\n').split('\n');
        const first = (lines.shift() ?? '').trim();
        const rest = lines.map((l) => l.trim()).filter((l) => l !== '');
        const head = (first ? `- ${time} ${first}` : `- ${time}`).replace(/[ \t]+$/, '');
        return [head, ...rest.map((l) => `\t${l}`)].join('\n');
    }
    parseMemos(text) {
        const out = [];
        let cur = null;
        const flush = () => {
            if (cur) out.push(cur);
            cur = null;
        };
        for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
            const m = /^\s*[-*+]\s+(\d{1,2}:\d{2})(?:\s+(.*))?$/.exec(raw);
            if (m) {
                flush();
                const head = (m[2] ?? '').trim();
                cur = { time: m[1], text: head, body: head ? [head] : [] };
                continue;
            }
            if (!cur) continue;
            const seg = raw.trim();
            if (seg === '' || !/^(\t| {2,})\S/.test(raw)) flush();
            else {
                cur.body.push(seg);
                cur.text = cur.text ? `${cur.text} ${seg}` : seg;
            }
        }
        flush();
        return out;
    }
    async appendMemoToDaily(content, now = new Date()) {
        const qc = this.plugin.settings.quickCapture;
        const folder = (qc.storagePath || '').trim().replace(/\/+$/, '');
        await this.ensureFolder(folder);
        const filepath = this.dailyMemoPath(now);
        const line = this.buildMemoLine(content, now);
        const existing = this.app.vault.getAbstractFileByPath(filepath);
        if (existing instanceof obsidian.TFile) {
            const cur = await this.app.vault.read(existing);
            if (cur.includes(line)) {
                this.showToast(t('home.memoListDup'));
                return false;
            }
            const sep = cur.endsWith('\n') ? '' : '\n';
            await this.app.vault.modify(existing, cur + sep + line + '\n');
            return true;
        }
        let init = '';
        if (qc.templateFile) {
            const tplPath = this.resolveTemplatePath(qc.templateFile);
            const tplFile = this.app.vault.getAbstractFileByPath(tplPath);
            if (tplFile instanceof obsidian.TFile) {
                const tpl = await this.app.vault.read(tplFile);
                const filename = filepath.replace(/^.*\//, '').replace(/\.md$/, '');
                init = this.applyTemplate(tpl, '', filename, now);
            }
        }
        const body = init ? `${init.replace(/\s+$/, '')}\n\n${line}\n` : `${line}\n`;
        await this.app.vault.create(filepath, body);
        return true;
    }
```

### 4.4 renderQuickCapture + 新增 renderMemoList
在 `renderQuickCapture` 的 `const cta = ...` 之后（`cta` 与 `submit` 之间）插入 memo 容器与刷新闭包，并在 `cta.addEventListener(...)` 之后调用 `refreshMemos()`；在 `renderQuickCapture` 方法结束后新增 `renderMemoList`。完整替换后的 `renderQuickCapture` 如下（关键差异：新增 `memoBox` / `refreshMemos` / 提交后调用）：
```js
    renderQuickCapture(board) {
        const card = this.getOrCreateCard(board, 'ad-card ad-b-capture');
        this.cardHead(card, '\u25C6', t('home.modules.quickCapture'));
        const qc = card.createDiv({ cls: 'ad-qc' });
        const area = qc.createEl('textarea', {
            cls: 'ad-qc__area',
            attr: { rows: '3', placeholder: t('home.quickCapturePlaceholder') },
        });
        const row = qc.createDiv({ cls: 'ad-qc__row' });
        const cta = row.createEl('button', { cls: 'ad-qc__cta', text: t('home.captureBtn') });
        // 今日闪念：直接读当日日记（与 Thino 共用同一份数据），最新在最上
        const memoBox = card.createDiv({ cls: 'ad-memo' });
        const refreshMemos = () => void this.renderMemoList(memoBox);
        const submit = async () => {
            const content = area.value.trim();
            if (!content) { area.focus(); return; }
            cta.addClass('flash');
            try {
                await this.createCaptureNote(content);
                area.value = '';
                this.showToast(t('home.capturedToast'));
                refreshMemos();
            } catch (err) {
                console.error('[Dashboard] 快速捕捉失败', err);
                this.showToast(t('home.captureFailed'), 'error');
            } finally {
                window.setTimeout(() => cta.removeClass('flash'), 400);
            }
        };
        cta.addEventListener('click', () => void submit());
        refreshMemos();
    }
    async renderMemoList(box) {
        if (!box) return;
        const s = this.plugin.settings;
        if (!s.memoShowOnHome || s.quickCapture.writeMode === 'file') { box.empty(); return; }
        const path = this.dailyMemoPath();
        const file = this.app.vault.getAbstractFileByPath(path);
        const memos = file instanceof obsidian.TFile
            ? this.parseMemos(await this.app.vault.cachedRead(file)) : [];
        box.empty();
        const head = box.createDiv({ cls: 'ad-memo__head' });
        head.createSpan({ cls: 'ad-memo__title', text: t('home.memoListTitle') });
        head.createSpan({ cls: 'ad-memo__count', text: t('home.memoListCount', { n: String(memos.length) }) });
        const openBtn = head.createEl('button', { cls: 'ad-memo__open', text: t('home.memoListOpen') });
        openBtn.addEventListener('click', () => void this.app.workspace.openLinkText(path, '', true));
        const list = box.createDiv({ cls: 'ad-memo__list' });
        if (!memos.length) { list.createDiv({ cls: 'ad-memo__empty', text: t('home.memoListEmpty') }); return; }
        for (const m of [...memos].reverse()) {
            const item = list.createDiv({ cls: 'ad-memo__item' });
            item.createSpan({ cls: 'ad-memo__time', text: m.time });
            item.createSpan({ cls: 'ad-memo__text', text: m.text });
            item.addEventListener('click', () => void this.app.workspace.openLinkText(path, '', true));
        }
    }
```

### 4.5 看板「从日记拾取」按钮 + 3 个方法（位于 `OpportunityBoard` 类内）
在 `renderPanels`/`renderTabs` 中 `newBtn`（op-new-btn）之后插入（仅 daily 模式显示）：
```js
        if (this.host.plugin.settings.quickCapture.writeMode !== 'file') {
            const importBtn = tabs.createEl('button', { cls: 'po-add-btn op-import-btn', text: t('modal.opImportFromDaily') });
            importBtn.addEventListener('click', (e) => { e.stopPropagation(); void this.importMemosFromDaily(); });
        }
```
在 `createItem()` 方法之后插入 3 个方法：
```js
    memoFingerprintOf(notes) {
        const m = /<!--\s*memo:\s*([^>\n]+?)\s*-->/.exec(notes || '');
        return m ? m[1].trim() : '';
    }
    memoTitleOf(memo) {
        const raw = (memo.text || '')
            .replace(/#[\w一-龥/-]+/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!raw) return memo.time;
        return raw.length > 40 ? `${raw.slice(0, 40)}…` : raw;
    }
    async importMemosFromDaily() {
        const s = this.host.plugin.settings;
        const folder = (s.quickCapture.storagePath || '').trim().replace(/\/+$/, '');
        if (!folder) { this.host.showToast(t('modal.opImportNoFolder'), 'error'); return; }
        const tag = (s.boardImportTag || '').trim();
        const stage = this.stageLabels()[0] ?? '收集箱';
        this.host.showToast(t('modal.opImportScanning'));
        const files = this.host.app.vault.getMarkdownFiles()
            .filter((f) => f.path.startsWith(`${folder}/`))
            .sort((a, b) => b.basename.localeCompare(a.basename));
        const existing = await this.loadItems();
        const known = new Set(existing.map((i) => this.memoFingerprintOf(i.notes)).filter(Boolean));
        const picked = [];
        for (const f of files) {
            const memos = this.host.parseMemos(await this.host.app.vault.cachedRead(f));
            for (const m of memos) {
                if (tag && !m.text.includes(tag)) continue;
                const fp = `${f.path}#${m.time}`;
                if (known.has(fp)) continue;
                known.add(fp);
                picked.push({ file: f, memo: m, fp });
            }
        }
        if (!picked.length) { this.host.showToast(t('modal.opImportNone', { tag: tag || '-' })); return; }
        for (const p of picked) {
            await createOpportunity(this.host.app, this.boardPath(), {
                title: this.memoTitleOf(p.memo),
                status: stage,
                tags: tag ? [tag.replace(/^#/, '')] : [],
                notes: `<!-- memo: ${p.fp} -->\n${p.memo.body.join('\n')}`,
                link: p.file.basename,
                starred: false,
            }, this.boardTitle(), this.stageLabels());
        }
        this.host.showToast(t('modal.opImportedToast', { n: String(picked.length), tag: tag || '-' }));
        void this.refreshBoard();
    }
```

### 4.6 设置面板（DashboardSettingTab.display()）
- 在「快速捕捉」标题后、`captureStoragePath` 的 FolderDropdown 之前，加写入模式下拉：
```js
        new obsidian.Setting(containerEl)
            .setName(t('settings.captureWriteMode'))
            .setDesc(t('settings.captureWriteModeDesc'))
            .addDropdown((dd) => dd
            .addOption('daily', t('settings.captureModeDaily'))
            .addOption('file', t('settings.captureModeFile'))
            .setValue(this.plugin.settings.quickCapture.writeMode === 'file' ? 'file' : 'daily')
            .onChange(async (v) => { this.plugin.settings.quickCapture.writeMode = v; await this.plugin.saveSettings(); this.display(); }));
```
- 在「捕捉模板」设置之后、`// 新日记` 之前，加首页闪念开关：
```js
        new obsidian.Setting(containerEl)
            .setName(t('settings.memoShowOnHome'))
            .setDesc(t('settings.memoShowOnHomeDesc'))
            .addToggle((tg) => tg
            .setValue(this.plugin.settings.memoShowOnHome)
            .onChange(async (v) => { this.plugin.settings.memoShowOnHome = v; await this.plugin.saveSettings(); }));
```
- 在「看板数据文件」`addText` 设置之后，加拾取标签输入框：
```js
        new obsidian.Setting(boardOptions)
            .setName(t('settings.boardImportTag'))
            .setDesc(t('settings.boardImportTagDesc'))
            .addText((tc) => tc
            .setPlaceholder('#灵感')
            .setValue(this.plugin.settings.boardImportTag)
            .onChange(async (v) => { this.plugin.settings.boardImportTag = v.trim(); await this.plugin.saveSettings(); }));
```

### 4.7 i18n 字典新增 key（zh 与 en 各 19 个）
在 `const zh = {` 与 `const en = {` 中按段插入：
- **home 段**：`memoListTitle`、`memoListEmpty`、`memoListOpen`、`memoListDup`、`memoListCount`
- **modal 段**：`opImportFromDaily`、`opImportScanning`、`opImportedToast`、`opImportNone`、`opImportNoFolder`
- **settings 段**：`captureWriteMode`、`captureWriteModeDesc`、`captureModeDaily`、`captureModeFile`、`captureDailyPathDesc`、`memoShowOnHome`、`memoShowOnHomeDesc`、`boardImportTag`、`boardImportTagDesc`

中英文值见 `main.js` 中 `zh`（约 174 / 239 / 268 行附近）与 `en`（约 480 / 545 / 593 行附近）的实际定义；新增项后务必保证 zh / en 两字典 key 集合一致（源码共 390 个 `t()` key）。

### 4.8 styles.css 新增样式
在 `.ad-qc__cta.flash` 的 `@keyframes capture-flash` 之后、`/* ==== todo ==== */` 之前插入 `.ad-memo*` 样式；在 `.po-add-btn:hover` 之后插入 `.op-import-btn` 样式：
```css
/* today's memos (Thino-compatible) */
.ad-memo { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 6px; padding-top: 8px; border-top: 1px solid var(--ad-hair); overflow: hidden; }
.ad-memo__head { display: flex; align-items: baseline; gap: 7px; flex: 0 0 auto; }
.ad-memo__title { font-family: var(--ad-font); font-size: clamp(10px,3.6cqi,11px); letter-spacing: .08em; color: var(--ad-text-mute); }
.ad-memo__count { font-family: var(--ad-font); font-size: clamp(9px,3.2cqi,10px); color: var(--ad-text-dim); margin-right: auto; }
.ad-memo__open { flex: 0 0 auto; padding: 2px 6px; background: transparent; border: 1px solid transparent; border-radius: var(--ad-r1); font-family: var(--ad-font); font-size: clamp(9px,3.2cqi,10px); color: var(--ad-text-dim); cursor: pointer; transition: color .12s, border-color .12s; }
.ad-memo__open:hover { color: var(--ad-accent); border-color: var(--ad-line); }
.ad-memo__list { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
.ad-memo__empty { font-family: var(--ad-font); font-size: clamp(10px,3.6cqi,11px); color: var(--ad-text-dim); padding: 4px 2px; }
.ad-memo__item { display: flex; align-items: baseline; gap: 8px; padding: 3px 6px; border-radius: var(--ad-r1); cursor: pointer; transition: background .12s; }
.ad-memo__item:hover { background: var(--ad-s3); }
.ad-memo__time { flex: 0 0 auto; font-family: var(--ad-font); font-size: clamp(9px,3.4cqi,10px); color: var(--ad-accent); opacity: .85; font-variant-numeric: tabular-nums; }
.ad-memo__text { flex: 1; min-width: 0; font-size: clamp(10px,3.8cqi,12px); color: var(--ad-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.op-import-btn { color: var(--ad-accent-2); }
.op-import-btn:hover { border-color: var(--ad-accent-2); color: var(--ad-accent-2); background: rgba(167,139,250,0.12); }
```

---

## 5. 插件更新后重新应用步骤

1. **备份**新文件：
   ```bash
   cd .obsidian/plugins/xove-dashboard
   cp main.js main.js.bak.$(date +%Y%m%d)
   cp styles.css styles.css.bak.$(date +%Y%m%d)
   ```
2. **确认版本与锚点**：先读 `manifest.json` 的 `version`，再按 §3 的定位命令确认各函数是否仍存在、上下文是否变化。
3. **按 §4.1 → §4.8 顺序重新打补丁**。注意：
   - 若新版已内置类似功能，先对比再决定是否仍需本补丁；
   - 若函数签名/变量名变化（如 `this.plugin.settings` 改名、`createOpportunity` 参数变化），需相应调整 §4 的调用；
   - 若只是行号变化，函数名锚点不变，直接套用即可。
4. **语法校验**：
   ```bash
   cp main.js /tmp/xove-check.mjs && node --check /tmp/xove-check.mjs && echo OK
   ```
5. **重载插件**：Obsidian → 设置 → 第三方插件 → 关闭再开启 Xove Dashboard（或重启 Obsidian）。首次加载会自动把新字段补进 `data.json`。

---

## 6. 验证清单（更新后必做）

- [ ] `node --check` 通过，无语法错误
- [ ] 源码中 390 个 `t()` key 在 zh / en 字典均无缺失（可用脚本 grep 校验）
- [ ] 用真实 Thino 日记 `thino/2026/*.md` 验证 `parseMemos` 能正确解析（含多行续行、忽略无时间戳列表项）
- [ ] 写入一条捕捉后，当日日记出现 `- HH:mm 内容` 行，且 Thino 侧可见
- [ ] 首页今日闪念列表显示当日全部 memo（含 Thino 录入）
- [ ] 看板「从日记拾取」把带 `#灵感` 的 memo 导入收集箱，重复点击不重复导入

> 关键兼容性结论（0.3.1 已实跑通过）：用真实 `thino/2026/2026-06-23.md` 成功解析 9 条 Thino memo（含 13 行续长的长条目），无时间戳列表项不误判；写入→读回往返一致。

---

## 7. 已知风险与注意事项

- **主仓库冲突**：修改的是编译产物 `main.js`，**Xove 每次更新都会覆盖**，必须重新打补丁（见 §5）。
- **格式耦合**：本补丁强依赖 Thino 的 `- HH:mm` 约定。若 Thino 改写入格式（如改用 YAML frontmatter 存储 memo），`parseMemos` 需同步改。
- **去重指纹**：`memoFingerprintOf` 正则排除 `>` 与换行（**不要加 `-`**，否则日期分隔符会匹配失败）。指纹形如 `thino/2026/2026-09-01.md#09:05`。
- **写入位置**：memo 始终追加到日记**末尾**，不插入中间，避免破坏 frontmatter 与 Thino 既有结构。
- **命名规则兜底**：daily 模式下若 `namingPattern` 含 `HH/mm` 等时间占位符，`dailyMemoPath` 自动降级为 `YYYY-MM-DD`，确保"一天一个文件"。
- **依赖现有方法**：`appendMemoToDaily` / `renderMemoList` 复用了类内 `ensureFolder`、`applyNamingPattern`、`resolveTemplatePath`、`applyTemplate`、`showToast`、`getOrCreateCard`、`cardHead`、`openLinkText`；`importMemosFromDaily` 复用 `createOpportunity`、`loadItems`、`stageLabels`、`boardPath`、`boardTitle`、`refreshBoard`。若更新删除/改名这些依赖，需同步调整。
- **`this.host`**：`OpportunityBoard` 的 `host` 为 `DashboardView` 实例（构造于 `new OpportunityBoard(this)`），`parseMemos` 通过 `this.host.parseMemos` 调用——更新后若 host 类型变化需确认。
