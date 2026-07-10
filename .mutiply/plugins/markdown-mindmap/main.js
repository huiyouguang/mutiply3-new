"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/obsidian/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => NotesMindmapPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/obsidian/svg.ts
var NS = "http://www.w3.org/2000/svg";
var svgEl = (tag, attrs, parent) => {
  const e = activeDocument.createElementNS(NS, tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (v != null) e.setAttribute(k, String(v));
  }
  parent.appendChild(e);
  return e;
};

// src/obsidian/modals.ts
var import_obsidian = require("obsidian");

// src/graph.ts
var AUTO_COLORS = [
  "#1abc9c",
  "#3498db",
  "#9b59b6",
  "#e67e22",
  "#e74c3c",
  "#f1c40f",
  "#16a085",
  "#2980b9",
  "#8e44ad",
  "#d35400"
];
var CATEGORY_COLORS = {
  client: "#2ecc71",
  prospect: "#f39c12",
  trial: "#3498db",
  customer: "#2ecc71",
  prospect_: "#f39c12"
};
var CARD_W = 270;
var NODE_H = 80;
var V_GAP = 12;
var COL_GAP = 150;
var TOP = 64;
var resolveLayout = (l) => {
  var _a, _b, _c, _d, _e, _f, _g;
  return {
    cardW: (_a = l == null ? void 0 : l.cardWidth) != null ? _a : CARD_W,
    nodeH: (_b = l == null ? void 0 : l.cardHeight) != null ? _b : NODE_H,
    colGap: (_c = l == null ? void 0 : l.columnGap) != null ? _c : COL_GAP,
    vGap: (_d = l == null ? void 0 : l.rowGap) != null ? _d : V_GAP,
    top: (_e = l == null ? void 0 : l.top) != null ? _e : TOP,
    titleLines: (_f = l == null ? void 0 : l.titleLines) != null ? _f : 2,
    // node-title lines before truncating (set 3 for a taller card)
    subLines: (_g = l == null ? void 0 : l.subLines) != null ? _g : 1
    // subtitle lines before truncating (set 2+ to wrap the sub)
  };
};
var inFolder = (path, folder) => {
  const f = folder.replace(/^\/+|\/+$/g, "");
  return f === "" ? true : path.startsWith(`${f}/`);
};
var scalarStr = (v) => typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? String(v) : "";
var linkKey = (raw) => {
  const s = scalarStr(raw).trim();
  const m = s.match(/\[\[([^\]|#]+)/);
  return (m ? m[1] : s).trim();
};
var asArray = (v) => Array.isArray(v) ? v : v == null || v === "" ? [] : [v];
var wrap = (s, width, size, max) => {
  const cpl = Math.max(8, Math.floor(width / (size * 0.55)));
  const words = String(s).split(/\s+/), out = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > cpl) {
      out.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) out.push(cur);
  return out.slice(0, max);
};
var MIN_H = 44;
var subWidth = (cardW) => cardW - 14 - 16;
var cardContentHeight = (n, cardW, titleLines, subLines) => {
  const padR = n.children.size > 0 ? 42 : 16;
  const tLines = wrap(n.title, cardW - 14 - padR, 12, titleLines).length || 1;
  const sLines = n.sub ? wrap(n.sub, subWidth(cardW), 10.5, subLines).length || 1 : 0;
  const hasBar = n.progress != null || n.bars.length > 0;
  return 14 + tLines * 16 + sLines * 15 + (n.meta ? 14 : 0) + (hasBar ? 20 : 0) + (n.labels.length ? 24 : 0) + 14;
};
var getPath = (fm, key) => {
  if (!fm || !key) return void 0;
  if (key.indexOf(".") < 0) return fm[key];
  return key.split(".").reduce(
    (o, k) => o == null ? o : o[k],
    fm
  );
};
var fieldStr = (fm, key) => key ? asArray(getPath(fm, key)).map(linkKey).join(", ") : "";
var fieldArr = (fm, key) => key ? asArray(getPath(fm, key)).map(linkKey).filter(Boolean) : [];
var matchesWhere = (fm, where) => !where || Object.keys(where).every(
  (k) => where[k] === null ? fieldStr(fm, k) === "" : fieldStr(fm, k) === scalarStr(where[k])
);
var countByCat = (fm, key, mode = "parens") => {
  if (!key) return [];
  const counts = {};
  asArray(getPath(fm, key)).forEach((raw) => {
    const s = scalarStr(raw).trim();
    if (!s) return;
    const m = mode === "value" ? null : s.match(/\(([^)]+)\)\s*$/);
    const cat = (m ? m[1] : s).trim().toLowerCase();
    counts[cat] = (counts[cat] || 0) + 1;
  });
  return Object.entries(counts).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );
};
var normalizeBars = (bars) => !bars ? null : typeof bars === "string" ? { field: bars } : bars.field ? bars : null;
var num = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};
var catColor = (cat, i, colors = CATEGORY_COLORS) => colors[cat] || AUTO_COLORS[i % AUTO_COLORS.length];
var primKids = (nodes, id) => [...nodes[id].children].filter((c) => nodes[c].primaryParent === id);
function validateConfig(cfg) {
  if (!cfg || !Array.isArray(cfg.levels) || !cfg.levels.length)
    throw new Error("config needs a non-empty `levels:` list.");
}
function collectNodes(cfg, notes) {
  const nodes = {};
  const byLevel = cfg.levels.map(() => []);
  cfg.levels.forEach((lvl, li) => {
    const color = lvl.color || AUTO_COLORS[li % AUTO_COLORS.length];
    const files = notes.filter((f) => inFolder(f.path, lvl.from)).sort((a, b) => a.path.localeCompare(b.path));
    files.forEach((file, ci) => {
      if (nodes[file.path]) return;
      const fm = file.frontmatter || {};
      if (!matchesWhere(fm, lvl.where)) return;
      const card = lvl.card || {};
      const bar = normalizeBars(card.bars);
      const labelEntries = (card.labels || []).map((k, i) => ({
        text: fieldStr(fm, k),
        color: AUTO_COLORS[i % AUTO_COLORS.length]
      })).filter((l) => l.text);
      const n = {
        id: file.path,
        levelIdx: li,
        path: file.path,
        basename: file.basename,
        fm,
        color,
        collIdx: ci,
        levelLabel: lvl.label || lvl.id,
        title: fieldStr(fm, card.title) || file.basename,
        sub: fieldStr(fm, card.sub),
        meta: (card.meta || []).map((k) => fieldStr(fm, k)).filter(Boolean).join("  \xB7  "),
        labels: labelEntries.map((l) => l.text),
        labelColors: labelEntries.map((l) => l.color),
        progress: num(getPath(fm, card.progress)),
        bars: bar ? countByCat(fm, bar.field, bar.category).map(
          ([cat, c], i) => [
            cat,
            c,
            catColor(cat, i, bar.colors)
          ]
        ) : [],
        parents: /* @__PURE__ */ new Set(),
        children: /* @__PURE__ */ new Set(),
        primaryParent: null
      };
      nodes[file.path] = n;
      byLevel[li].push(n);
    });
  });
  return { nodes, byLevel };
}
function buildEdges(cfg, nodes, byLevel, resolveLink) {
  const levelIndex = byLevel.map((arr) => {
    const byBase = {}, byTitle = {};
    arr.forEach((n) => {
      byBase[n.basename] = n.id;
      const t = scalarStr(n.fm.title).trim();
      if (t) byTitle[t] = n.id;
    });
    return { byBase, byTitle };
  });
  const levelByIdNum = {};
  cfg.levels.forEach((l, i) => levelByIdNum[l.id] = i);
  const edgeKind = /* @__PURE__ */ new Map();
  const link = (parentId, childId, secondary) => {
    if (!nodes[parentId] || !nodes[childId] || parentId === childId) return;
    nodes[parentId].children.add(childId);
    nodes[childId].parents.add(parentId);
    const key = parentId + "|" + childId;
    if (!secondary) {
      edgeKind.set(key, "primary");
      if (!nodes[childId].primaryParent)
        nodes[childId].primaryParent = parentId;
    } else if (!edgeKind.has(key)) {
      edgeKind.set(key, "secondary");
    }
  };
  const resolveInLevel = (li, raw, sourcePath) => {
    const key = linkKey(raw);
    const dest = resolveLink ? resolveLink(key, sourcePath) : null;
    if (dest && nodes[dest] && nodes[dest].levelIdx === li) return dest;
    return levelIndex[li].byBase[key] || levelIndex[li].byTitle[key] || null;
  };
  (cfg.edges || []).forEach((e) => {
    const fi = levelByIdNum[e.from], ti = levelByIdNum[e.to];
    if (fi == null || ti == null) return;
    if (!e.reverse) {
      byLevel[ti].forEach(
        (to) => asArray(getPath(to.fm, e.via)).forEach((raw) => {
          const fromId = resolveInLevel(fi, raw, to.path);
          if (fromId) link(fromId, to.id, e.secondary);
        })
      );
    } else {
      byLevel[fi].forEach(
        (from) => asArray(getPath(from.fm, e.via)).forEach((raw) => {
          const toId = resolveInLevel(ti, raw, from.path);
          if (toId) link(from.id, toId, e.secondary);
        })
      );
    }
  });
  return edgeKind;
}
var isSecondary = (edgeKind, p, c) => edgeKind.get(p + "|" + c) === "secondary";
var passesFilters = (n, filters, cfg) => (cfg.filter || []).every((p) => {
  const sel = filters[p];
  if (!sel || !sel.size) return true;
  const own = fieldArr(n.fm, p);
  if (!own.length) return true;
  return own.some((v) => sel.has(v));
});
function computeVisible(nodes, collapsed, filters, cfg) {
  const excluded = /* @__PURE__ */ new Set();
  Object.values(nodes).forEach((n) => {
    if (!passesFilters(n, filters, cfg)) excluded.add(n.id);
  });
  const hidden = new Set(excluded);
  [...collapsed, ...excluded].forEach((rid) => {
    if (!nodes[rid]) return;
    const stack = [...primKids(nodes, rid)];
    while (stack.length) {
      const x = stack.pop();
      if (!hidden.has(x)) {
        hidden.add(x);
        stack.push(...primKids(nodes, x));
      }
    }
  });
  const vis = /* @__PURE__ */ new Set();
  Object.values(nodes).forEach((n) => {
    if (!hidden.has(n.id)) vis.add(n.id);
  });
  return vis;
}
function focusVisible(nodes, id) {
  const all = new Set(Object.keys(nodes));
  if (!id || !nodes[id]) return all;
  const vis = /* @__PURE__ */ new Set();
  const seenAncestors = /* @__PURE__ */ new Set();
  let current = id;
  while (current && nodes[current] && !seenAncestors.has(current)) {
    vis.add(current);
    seenAncestors.add(current);
    current = nodes[current].primaryParent;
  }
  const stack = [...primKids(nodes, id)];
  while (stack.length) {
    const child = stack.pop();
    if (!nodes[child] || vis.has(child)) continue;
    vis.add(child);
    stack.push(...primKids(nodes, child));
  }
  return vis;
}
function siblings(nodes, id) {
  const self = nodes[id];
  if (!self) return [];
  const out = /* @__PURE__ */ new Set();
  self.parents.forEach(
    (p) => {
      var _a;
      return (_a = nodes[p]) == null ? void 0 : _a.children.forEach((c) => {
        if (c !== id && nodes[c]) out.add(c);
      });
    }
  );
  return [...out].sort(
    (a, b) => nodes[a].levelIdx - nodes[b].levelIdx || nodes[a].collIdx - nodes[b].collIdx || a.localeCompare(b)
  );
}
function orderAndLayout(cfg, nodes, byLevel, vis) {
  var _a, _b;
  const visN = (id) => vis.has(id);
  const {
    cardW,
    colGap,
    vGap,
    top: TOP2,
    titleLines,
    subLines
  } = resolveLayout(cfg.layout);
  const floor = (_b = (_a = cfg.layout) == null ? void 0 : _a.cardHeight) != null ? _b : MIN_H;
  const levelX = cfg.levels.map((_, i) => 40 + i * (cardW + colGap));
  const order = cfg.levels.map(() => []);
  const seen = /* @__PURE__ */ new Set();
  const childrenSorted = (n) => primKids(nodes, n.id).filter(visN).map((id) => nodes[id]).sort((a, b) => a.collIdx - b.collIdx);
  const dfs = (n) => {
    if (seen.has(n.id)) return;
    seen.add(n.id);
    order[n.levelIdx].push(n.id);
    childrenSorted(n).forEach(dfs);
  };
  byLevel[0].filter((n) => visN(n.id)).forEach(dfs);
  cfg.levels.forEach(
    (_, li) => byLevel[li].forEach((n) => {
      if (visN(n.id) && !seen.has(n.id)) {
        seen.add(n.id);
        order[li].push(n.id);
      }
    })
  );
  const cursor = cfg.levels.map(() => TOP2);
  for (let li = cfg.levels.length - 1; li >= 0; li--) {
    for (const id of order[li]) {
      const n = nodes[id];
      const kids = primKids(nodes, id).filter((c) => visN(c) && nodes[c].levelIdx === li + 1).map((c) => nodes[c]);
      n.w = cardW;
      n.h = Math.max(floor, cardContentHeight(n, cardW, titleLines, subLines));
      n.x = levelX[li];
      if (kids.length) {
        const top = Math.min(...kids.map((k) => k.y)), bot = Math.max(...kids.map((k) => k.y + k.h));
        n.y = Math.max(cursor[li], (top + bot) / 2 - n.h / 2);
      } else n.y = cursor[li];
      cursor[li] = n.y + n.h + vGap;
    }
  }
  const contentBottom = Math.max(TOP2, ...cfg.levels.map((_, li) => cursor[li]));
  const contentRight = levelX[cfg.levels.length - 1] + cardW;
  return { order, levelX, contentBottom, contentRight };
}
function filterOptions(nodes, cfg) {
  const all = Object.values(nodes);
  const options = {};
  (cfg.filter || []).forEach((prop) => {
    const seen = /* @__PURE__ */ new Set();
    all.forEach((n) => fieldArr(n.fm, prop).forEach((v) => seen.add(v)));
    options[prop] = [...seen].sort((a, b) => a.localeCompare(b));
  });
  return options;
}
var upsertView = (views, view) => {
  const i = views.findIndex((v) => v.name === view.name);
  return i >= 0 ? views.map((v, j) => j === i ? view : v) : [...views, view];
};
var viewNameTaken = (views, name, exceptName) => views.some((v) => v.name === name && v.name !== exceptName);
var initialView = (cfg) => {
  var _a;
  return cfg.activeView && ((_a = cfg.views) == null ? void 0 : _a.find((v) => v.name === cfg.activeView)) || null;
};
var searchMatch = (n, term) => (n.title + " " + n.sub + " " + n.meta).toLowerCase().includes(term.toLowerCase());
var mindmapExportPath = (notePath) => notePath.replace(/\.md$/i, "") + " mindmap.html";
var mapToExcalidraw = (nodes, edges) => {
  let n = 0;
  const id = () => "mm-" + n++;
  const base = (i) => ({
    angle: 0,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    seed: 1 + i,
    version: 1,
    versionNonce: 1 + i,
    isDeleted: false,
    updated: 1,
    link: null,
    locked: false
  });
  const elements = [];
  const rects = [];
  nodes.forEach((node, i) => {
    const rectId = id();
    const textId = id();
    const boundElements = [
      { type: "text", id: textId }
    ];
    const rect = {
      ...base(i),
      id: rectId,
      type: "rectangle",
      x: node.x,
      y: node.y,
      width: node.w,
      height: node.h,
      strokeColor: node.color,
      roundness: { type: 3 },
      boundElements
    };
    rects[i] = { id: rectId, boundElements };
    elements.push(rect);
    elements.push({
      ...base(i),
      id: textId,
      type: "text",
      x: node.x,
      y: node.y,
      width: node.w,
      height: node.h,
      strokeColor: "#1e1e1e",
      roundness: null,
      boundElements: [],
      text: node.text,
      originalText: node.text,
      fontSize: 16,
      fontFamily: 1,
      textAlign: "center",
      verticalAlign: "middle",
      lineHeight: 1.25,
      containerId: rectId
    });
  });
  edges.forEach((e, i) => {
    const arrowId = id();
    const start = e.source != null ? rects[e.source] : void 0;
    const end = e.target != null ? rects[e.target] : void 0;
    const bind = (r) => r ? { elementId: r.id, focus: 0, gap: 4 } : null;
    if (start) start.boundElements.push({ type: "arrow", id: arrowId });
    if (end) end.boundElements.push({ type: "arrow", id: arrowId });
    elements.push({
      ...base(nodes.length + i),
      id: arrowId,
      type: "arrow",
      x: e.x1,
      y: e.y1,
      width: e.x2 - e.x1,
      height: e.y2 - e.y1,
      strokeColor: e.color,
      roundness: { type: 2 },
      boundElements: [],
      points: [
        [0, 0],
        [e.x2 - e.x1, e.y2 - e.y1]
      ],
      lastCommittedPoint: null,
      startBinding: bind(start),
      endBinding: bind(end),
      startArrowhead: null,
      endArrowhead: "arrow"
    });
  });
  return {
    type: "excalidraw",
    version: 2,
    source: "markdown-mindmap",
    elements,
    appState: { gridSize: null, viewBackgroundColor: "#ffffff" },
    files: {}
  };
};
var mindmapExcalidrawPath = (notePath) => notePath.replace(/\.md$/i, "") + " mindmap.excalidraw";

