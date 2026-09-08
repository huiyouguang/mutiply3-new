# Wechatian × Thino 日记格式统一补丁（2026-09-07）

> 让 Wechatian（微信桥接插件）产出的每日消息笔记，在**路径结构**和**内容行格式**上与 Thino（obsidian-memos）完全一致。

- 适用版本：Wechatian `0.1.6`、Thino `3.0.30`（更新后先比对 `manifest.json`）
- 改动文件：`.obsidian/plugins/wechatian/main.js`（编译产物，插件更新即被覆盖，需重打）
- 备份：`backups/wechatian_main.pre-thino-format_2026-09-07.js`（回滚时整体覆盖回插件目录）

---

## 1 背景与差异

| | 改造前（Wechatian） | Thino 参照 |
|---|---|---|
| 路径 | `Wechatian/YYYY-MM-DD.md` | `thino/2026/YYYY-MM-DD.md`（按年份分子目录） |
| 头部 | frontmatter（`date`/`sender`）+ `# 日期 微信收件箱` | 无 frontmatter、无标题 |
| 每条记录 | `**HH:mm** · 接收` + 空行 + `> 引用块` | 一行 `- HH:mm 内容` |
| 多行内容 | 每行都加 `> ` | 首行接在 `- HH:mm ` 后，其余行以 `\t` 缩进 |
| 续接已有文件 | 直接 append | 文件末尾无换行时自动补 `\n` |

改造后示例（`Wechatian/2026/2026-09-07.md`）：

```
- 13:24 [微信收] 你好啊
	
	![[Wechatian/attachments/2026-09-07_1324_photo.jpg]]
- 13:25 [微信发] 这是发送的内容
	第二行
```

Thino 的解析约定（`^- HH:mm` 行首、后续 `\t` 行归上一条）因此可直接吃下这些记录，Xove Dashboard 的 `parseMemos` 也能读。

---

## 2 新增设置项

| 键 | 默认 | 说明 |
|---|---|---|
| `thinoStyle` | `true` | 开启 = Thino 布局（`inboxFolder/年份/YYYY-MM-DD.md` + `- HH:mm` memo 行，无 frontmatter/标题）；关闭 = 旧的 `**HH:mm** · 接收` + 引用块格式 |
| `thinoMirrorFolder` | `""` | 留空 = 只写自己的收件箱；填 `thino` = **每条记录额外追加一份**到 `thino/2026/YYYY-MM-DD.md`，微信记录直接出现在 Thino 里 |

设置面板（`WechatianSettingTab`）原本缺 `display()`，页面渲染不出来，本次补上通用渲染器，两项新设置可见可改。

---

## 3 改动清单（按 main.js 中出现顺序）

1. `DEFAULT_SETTINGS`：加 `thinoStyle: true`、`thinoMirrorFolder: ""`。
2. i18n 三组（`en`/`zh`/`tw`）：加 `set.thinoStyle(.desc)`、`set.thinoMirror(.desc)`、`importer.tagIn`、`importer.tagOut`。
3. `importMessage()`：原来构造 `lines = ["**时间** · 接收", "", "> 引用"]`，改为构造纯内容数组 `body`，末尾调用新的 `appendDaily(..., "in", dailyOptsOf(settings))`。
4. 新增纯函数：`dailyNotePath` / `dailyOptsOf` / `memoTag` / `bodyToLines` / `buildMemoBlock` / `buildClassicBlock` / `writeDailyEntry`。
5. `appendDaily` 重写：按 `opts` 计算目标路径（含可选镜像），委托 `writeDailyEntry`。
6. `appendOutbound` 增加 `opts` 参数，方向固定 `"out"`。
7. 4 处出站调用点（发件箱文本、发件箱媒体、设置页测试发送、回执回复）：改为直接传内容 + `this.dailyOpts()`。
8. Plugin 类加 `dailyOpts()` 便捷方法。
9. 设置面板：新增两项定义 + `display()` 通用渲染器（toggle / text / dropdown / render 钩子）。