// src/obsidian/modals.ts
var PromptModal = class extends import_obsidian.Modal {
  constructor(app, heading, initial, done) {
    super(app);
    this.heading = heading;
    this.initial = initial;
    this.done = done;
    this.resolved = false;
  }
  onOpen() {
    const { contentEl, modalEl } = this;
    if (activeDocument.fullscreenElement)
      activeDocument.fullscreenElement.appendChild(this.containerEl);
    modalEl.addClass("mm-prompt");
    contentEl.createEl("h3", { text: this.heading });
    const input = contentEl.createEl("input", {
      type: "text",
      cls: "mm-prompt-input",
      value: this.initial
    });
    const submit = () => {
      this.resolved = true;
      this.done(input.value);
      this.close();
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    });
    const row = contentEl.createDiv({ cls: "mm-prompt-actions" });
    row.createEl("button", { text: "Save", cls: "mod-cta" }).onclick = submit;
    row.createEl("button", { text: "Cancel" }).onclick = () => this.close();
    window.setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  }
  onClose() {
    this.contentEl.empty();
    if (!this.resolved) this.done(null);
  }
};
var promptText = (app, heading, initial = "") => new Promise(
  (resolve) => new PromptModal(app, heading, initial, resolve).open()
);
var ConfirmModal = class extends import_obsidian.Modal {
  constructor(app, message, done) {
    super(app);
    this.message = message;
    this.done = done;
    this.resolved = false;
  }
  onOpen() {
    const { contentEl, modalEl } = this;
    if (activeDocument.fullscreenElement)
      activeDocument.fullscreenElement.appendChild(this.containerEl);
    modalEl.addClass("mm-prompt");
    contentEl.createEl("h3", { text: this.message });
    const row = contentEl.createDiv({ cls: "mm-prompt-actions" });
    row.createEl("button", { text: "OK", cls: "mod-cta" }).onclick = () => {
      this.resolved = true;
      this.done(true);
      this.close();
    };
    row.createEl("button", { text: "Cancel" }).onclick = () => this.close();
  }
  onClose() {
    this.contentEl.empty();
    if (!this.resolved) this.done(false);
  }
};
var confirmModal = (app, message) => new Promise((resolve) => new ConfirmModal(app, message, resolve).open());
var HELP = `## Markdown Mindmap

A map is one \`\`\`mindmap\`\`\` block of YAML. Folders become columns (**levels**),
frontmatter links become **edges**. The tree rebuilds from your notes every open.

### Quick start
~~~yaml
title: Goals \u2192 Projects \u2192 Tasks
levels:
  - { id: goals,    label: GOALS,    from: planning/goals,    card: { title: title, sub: kpi } }
  - { id: projects, label: PROJECTS, from: planning/projects, card: { title: title, meta: [status] } }
  - { id: tasks,    label: TASKS,    from: planning/tasks,    card: { title: title, progress: progress } }
edges:
  - { from: goals,    to: projects, via: goal }     # each project note: goal: "[[Goal A]]"
  - { from: projects, to: tasks,    via: project }  # each task note: project: "[[Project 1]]"
filter: [status]
~~~

### Top-level keys
- **title** \u2014 heading in the toolbar
- **height** \u2014 component height px (default 900)
- **levels** \u2014 columns, left to right (**required**)
- **edges** \u2014 parent \u2192 child links between levels
- **filter** \u2014 properties shown as chip filters
- **filterLabels** \u2014 rename a filter group's heading
- **layout** \u2014 override card/column sizing
- **properties: true** \u2014 show all frontmatter in the note dialog
- **views** \u2014 saved filter + collapse selections (managed by the toolbar)

### Each level
- **id** (required) \u2014 referenced by edges
- **from** (required) \u2014 folder to read notes from (recursive)
- **label** \u2014 column header
- **color** \u2014 column/border hex colour
- **where** \u2014 keep only notes matching, e.g. \`{ horizon: now }\`
- **card** \u2014 which fields render on the card

### Each card
Field values are frontmatter property names; dotted paths work everywhere (\`customFields.serves\`).
- **title** \u2014 bold title (falls back to file name)
- **sub** \u2014 subtitle line (single line by default; set \`layout.subLines: 2\`+ to wrap it)
- **meta** \u2014 list of fields, muted \`\xB7\`-joined line
- **progress** \u2014 a 0\u2013100 field as a progress bar
- **bars** \u2014 a list field as a stacked count-by-category bar (or a map: \`{ field, category, colors }\`)
- **labels** \u2014 list of fields shown as coloured pills

### Each edge
- **from** / **to** \u2014 level ids
- **via** \u2014 frontmatter field holding the link (on the **to** notes by default; dotted paths work)
- **reverse: true** \u2014 field lives on the **from** notes and points down
- **secondary: true** \u2014 draw dashed, keep out of the layout spine

### Interactions
- **Search** \u2014 spotlight matching cards, dim the rest
- **Filter chips** \u2014 multi-select per property (OR within, AND across)
- **Saved views** \u2014 save / apply / edit / delete a filter combination; each view also remembers which subtrees are collapsed
- **Export** \u2014 save the current map next to the note as a standalone **HTML** file or an editable **Excalidraw** drawing
- **Hover** a card \u2014 highlight its full up/down lineage
- **Click** a card \u2014 dialog with its linked parents, siblings, and children (click to jump), properties, and the rendered note
- **Focus** (from the dialog) \u2014 show a node, its ancestors, and primary descendants; persists until you click empty map space to clear
- **Titles only** \u2014 hide subtitle/meta/bars/labels, leaving just titles
- **+ / \u2212** \u2014 collapse / expand a subtree
- **\u27E8 / \u2630** \u2014 collapse the toolbar to a single button, or expand it back
- **\u26F6** fullscreen \xB7 **Reset** clears filters/search/collapse/focus \xB7 drag to pan, scroll to zoom

[Full documentation on GitHub \u2192](https://github.com/kikocastro/markdown-mindmap#readme)
`;
var HelpModal = class extends import_obsidian.Modal {
  constructor() {
    super(...arguments);
    this.comp = new import_obsidian.Component();
  }
  async onOpen() {
    this.comp.load();
    const { contentEl, modalEl } = this;
    if (activeDocument.fullscreenElement)
      activeDocument.fullscreenElement.appendChild(this.containerEl);
    modalEl.addClass("mm-modal");
    this.containerEl.addClass("mm-modal-host");
    contentEl.empty();
    const body = contentEl.createDiv({ cls: "mm-note markdown-rendered" });
    await import_obsidian.MarkdownRenderer.render(this.app, HELP, body, "", this.comp);
  }
  onClose() {
    this.comp.unload();
    this.contentEl.empty();
  }
};
var NoteModal = class extends import_obsidian.Modal {
  constructor(app, node, links, file, nav, focus, showProperties) {
    super(app);
    this.node = node;
    this.links = links;
    this.file = file;
    this.nav = nav;
    this.focus = focus;
    this.showProperties = showProperties;
    this.comp = new import_obsidian.Component();
  }
  async onOpen() {
    this.comp.load();
    const { contentEl, modalEl } = this;
    if (activeDocument.fullscreenElement)
      activeDocument.fullscreenElement.appendChild(this.containerEl);
    modalEl.addClass("mm-modal");
    this.containerEl.addClass("mm-modal-host");
    contentEl.empty();
    const n = this.node;
    const head = contentEl.createDiv({ cls: "mm-note-head" });
    head.style.setProperty("--mm-accent", n.color);
    const badges = head.createDiv({ cls: "mm-note-badges" });
    badges.createSpan({ cls: "mm-badge", text: n.levelLabel });
    if (n.progress != null)
      badges.createSpan({
        cls: "mm-badge",
        text: `progress ${Math.round(n.progress)}%`
      });
    head.createEl("h2", { cls: "mm-note-title", text: n.title });
    if (n.basename && n.basename !== n.title)
      head.createDiv({ cls: "mm-note-file", text: n.basename });
    if (n.sub) head.createDiv({ cls: "mm-note-sub", text: n.sub });
    if (n.meta) head.createDiv({ cls: "mm-note-meta", text: n.meta });
    if (n.bars.length) {
      const br = head.createDiv({ cls: "mm-note-bars" });
      n.bars.forEach(([cat, c, color]) => {
        const pill = br.createSpan({
          cls: "mm-note-pill",
          text: `${c} ${cat}`
        });
        pill.style.setProperty("--mm-cat", color);
      });
    }
    const actions = head.createDiv({ cls: "mm-note-actions" });
    const open = actions.createEl("button", {
      cls: "mm-note-open",
      text: "Open note \u2197"
    });
    open.onclick = () => {
      void this.app.workspace.getLeaf("tab").openFile(this.file);
      this.close();
    };
    const focus = actions.createEl("button", {
      cls: "mm-note-focus",
      text: "Focus"
    });
    focus.onclick = () => {
      this.focus(n.id);
      this.close();
    };
    this.renderLinks(contentEl);
    if (this.showProperties) this.renderProperties(contentEl);
    const body = contentEl.createDiv({ cls: "mm-note markdown-rendered" });
    const content = await this.app.vault.cachedRead(this.file);
    await import_obsidian.MarkdownRenderer.render(
      this.app,
      content,
      body,
      this.file.path,
      this.comp
    );
  }
  renderProperties(contentEl) {
    const entries = Object.entries(this.node.fm || {});
    if (!entries.length) return;
    const wrapEl = contentEl.createDiv({ cls: "mm-note-props" });
    wrapEl.createDiv({ cls: "mm-note-props-title", text: "Properties" });
    const table = wrapEl.createEl("table");
    const tbody = table.createEl("tbody");
    entries.forEach(([key, value]) => {
      const row = tbody.createEl("tr");
      row.createEl("th", { text: key });
      row.createEl("td", { text: this.formatPropertyValue(value) });
    });
  }
  formatPropertyValue(value) {
    if (Array.isArray(value))
      return value.map((v) => this.formatPropertyValue(v)).join(", ");
    if (value == null || value === "") return "\u2014";
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return "[object]";
      }
    }
    return scalarStr(value);
  }
  renderLinks(contentEl) {
    if (!this.links.length) return;
    const wrapEl = contentEl.createDiv({ cls: "mm-note-links" });
    [
      ["Parents", "parent"],
      ["Siblings", "sibling"],
      ["Children", "child"]
    ].forEach(([label, rel]) => {
      const rows = this.links.filter((l) => l.relation === rel);
      if (!rows.length) return;
      const lvls = new Set(rows.map((l) => l.levelLabel));
      const sharedLvl = lvls.size === 1 ? [...lvls][0] : null;
      const grp = wrapEl.createDiv({ cls: "mm-note-linkgroup" });
      grp.createDiv({
        cls: "mm-note-linklabel",
        text: `${label}${sharedLvl ? ` \xB7 ${sharedLvl}` : ""} (${rows.length})`
      });
      rows.forEach((l) => {
        const btn = grp.createEl("button", {
          cls: "mm-link-row" + (l.secondary ? " mm-link-sec" : "")
        });
        btn.style.setProperty("--mm-accent", l.color);
        if (!sharedLvl)
          btn.createSpan({ cls: "mm-link-lvl", text: l.levelLabel });
        btn.createSpan({ cls: "mm-link-title", text: l.title });
        if (l.secondary) btn.createSpan({ cls: "mm-link-tag", text: "also" });
        btn.onclick = () => {
          this.close();
          this.nav(l.id);
        };
      });
    });
  }
  onClose() {
    this.comp.unload();
    this.contentEl.empty();
  }
};