---

## 4 完整源码（可直接复制重打）

### 4.1 设置默认值

```js
var DEFAULT_SETTINGS = {
  // ...原有字段保持不变...
  notifyOnMessage: true,
  autoReply: true,
  thinoStyle: true,
  thinoMirrorFolder: ""
};
```

### 4.2 i18n（三组各加 6 个 key，en 示例；zh / tw 用同键名）

```js
  "set.thinoStyle": "Thino-style daily notes",
  "set.thinoStyle.desc": "Record messages the way Thino does: <folder>/<year>/YYYY-MM-DD.md, one \"- HH:mm content\" memo line per message, no frontmatter and no heading",
  "set.thinoMirror": "Mirror into Thino folder",
  "set.thinoMirror.desc": "Optional: append a copy of every entry to <folder>/<year>/YYYY-MM-DD.md (e.g. thino) so WeChat logs show up inside Thino. Leave empty to disable",

  "importer.tagIn": "[wechat-in]",
  "importer.tagOut": "[wechat-out]",
```

zh：`"importer.tagIn": "[\u5FAE\u4FE1\u6536]"`、`"importer.tagOut": "[\u5FAE\u4FE1\u53D1]"`；
tw：`"importer.tagOut": "[\u5FAE\u4FE1\u767C]"`。（构建产物中中文以 `\uXXXX` 形式存在，直接写中文亦可）

### 4.3 日记写入核心（替换原 `appendDaily` / `appendOutbound`，紧跟 `quoteBlock` 之后）

```js
function quoteBlock(text) {
  return text.trim().split("\n").map((l) => `> ${l}`);
}
/** Thino layout: <folder>/<year>/YYYY-MM-DD.md (classic layout stays <folder>/YYYY-MM-DD.md) */
function dailyNotePath(folder, timeMs, byYear) {
  const day = dayStamp(timeMs);
  const base = String(folder ?? "").replace(/\/+$/, "");
  if (!byYear) return base ? `${base}/${day}.md` : `${day}.md`;
  const year = String(new Date(timeMs).getFullYear());
  return base ? `${base}/${year}/${day}.md` : `${year}/${day}.md`;
}
function dailyOptsOf(settings) {
  const s = settings ?? {};
  return {
    thinoStyle: s.thinoStyle !== false,
    thinoMirror: typeof s.thinoMirrorFolder === "string" ? s.thinoMirrorFolder.trim() : ""
  };
}
function memoTag(direction) {
  return direction === "out" ? t("importer.tagOut") : t("importer.tagIn");
}
function bodyToLines(body) {
  const raw = Array.isArray(body) ? body.join("\n") : String(body ?? "");
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return lines;
}
/** "- HH:mm [tag] first line" with tab-indented continuations: exactly what Thino writes */
function buildMemoBlock(timeMs, direction, body) {
  const lines = bodyToLines(body);
  const tag = memoTag(direction);
  const head = lines.length ? `- ${timeOfDay(timeMs)} ${tag} ${lines[0]}`.replace(/\s+$/, "") : `- ${timeOfDay(timeMs)} ${tag}`;
  const rest = lines.slice(1).map((l) => l.trim() ? `\t${l.replace(/\s+$/, "")}` : "\t");
  return [head, ...rest].join("\n") + "\n";
}
function buildClassicBlock(timeMs, direction, body) {
  const lines = bodyToLines(body);
  const head = `**${timeOfDay(timeMs)}** \xB7 ${direction === "out" ? t("importer.sent") : t("importer.received")}`;
  return [head, "", ...(lines.length ? quoteBlock(lines.join("\n")) : [])].join("\n") + "\n\n";
}
async function writeDailyEntry(app, path, timeMs, sender, body, direction, thino) {
  try {
    const slash = path.lastIndexOf("/");
    if (slash > 0) await ensureFolder(app, path.slice(0, slash));
    const block = thino ? buildMemoBlock(timeMs, direction, body) : buildClassicBlock(timeMs, direction, body);
    if (await app.vault.adapter.exists(path)) {
      const cur = await app.vault.adapter.read(path);
      const gap = cur && !cur.endsWith("\n") ? "\n" : "";
      await app.vault.adapter.append(path, gap + block);
    } else {
      const header = thino ? "" : `---
date: ${dayStamp(timeMs)}
sender: ${sender}
---

# ${t("importer.inboxTitle", { date: dayStamp(timeMs) })}

`;
      await app.vault.adapter.write(path, header + block);
    }
    return true;
  } catch {
    return false;
  }
}
async function appendDaily(app, inboxFolder, timeMs, sender, body, direction, opts) {
  const o = opts ?? dailyOptsOf(void 0);
  const thino = o.thinoStyle !== false;
  const targets = [dailyNotePath(inboxFolder, timeMs, thino)];
  if (thino && o.thinoMirror) targets.push(dailyNotePath(o.thinoMirror, timeMs, true));
  let ok = true;
  for (const path of targets) {
    ok = await writeDailyEntry(app, path, timeMs, sender, body, direction, thino) && ok;
  }
  return ok;
}
async function appendOutbound(app, inboxFolder, timeMs, sender, body, opts) {
  await appendDaily(app, inboxFolder, timeMs, sender, body, "out", opts);
}
```

### 4.4 `importMessage()` 中的 4 处替换

```js
  // 原：const lines = []; lines.push(`**${timeOfDay(...)}** · ${t("importer.received")}`);
  const body = [];

  // 原：if (display) lines.push("", ...quoteBlock(display));
  if (display) body.push("", ...String(display).split("\n"));

  // 原：lines.push("", ...quoteBlock(embed));
  body.push("", embed);

  // 原：lines.push("", ...quoteBlock(t("importer.attachFailed", { name: att.name })));
  body.push("", t("importer.attachFailed", { name: att.name }));

  // 原：result.dailyNote = `${settings.inboxFolder}/${dayStamp(msg.timeMs)}.md`;
  //     result.appended = await appendDaily(app, settings.inboxFolder, msg.timeMs, msg.from, lines);
  result.dailyNote = dailyNotePath(settings.inboxFolder, msg.timeMs, settings.thinoStyle !== false);
  result.appended = await appendDaily(app, settings.inboxFolder, msg.timeMs, msg.from, body, "in", dailyOptsOf(settings));
```

### 4.5 4 处出站调用点

```js
  await appendOutbound(this.app, inboxFolder, now, to, content, this.dailyOpts());          // 发件箱 .md
  await appendOutbound(this.app, inboxFolder, now, to, linkLine, this.dailyOpts());         // 发件箱 媒体
  await appendOutbound(this.app, this.settings.inboxFolder, now, to, text, this.dailyOpts()); // 设置页测试发送
  await appendOutbound(this.app, this.settings.inboxFolder, Date.now(), to, lines.join("\n"), this.dailyOpts()); // 回执回复
```

### 4.6 Plugin 类新增方法

```js
  /** How the daily-note writer should behave: Thino layout plus the optional Thino mirror folder */
  dailyOpts() {
    return dailyOptsOf(this.settings);
  }
```

### 4.7 设置面板：两项定义 + `display()`

```js
      {
        name: t("set.thinoStyle"),
        desc: t("set.thinoStyle.desc"),
        control: { type: "toggle", key: "thinoStyle", defaultValue: DEFAULT_SETTINGS.thinoStyle }
      },
      {
        name: t("set.thinoMirror"),
        desc: t("set.thinoMirror.desc"),
        control: { type: "text", key: "thinoMirrorFolder", defaultValue: DEFAULT_SETTINGS.thinoMirrorFolder }
      },
```