// src/obsidian/main.ts
var NotesMindmapPlugin = class extends import_obsidian2.Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor("mindmap", (source, el, ctx) => {
      try {
        renderMindmap(this.app, this, source, el, ctx);
      } catch (e) {
        const msg = e instanceof Error ? e.message : JSON.stringify(e);
        el.createEl("pre", {
          text: "Markdown Mindmap error:\n" + msg
        });
        el.createEl("button", { text: "Mindmap help" }).onclick = () => new HelpModal(this.app).open();
      }
    });
  }
};
var activeState = /* @__PURE__ */ new Map();
function renderMindmap(app, plugin, source, host, ctx) {
  const cfg = (0, import_obsidian2.parseYaml)(source);
  validateConfig(cfg);
  const { titleLines, subLines } = resolveLayout(cfg.layout);
  const fileByPath = {};
  const notes = app.vault.getMarkdownFiles().map((f) => {
    var _a;
    fileByPath[f.path] = f;
    return {
      path: f.path,
      basename: f.basename,
      frontmatter: ((_a = app.metadataCache.getFileCache(f)) == null ? void 0 : _a.frontmatter) || {}
    };
  });
  const resolveLink = (key, fromPath) => {
    var _a, _b;
    return (_b = (_a = app.metadataCache.getFirstLinkpathDest(key, fromPath)) == null ? void 0 : _a.path) != null ? _b : null;
  };
  const { nodes, byLevel } = collectNodes(cfg, notes);
  const edgeKind = buildEdges(cfg, nodes, byLevel, resolveLink);
  const collapsed = /* @__PURE__ */ new Set();
  const filters = {};
  (cfg.filter || []).forEach((p) => filters[p] = /* @__PURE__ */ new Set());
  let savedViews = [...cfg.views || []];
  let selectedView = "";
  let searchTerm = "";
  const view = { x: 20, y: 8, k: 1 };
  let selected = null;
  let focused = null;
  let titleOnly = false;
  let pendingWrite = null;
  const optionsByProp = filterOptions(nodes, cfg);
  const chipByPropValue = {};
  host.empty();
  const wrapEl = host.createDiv({ cls: "mm-wrap" });
  if (cfg.height) wrapEl.setCssStyles({ height: cfg.height + "px" });
  const toolbar = wrapEl.createDiv({ cls: "mm-toolbar" });
  const head = toolbar.createDiv({ cls: "mm-head" });
  if (cfg.title) head.createSpan({ cls: "mm-title", text: cfg.title });
  const barToggle = head.createEl("button", {
    cls: "mm-icon mm-bartoggle",
    text: "\xAB",
    attr: { title: "Collapse sidebar" }
  });
  barToggle.onclick = () => {
    const collapsedBar = toolbar.classList.toggle("mm-bar-collapsed");
    barToggle.setText(collapsedBar ? "\u2630" : "\xAB");
    barToggle.setAttr(
      "title",
      collapsedBar ? "Expand sidebar" : "Collapse sidebar"
    );
    fit();
  };
  const search = toolbar.createEl("input", {
    cls: "mm-search",
    attr: { type: "search", placeholder: "Search\u2026" }
  });
  search.oninput = () => {
    searchTerm = search.value.trim().toLowerCase();
    reapply();
  };
  const focusTicket = toolbar.createEl("button", {
    cls: "mm-focus-ticket mm-hidden",
    attr: { title: "Clear focus" }
  });
  const focusLabel = focusTicket.createSpan({ cls: "mm-focus-label" });
  focusTicket.createSpan({ cls: "mm-focus-x", text: "\u2715" });
  focusTicket.onclick = () => setFocus(null);
  let viewSelect = null;
  let editViewBtn = null;
  let deleteViewBtn = null;
  (cfg.filter || []).forEach((prop) => {
    var _a, _b;
    const values = optionsByProp[prop] || [];
    if (!values.length) return;
    chipByPropValue[prop] = {};
    const grp = toolbar.createDiv({ cls: "mm-fltgroup" });
    grp.createSpan({
      cls: "mm-fltlabel",
      text: (_b = (_a = cfg.filterLabels) == null ? void 0 : _a[prop]) != null ? _b : prop
    });
    values.forEach((v) => {
      const chip = grp.createEl("button", { cls: "mm-chip", text: v });
      chipByPropValue[prop][v] = chip;
      chip.onclick = () => {
        if (filters[prop].has(v)) {
          filters[prop].delete(v);
          chip.removeClass("on");
        } else {
          filters[prop].add(v);
          chip.addClass("on");
        }
        selectedView = "";
        syncViewControls();
        draw();
        fit();
      };
    });
  });
  if ((cfg.filter || []).length) {
    const views = toolbar.createDiv({ cls: "mm-viewgroup" });
    views.createSpan({ cls: "mm-fltlabel", text: "Saved views" });
    viewSelect = views.createEl("select", { cls: "mm-viewselect" });
    viewSelect.onchange = () => {
      selectedView = (viewSelect == null ? void 0 : viewSelect.value) || "";
      const saved = savedViews.find((v) => v.name === selectedView);
      if (saved) {
        applyCollapsed(saved.collapsed || []);
        applyFilterSnapshot(saved.filters || {});
      } else syncViewControls();
      persistActiveView(selectedView).catch(reportViewError);
    };
    const saveView = views.createEl("button", {
      cls: "mm-viewsave",
      text: "Save current as\u2026"
    });
    saveView.onclick = async () => {
      const name = await promptText(
        app,
        "Save current filters as a view",
        defaultViewName()
      );
      if (!(name == null ? void 0 : name.trim())) return;
      const cleanName = name.trim();
      if (viewNameTaken(savedViews, cleanName) && !await confirmModal(app, `Replace the saved view "${cleanName}"?`))
        return;
      const nextViews = upsertView(savedViews, currentViewCfg(cleanName));
      try {
        await persistViews(nextViews);
        selectedView = cleanName;
        rememberActive();
        syncViewControls();
      } catch (e) {
        reportViewError(e);
      }
    };
    editViewBtn = views.createEl("button", { text: "Edit" });
    editViewBtn.onclick = async () => {
      const current = savedViews.find((v) => v.name === selectedView);
      if (!current) return;
      const name = await promptText(
        app,
        "Rename this view and update it to current filters",
        current.name
      );
      if (!(name == null ? void 0 : name.trim())) return;
      const cleanName = name.trim();
      if (viewNameTaken(savedViews, cleanName, current.name)) {
        new import_obsidian2.Notice(`A saved view named "${cleanName}" already exists.`);
        return;
      }
      const nextViews = savedViews.map(
        (v) => v.name === current.name ? currentViewCfg(cleanName) : v
      );
      try {
        await persistViews(nextViews);
        selectedView = cleanName;
        rememberActive();
        syncViewControls();
      } catch (e) {
        reportViewError(e);
      }
    };
    deleteViewBtn = views.createEl("button", { text: "Delete" });
    deleteViewBtn.onclick = async () => {
      const current = savedViews.find((v) => v.name === selectedView);
      if (!current || !await confirmModal(app, `Delete the saved view "${current.name}"?`))
        return;
      try {
        await persistViews(savedViews.filter((v) => v.name !== current.name));
        selectedView = "";
        rememberActive();
        syncViewControls();
      } catch (e) {
        reportViewError(e);
      }
    };
    syncViewControls();
  }
  const foot = toolbar.createDiv({ cls: "mm-foot" });
  const displayGroup = foot.createDiv({ cls: "mm-actiongroup" });
  displayGroup.createSpan({ cls: "mm-fltlabel", text: "Display" });
  const titlesBtn = displayGroup.createEl("button", {
    text: "Titles only",
    attr: { title: "Show only node titles" }
  });
  titlesBtn.onclick = () => {
    titleOnly = !titleOnly;
    titlesBtn.toggleClass("on", titleOnly);
    draw();
  };
  const fsBtn = displayGroup.createEl("button", {
    text: "Fullscreen",
    attr: { title: "Toggle fullscreen" }
  });
  fsBtn.onclick = () => {
    if (activeDocument.fullscreenElement) void activeDocument.exitFullscreen();
    else void wrapEl.requestFullscreen();
  };
  const exportGroup = foot.createDiv({ cls: "mm-actiongroup" });
  exportGroup.createSpan({ cls: "mm-fltlabel", text: "Export" });
  const exportBtn = exportGroup.createEl("button", {
    text: "HTML",
    attr: { title: "Save this map as a standalone .html next to the note" }
  });
  exportBtn.onclick = exportHtml;
  const exportExBtn = exportGroup.createEl("button", {
    text: "Excalidraw",
    attr: {
      title: "Save this map as an editable .excalidraw next to the note"
    }
  });
  exportExBtn.onclick = exportExcalidraw;
  const footUtil = foot.createDiv({ cls: "mm-utilrow" });
  plugin.registerDomEvent(activeDocument, "fullscreenchange", () => {
    fsBtn.toggleClass("on", activeDocument.fullscreenElement === wrapEl);
    window.requestAnimationFrame(fit);
    if (activeDocument.fullscreenElement !== wrapEl && pendingWrite) {
      const cfgToWrite = pendingWrite;
      pendingWrite = null;
      writeBlock(cfgToWrite).catch(reportViewError);
    }
  });
  function currentFilterSnapshot() {
    const snapshot = {};
    (cfg.filter || []).forEach((prop) => {
      const values = (optionsByProp[prop] || []).filter(
        (v) => {
          var _a;
          return (_a = filters[prop]) == null ? void 0 : _a.has(v);
        }
      );
      if (values.length) snapshot[prop] = values;
    });
    return snapshot;
  }
  function currentViewCfg(name) {
    const view2 = { name, filters: currentFilterSnapshot() };
    if (collapsed.size) view2.collapsed = [...collapsed];
    return view2;
  }
  function applyCollapsed(ids) {
    collapsed.clear();
    ids.forEach((id) => collapsed.add(id));
  }
  function rememberActive() {
    activeState.set(ctx.sourcePath, {
      view: selectedView,
      filters: currentFilterSnapshot(),
      collapsed: [...collapsed]
    });
  }
  function defaultViewName() {
    const snap = currentFilterSnapshot();
    const name = (cfg.filter || []).flatMap((prop) => snap[prop] || []).join(" \xB7 ");
    return name.length > 32 ? name.slice(0, 31).trimEnd() + "\u2026" : name;
  }
  function updateFilterChips() {
    Object.entries(chipByPropValue).forEach(([prop, chips]) => {
      Object.entries(chips).forEach(([value, chip]) => {
        var _a;
        chip.toggleClass("on", ((_a = filters[prop]) == null ? void 0 : _a.has(value)) || false);
      });
    });
  }
  function applyFilterSnapshot(snapshot) {
    (cfg.filter || []).forEach((prop) => filters[prop].clear());
    Object.entries(snapshot).forEach(([prop, values]) => {
      if (!filters[prop]) return;
      values.forEach((value) => filters[prop].add(value));
    });
    updateFilterChips();
    syncViewControls();
    draw();
    fit();
  }
  function syncViewControls() {
    if (!viewSelect) return;
    viewSelect.empty();
    const placeholder = viewSelect.createEl("option", { text: "Select\u2026" });
    placeholder.value = "";
    savedViews.forEach((viewCfg) => {
      const opt = viewSelect.createEl("option", { text: viewCfg.name });
      opt.value = viewCfg.name;
    });
    viewSelect.value = selectedView;
    const hasSelection = savedViews.some((v) => v.name === selectedView);
    if (editViewBtn) editViewBtn.disabled = !hasSelection;
    if (deleteViewBtn) deleteViewBtn.disabled = !hasSelection;
  }
  function mindmapBlockRange(lines) {
    const section = ctx.getSectionInfo(host);
    if (!section) return null;
    let start = section.lineStart;
    while (start > 0 && !/^```mindmap\b/.test(lines[start])) start--;
    if (!/^```mindmap\b/.test(lines[start])) return null;
    let end = start + 1;
    while (end < lines.length && !/^```\s*$/.test(lines[end])) end++;
    return end < lines.length ? { start, end } : null;
  }
  async function writeBlock(nextCfg) {
    if (activeDocument.fullscreenElement === wrapEl) {
      pendingWrite = nextCfg;
      return;
    }
    const file = app.vault.getAbstractFileByPath(ctx.sourcePath);
    if (!(file instanceof import_obsidian2.TFile))
      throw new Error("Could not find the note that owns this mindmap block.");
    const raw = await app.vault.read(file);
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    const lines = raw.split(/\r?\n/);
    const range = mindmapBlockRange(lines);
    if (!range)
      throw new Error("Could not locate the source ```mindmap code block.");
    const nextBlock = ["```mindmap", (0, import_obsidian2.stringifyYaml)(nextCfg).trimEnd(), "```"];
    lines.splice(range.start, range.end - range.start + 1, ...nextBlock);
    await app.vault.modify(file, lines.join(eol));
  }
  async function persistViews(nextViews) {
    const nextCfg = { ...cfg };
    if (nextViews.length) nextCfg.views = nextViews;
    else delete nextCfg.views;
    if (nextCfg.activeView && !nextViews.some((v) => v.name === nextCfg.activeView))
      delete nextCfg.activeView;
    await writeBlock(nextCfg);
    savedViews = nextViews;
    cfg.views = nextViews.length ? nextViews : void 0;
    cfg.activeView = nextCfg.activeView;
  }
  async function persistActiveView(name) {
    const nextCfg = { ...cfg };
    if (name) nextCfg.activeView = name;
    else delete nextCfg.activeView;
    await writeBlock(nextCfg);
    cfg.activeView = name || void 0;
  }
  function reportViewError(e) {
    new import_obsidian2.Notice(
      "Could not update mindmap views:\n" + (e instanceof Error ? e.message : String(e))
    );
  }
  const resetBtn = footUtil.createEl("button", { text: "Reset" });
  resetBtn.onclick = () => {
    collapsed.clear();
    selected = null;
    focused = null;
    selectedView = "";
    searchTerm = "";
    search.value = "";
    titleOnly = false;
    titlesBtn.toggleClass("on", false);
    (cfg.filter || []).forEach((p) => filters[p].clear());
    updateFilterChips();
    syncViewControls();
    renderFocusTicket();
    draw();
    fit();
    if (cfg.activeView) persistActiveView("").catch(reportViewError);
  };
  const helpBtn = footUtil.createEl("button", {
    cls: "mm-help",
    text: "Help",
    attr: { title: "Mindmap help" }
  });
  helpBtn.onclick = () => new HelpModal(app).open();
  function renderFocusTicket() {
    const node = focused != null ? nodes[focused] : void 0;
    if (node) focusLabel.setText(`Focus: ${node.title}`);
    focusTicket.toggleClass("mm-hidden", !node);
  }
  function setFocus(id) {
    focused = id;
    selected = null;
    renderFocusTicket();
    draw();
    fit();
  }
  renderFocusTicket();
  const stage = wrapEl.createDiv({ cls: "mm-stage" });
  const svg = svgEl("svg", {}, stage);
  const rootG = svgEl("g", {}, svg);
  let upAdj = {}, dnAdj = {};
  let links = [];
  let nodeEls = {};
  function highlight(id) {
    const keep = /* @__PURE__ */ new Set([id]);
    const walk = (adj, start) => {
      const q = [start];
      while (q.length) {
        const n = q.shift();
        (adj[n] ? [...adj[n]] : []).forEach((m) => {
          if (!keep.has(m)) {
            keep.add(m);
            q.push(m);
          }
        });
      }
    };
    walk(upAdj, id);
    walk(dnAdj, id);
    links.forEach((lk) => {
      const hot = keep.has(lk.a) && keep.has(lk.b);
      lk.el.classList.toggle("mm-hot", hot);
      lk.el.classList.toggle("mm-dim", !hot);
    });
    Object.keys(nodeEls).forEach((n) => {
      nodeEls[n].classList.toggle("mm-dim", !keep.has(n));
      nodeEls[n].classList.remove("mm-hit");
    });
  }
  function applySearch() {
    Object.keys(nodeEls).forEach((id) => {
      const hit = searchMatch(nodes[id], searchTerm);
      nodeEls[id].classList.toggle("mm-hit", hit);
      nodeEls[id].classList.toggle("mm-dim", !hit);
    });
    links.forEach((lk) => {
      lk.el.classList.remove("mm-hot");
      lk.el.classList.add("mm-dim");
    });
  }
  function clearHi() {
    links.forEach((lk) => lk.el.classList.remove("mm-hot", "mm-dim"));
    Object.values(nodeEls).forEach(
      (g) => g.classList.remove("mm-dim", "mm-hit")
    );
  }
  function reapply() {
    if (searchTerm) applySearch();
    else if (selected && nodeEls[selected]) highlight(selected);
    else clearHi();
  }
  function linksFor(n) {
    const row = (id, relation) => {
      const o = nodes[id];
      const sec = relation === "parent" ? isSecondary(edgeKind, id, n.id) : isSecondary(edgeKind, n.id, id);
      return {
        id,
        title: o.title,
        levelLabel: o.levelLabel,
        color: o.color,
        secondary: sec,
        relation
      };
    };
    const sibRow = (id) => {
      const o = nodes[id];
      return {
        id,
        title: o.title,
        levelLabel: o.levelLabel,
        color: o.color,
        secondary: false,
        relation: "sibling"
      };
    };
    return [
      ...[...n.parents].map((p) => row(p, "parent")),
      ...siblings(nodes, n.id).map(sibRow),
      ...[...n.children].map((c) => row(c, "child"))
    ];
  }
  function openNode(id) {
    selected = id;
    reapply();
    const n = nodes[id];
    new NoteModal(
      app,
      n,
      linksFor(n),
      fileByPath[n.path],
      openNode,
      (focusId) => setFocus(focusId),
      cfg.properties === true
    ).open();
  }
  let contentBottom = 64, contentRight = 0;
  function draw() {
    while (rootG.firstChild) rootG.removeChild(rootG.firstChild);
    links = [];
    nodeEls = {};
    upAdj = {};
    dnAdj = {};
    const baseVis = computeVisible(nodes, collapsed, filters, cfg);
    const focusVis = focusVisible(nodes, focused);
    const vis = focused ? new Set([...baseVis].filter((id) => focusVis.has(id))) : baseVis;
    const visN = (id) => vis.has(id);
    const {
      order,
      levelX,
      contentBottom: cb,
      contentRight: cr
    } = orderAndLayout(cfg, nodes, byLevel, vis);
    contentBottom = cb;
    contentRight = cr;
    const linkLayer = svgEl("g", {}, rootG), nodeLayer = svgEl("g", {}, rootG);
    cfg.levels.forEach((lvl, li) => {
      if (lvl.label)
        svgEl(
          "text",
          { class: "mm-colhead", x: levelX[li], y: 36 },
          rootG
        ).textContent = lvl.label;
    });
    Object.values(nodes).forEach((p) => {
      if (!visN(p.id)) return;
      [...p.children].filter(visN).forEach((cid) => {
        const c = nodes[cid];
        const sec = isSecondary(edgeKind, p.id, cid);
        const x1 = p.x + p.w, y1 = p.y + p.h / 2, x2 = c.x, y2 = c.y + c.h / 2, mx = (x1 + x2) / 2;
        const path = svgEl(
          "path",
          {
            class: "mm-link" + (sec ? " mm-also" : ""),
            d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`,
            stroke: p.color,
            "stroke-width": 2.5
          },
          linkLayer
        );
        links.push({ el: path, a: p.id, b: c.id });
        (dnAdj[p.id] = dnAdj[p.id] || /* @__PURE__ */ new Set()).add(c.id);
        (upAdj[c.id] = upAdj[c.id] || /* @__PURE__ */ new Set()).add(p.id);
      });
    });
    cfg.levels.forEach(
      (_, li) => order[li].forEach((id) => {
        var _a;
        const n = nodes[id];
        const hasKids = n.children.size > 0;
        const hasBar = !titleOnly && (n.progress != null || n.bars.length > 0);
        const g = svgEl("g", { class: "mm-node" }, nodeLayer);
        svgEl(
          "rect",
          {
            class: "mm-box",
            x: n.x,
            y: n.y,
            width: n.w,
            height: n.h,
            rx: 9,
            fill: "var(--background-secondary)",
            stroke: n.color
          },
          g
        );
        const padR = hasKids ? 42 : 16;
        const labelH = !titleOnly && n.labels.length ? 24 : 0;
        const barH = hasBar ? 20 : 0;
        const textPadTop = 14;
        const textPadBottom = 14;
        const lines = [];
        let truncated = false;
        const titleWrapped = wrap(n.title, n.w - 14 - padR, 12, titleLines);
        if (titleWrapped.join(" ").length < n.title.replace(/\s+/g, " ").trim().length)
          truncated = true;
        titleWrapped.forEach(
          (t) => lines.push({ t, cls: "mm-t1", size: 12, lh: 16 })
        );
        if (!titleOnly && n.sub) {
          const subWrapped = wrap(n.sub, subWidth(n.w), 10.5, subLines);
          if (subWrapped.join(" ").length < n.sub.replace(/\s+/g, " ").trim().length)
            truncated = true;
          subWrapped.forEach(
            (t) => lines.push({ t, cls: "mm-t2", size: 10.5, lh: 15 })
          );
        }
        if (!titleOnly && n.meta)
          lines.push({ t: n.meta, cls: "mm-meta", size: 9.5, lh: 14 });
        const totalH = lines.reduce((s, b) => s + b.lh, 0);
        const firstSize = ((_a = lines[0]) == null ? void 0 : _a.size) || 12;
        const textTop = n.y + textPadTop;
        const textBottom = n.y + n.h - textPadBottom - barH - labelH;
        const freeH = Math.max(totalH, textBottom - textTop);
        let ty = hasBar || labelH ? textTop + firstSize : textTop + (freeH - totalH) / 2 + firstSize;
        lines.forEach((b) => {
          svgEl(
            "text",
            { class: b.cls, x: n.x + 14, y: ty, "font-size": b.size },
            g
          ).textContent = b.t;
          ty += b.lh;
        });
        if (truncated)
          svgEl("title", {}, g).textContent = n.title + (n.sub ? "\n" + n.sub : "");
        if (labelH) drawLabels(g, n);
        if (hasBar) drawBar(g, n);
        if (hasKids) {
          const cx = n.x + n.w - 16, cy = n.y + 15, isC = collapsed.has(n.id);
          const tg = svgEl(
            "g",
            { class: "mm-toggle" + (isC ? " mm-collapsed" : "") },
            g
          );
          svgEl("circle", { cx, cy, r: isC ? 9 : 8 }, tg);
          svgEl("text", { x: cx, y: cy + 4 }, tg).textContent = isC ? "+" : "\u2212";
          tg.addEventListener("click", (ev) => {
            ev.stopPropagation();
            if (isC) collapsed.delete(n.id);
            else collapsed.add(n.id);
            draw();
          });
        }
        g.addEventListener("mouseenter", () => {
          if (!searchTerm) highlight(n.id);
        });
        g.addEventListener("mouseleave", reapply);
        g.addEventListener("click", (ev) => {
          ev.stopPropagation();
          openNode(n.id);
        });
        nodeEls[n.id] = g;
      })
    );
    apply();
    reapply();
    rememberActive();
  }
  function drawLabels(g, n) {
    const hasBar = n.progress != null || n.bars.length > 0;
    const top = n.y + n.h - (hasBar ? 53 : 31), h = 15, size = 9, pad = 11;
    const maxX = n.x + n.w - 12;
    let bx = n.x + 12;
    for (let i = 0; i < n.labels.length; i++) {
      const t = n.labels[i];
      const w = Math.ceil(t.length * size * 0.62) + pad * 2;
      if (bx + w > maxX) break;
      const color = n.labelColors[i] || AUTO_COLORS[i % AUTO_COLORS.length];
      svgEl(
        "rect",
        {
          class: "mm-label",
          x: bx,
          y: top,
          width: w,
          height: h,
          rx: 7,
          fill: color,
          "fill-opacity": 0.14,
          stroke: color
        },
        g
      );
      svgEl(
        "text",
        {
          class: "mm-label-t",
          x: bx + w / 2,
          y: top + 11,
          "font-size": size,
          fill: color
        },
        g
      ).textContent = t;
      bx += w + 5;
    }
  }
  function drawBar(g, n) {
    const x = n.x + 14, w = n.w - 28, y = n.y + n.h - 23;
    if (n.progress != null) {
      const p = Math.max(0, Math.min(100, n.progress));
      svgEl("rect", { class: "mm-track", x, y, width: w, height: 6, rx: 3 }, g);
      svgEl(
        "rect",
        { x, y, width: w * p / 100, height: 6, rx: 3, fill: n.color },
        g
      );
      svgEl(
        "text",
        { class: "mm-barlbl", x: x + w, y: y - 3, "text-anchor": "end" },
        g
      ).textContent = p + "%";
    } else if (n.bars.length) {
      const total = n.bars.reduce((s, [, c]) => s + c, 0) || 1;
      let bx = x;
      n.bars.forEach(([cat, c, color]) => {
        const seg = w * c / total;
        const r = svgEl(
          "rect",
          {
            x: bx,
            y,
            width: Math.max(0, seg - 1.5),
            height: 7,
            rx: 2,
            fill: color
          },
          g
        );
        svgEl("title", {}, r).textContent = `${c} ${cat}`;
        bx += seg;
      });
      svgEl(
        "text",
        { class: "mm-barlbl", x: x + w, y: y - 3, "text-anchor": "end" },
        g
      ).textContent = String(total);
    }
  }
  const apply = () => rootG.setAttribute(
    "transform",
    `translate(${view.x},${view.y}) scale(${view.k})`
  );
  function fit() {
    const w = svg.clientWidth || wrapEl.clientWidth, h = svg.clientHeight || 600;
    const barW = toolbar.classList.contains("mm-bar-collapsed") ? 0 : toolbar.offsetWidth + 16;
    view.k = Math.min(
      (w - barW) / (contentRight + 40),
      h / (contentBottom + 40),
      1.4
    ) || 1;
    view.x = barW + 20;
    view.y = 8;
    apply();
  }
  function exportHtml() {
    var _a;
    const PAD = 24;
    const PROPS = [
      "fill",
      "stroke",
      "stroke-width",
      "stroke-dasharray",
      "opacity",
      "font-family",
      "font-size",
      "font-weight",
      "text-anchor",
      "letter-spacing",
      "filter"
    ];
    const box = rootG.getBBox();
    const clone = svg.cloneNode(true);
    const live = svg.querySelectorAll("*");
    const copies = clone.querySelectorAll("*");
    live.forEach((el, i) => {
      const cs = getComputedStyle(el);
      copies[i].setAttribute(
        "style",
        PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(";")
      );
    });
    (_a = clone.querySelector("g")) == null ? void 0 : _a.removeAttribute("transform");
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute(
      "viewBox",
      `${box.x - PAD} ${box.y - PAD} ${box.width + PAD * 2} ${box.height + PAD * 2}`
    );
    clone.setAttribute("width", String(Math.ceil(box.width + PAD * 2)));
    clone.setAttribute("height", String(Math.ceil(box.height + PAD * 2)));
    const bg = getComputedStyle(wrapEl).backgroundColor || "#fff";
    const esc = (s) => s.replace(
      /[<>&]/g,
      (c) => c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;"
    );
    const html = `<!doctype html><meta charset="utf-8"><title>${esc(cfg.title || "Mindmap")}</title><body style="margin:0;background:${bg}">${clone.outerHTML}</body>`;
    const path = mindmapExportPath(ctx.sourcePath);
    void app.vault.adapter.write(path, html).then(
      () => new import_obsidian2.Notice("Exported to " + path),
      (e) => new import_obsidian2.Notice(
        "Export failed: " + (e instanceof Error ? e.message : String(e))
      )
    );
  }
  function exportExcalidraw() {
    const baseVis = computeVisible(nodes, collapsed, filters, cfg);
    const focusVis = focusVisible(nodes, focused);
    const vis = focused ? new Set([...baseVis].filter((id) => focusVis.has(id))) : baseVis;
    const visNodes = Object.values(nodes).filter((n) => vis.has(n.id));
    const exIndex = new Map(visNodes.map((n, i) => [n.id, i]));
    const exNodes = visNodes.map((n) => ({
      x: n.x,
      y: n.y,
      w: n.w,
      h: n.h,
      color: n.color,
      text: !titleOnly && n.sub ? n.title + "\n" + n.sub : n.title
    }));
    const exEdges = links.map(({ a, b }) => {
      const p = nodes[a], c = nodes[b];
      return {
        x1: p.x + p.w,
        y1: p.y + p.h / 2,
        x2: c.x,
        y2: c.y + c.h / 2,
        color: p.color,
        source: exIndex.get(a),
        target: exIndex.get(b)
      };
    });
    const json = JSON.stringify(mapToExcalidraw(exNodes, exEdges), null, 2);
    const path = mindmapExcalidrawPath(ctx.sourcePath);
    void app.vault.adapter.write(path, json).then(
      () => new import_obsidian2.Notice("Exported to " + path),
      (e) => new import_obsidian2.Notice(
        "Export failed: " + (e instanceof Error ? e.message : String(e))
      )
    );
  }
  let drag = null;
  stage.addEventListener("mousedown", (e) => {
    drag = { x: e.clientX - view.x, y: e.clientY - view.y };
    stage.classList.add("mm-drag");
  });
  plugin.registerDomEvent(window, "mousemove", (e) => {
    if (drag) {
      view.x = e.clientX - drag.x;
      view.y = e.clientY - drag.y;
      apply();
    }
  });
  plugin.registerDomEvent(window, "mouseup", () => {
    drag = null;
    stage.classList.remove("mm-drag");
  });
  stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const step = Math.min(0.06, Math.abs(e.deltaY) * 9e-4), f = e.deltaY < 0 ? 1 + step : 1 / (1 + step);
      const nk = Math.max(0.2, Math.min(3, view.k * f)), r = nk / view.k;
      const rect = stage.getBoundingClientRect(), px = e.clientX - rect.left, py = e.clientY - rect.top;
      view.x = px - (px - view.x) * r;
      view.y = py - (py - view.y) * r;
      view.k = nk;
      apply();
    },
    { passive: false }
  );
  stage.addEventListener("click", () => {
    selected = null;
    reapply();
  });
  const remembered = activeState.get(ctx.sourcePath);
  const startView = initialView(cfg);
  if (remembered) {
    selectedView = remembered.view;
    applyCollapsed(remembered.collapsed);
    applyFilterSnapshot(remembered.filters);
  } else if (startView) {
    selectedView = startView.name;
    applyCollapsed(startView.collapsed || []);
    applyFilterSnapshot(startView.filters || {});
  } else {
    draw();
  }
  window.requestAnimationFrame(fit);
}