```js
  display() {
    const containerEl = this.containerEl;
    containerEl.empty();
    for (const def of this.getSettingDefinitions()) {
      const setting = new import_obsidian4.Setting(containerEl).setName(def.name || "");
      if (def.desc) setting.setDesc(def.desc);
      if (def.render) {
        def.render(setting);
        continue;
      }
      const ctrl = def.control;
      if (!ctrl) continue;
      const stored = this.getControlValue(ctrl.key);
      const value = stored === void 0 || stored === null ? ctrl.defaultValue : stored;
      if (ctrl.type === "toggle") {
        setting.addToggle((toggle) => toggle.setValue(!!value).onChange((v) => this.setControlValue(ctrl.key, v)));
      } else if (ctrl.type === "dropdown") {
        setting.addDropdown((dropdown) => {
          for (const [key, label] of Object.entries(ctrl.options ?? {})) dropdown.addOption(key, String(label));
          dropdown.setValue(String(value)).onChange((v) => this.setControlValue(ctrl.key, v));
        });
      } else {
        setting.addText((text) => text.setPlaceholder(String(ctrl.defaultValue ?? "")).setValue(String(value ?? "")).onChange((v) => this.setControlValue(ctrl.key, v)));
      }
    }
  }
```

---

## 5 重新应用步骤（插件更新后）

1. 备份：`cp .obsidian/plugins/wechatian/main.js 02\ WorkBuddy/对话配置/backups/wechatian_main.pre-thino-format_<日期>.js`
2. 按 §4 逐块重打（唯一真相源是本文件；行号会变，按函数名定位）。
3. `node --check .obsidian/plugins/wechatian/main.js` 必须无输出错误。
4. Obsidian 中「设置 → 第三方插件」关闭再打开 Wechatian（或重启 Obsidian）重载。

---

## 6 验证清单

- [ ] 微信收到一条纯文本 → 生成 `Wechatian/<年份>/YYYY-MM-DD.md`，无 frontmatter，一行 `- HH:mm [微信收] 文本`
- [ ] 收到图片 → 同文件内该条下出现 `\t![[Wechatian/attachments/...]]`
- [ ] 连续两条 → 两行 `- HH:mm`，第二条不覆盖第一条
- [ ] 向 `Wechatian/outbox/` 放一个 `.md` → 同文件追加 `- HH:mm [微信发] 内容`
- [ ] 设置项 `thinoMirrorFolder` 填 `thino` → `thino/<年份>/YYYY-MM-DD.md` 同步出现同一条，Thino 视图可见
- [ ] 已存在且末尾无换行的 Thino 日记 → 自动补 `\n`，不出现「两条挤在一行」
- [ ] 关闭 `thinoStyle` → 退回旧格式（frontmatter + 标题 + `>` 引用块），文件回到 `Wechatian/YYYY-MM-DD.md`

---

## 7 风险与注意

- 改的是编译产物 `main.js`，**插件更新会被覆盖，必须重打**。
- 历史日记仍在旧位置 `Wechatian/2026-09-0*.md`（内容仍是旧格式）。如需统一目录，手动移动到 `Wechatian/2026/`（内容不必改，新旧块可在同一文件共存）；本补丁不自动迁移，避免动历史数据。
- `thinoMirrorFolder` 开启后，一条消息会写两份（收件箱 + Thino）。若同时用 Xove 的「从日记拾取」按 `#灵感` 导入，注意微信记录也会进入扫描范围。
- memo 行首固定 `- HH:mm`，与 Thino `DefaultMemoComposition = "{TIME} {CONTENT}"` 对齐；方向标记用方括号（`[微信收]`/`[微信发]`），不影响 `^- HH:mm` 解析。
- 多行续行用 `\t`，与 Thino 完全一致；若某天 Thino 改成空格缩进，需同步 `buildMemoBlock`。
