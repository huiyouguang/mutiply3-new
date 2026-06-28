---
tags:
  - agent/控制台
  - 主页/工具
PrevNote: "[[主页-开发文档]]"
words:
  2026-06-25: 1726
  2026-06-26: 1402
NextNote: "[[主页2]]"
---

# 🤖 Mcyo · Agent 控制台

```dataviewjs
(async () => {
const dark = document.body.classList.contains('theme-dark');
const C = {
  card: dark ? '#27272b' : '#ffffff',
  c2: dark ? '#2e2e33' : '#fafafa',
  txt: dark ? '#e4e4e7' : '#3a3a3e',
  sub: dark ? '#9ca3af' : '#888896',
  ac: dark ? '#a78bfa' : '#8b5cf6',
  blu: dark ? '#60a5fa' : '#3b82f6',
  gn: dark ? '#34d399' : '#10b981',
  ora: dark ? '#fbbf24' : '#f59e0b',
  red: dark ? '#f87171' : '#ef4444',
  bd: dark ? '#3f3f46' : '#e5e7eb',
};
const NOW = new Date();

// ── 全局状态 ──
let activeCount = 5;

// ── 顶部状态栏 ──
const cid = 'ctl-' + Date.now();
dv.paragraph(`<div id="${cid}">
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;">
    <div style="background:${C.card};border-radius:12px;padding:12px;border:1px solid ${C.bd};text-align:center;">
      <div style="font-size:22px;font-weight:700;color:${C.ac};">5</div>
      <div style="font-size:11px;color:${C.sub};">代码块</div>
    </div>
    <div style="background:${C.card};border-radius:12px;padding:12px;border:1px solid ${C.bd};text-align:center;">
      <div id="ctl-active-count" style="font-size:22px;font-weight:700;color:${C.gn};">5</div>
      <div style="font-size:11px;color:${C.sub};">已启用</div>
    </div>
    <div style="background:${C.card};border-radius:12px;padding:12px;border:1px solid ${C.bd};text-align:center;">
      <div style="font-size:22px;font-weight:700;color:${C.ora};">0</div>
      <div style="font-size:11px;color:${C.sub};">待处理</div>
    </div>
    <div style="background:${C.card};border-radius:12px;padding:12px;border:1px solid ${C.bd};text-align:center;">
      <div style="font-size:22px;font-weight:700;color:${C.blu};">${NOW.getHours()}:${String(NOW.getMinutes()).padStart(2,'0')}</div>
      <div style="font-size:11px;color:${C.sub};">当前时间</div>
    </div>
  </div>
  <div id="ctl-toolbar" style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;"></div>
  <div id="ctl-modules"></div>
  <div style="text-align:center;padding:16px 0 6px;font-size:11px;color:${C.sub};border-top:1px solid ${C.bd};margin-top:6px;">
    🤖 Mcyo Agent Console v3.0 · 5-Block 架构 · [[主页-开发文档|开发文档]] · [[主页 2|主控台]]
  </div>
</div>`);

requestAnimationFrame(() => {
  const root = document.getElementById(cid);
  if (!root) return;

  // ── 工具栏按钮 (可点击) ──
  const toolbar = root.querySelector('#ctl-toolbar');
  const tbtns = [
    { icon:'➕', text:'新增模块', color:C.ac, action: ()=>alert('📝 5-Block 架构：选一个 Block 追加代码\n\n读取共享状态：\nconst __m = window.__mcyo;\nconst { C, navigateTo } = __m;\n\n渲染：\nconst mod = dv.el("div","");\nmod.style.cssText = `background:${C.card};...`;\nmod.innerHTML = `...`;') },
    { icon:'🌐', text:'打开主页', color:C.blu, action: ()=>app.workspace.openLinkText('主页 2','',false) },
    { icon:'📖', text:'开发文档', color:C.ora, action: ()=>app.workspace.openLinkText('主页-开发文档','',false) },
  ];
  tbtns.forEach(b => {
    const btn = document.createElement('button');
    btn.innerHTML = `${b.icon} ${b.text}`;
    btn.style.cssText = `background:${b.color}22;border:1px solid ${b.color}44;color:${b.color};padding:6px 14px;border-radius:20px;font-size:12px;cursor:pointer;transition:all 0.15s;`;
    btn.onmouseover = () => { btn.style.background = b.color + '44'; };
    btn.onmouseout = () => { btn.style.background = b.color + '22'; };
    btn.addEventListener('click', b.action);
    toolbar.appendChild(btn);
  });

  // ── 模块数据（5-Block 架构）──
  let modules = [
    { id:'Setup', name:'🎨 Setup: 共享环境', group:'基础设施', ico:'⚙️', desc:'色彩系统·工具函数·全局数据→window.__mcyo', active:true },
    { id:'1', name:'🏠 Block1: 顶部区', group:'核心区', ico:'🏠', desc:'横幅·天气·愿景板·三列概览(时间/考试/统计)', active:true },
    { id:'2', name:'😊 Block2: 个人区', group:'核心区', ico:'😊', desc:'心情日记(10心情·热力图)·播客生活(4分类)', active:true },
    { id:'3', name:'📚 Block3: 学习区', group:'核心区', ico:'📚', desc:'学习入口·知识花园·快捷面板·最近编辑·Thino灵感', active:true },
    { id:'4', name:'📋 Block4: 数据区', group:'核心区', ico:'📋', desc:'CPA备考(6科·父子层级)·热力图·数据看板·Vault Stats·页脚', active:true },
  ];

  const groups = ['基础设施','核心区'];
  const gIcons = { '基础设施':'⚙️','核心区':'⭐' };
  const gColors = { '基础设施':C.ora,'核心区':C.ac };

  function updateActiveCount() {
    activeCount = modules.filter(m => m.active).length;
    const el = root.querySelector('#ctl-active-count');
    if (el) { el.textContent = activeCount; el.style.color = activeCount < 10 ? C.ora : C.gn; }
  }

  // ── 渲染所有模块组 ──
  const container = root.querySelector('#ctl-modules');
  groups.forEach(g => {
    const blocks = modules.filter(m => m.group === g);
    if (blocks.length === 0) return;

    const gDiv = document.createElement('div');
    gDiv.style.cssText = `background:${C.card};border-radius:14px;padding:16px 20px;margin-bottom:14px;border:1px solid ${C.bd};`;

    const header = document.createElement('div');
    header.style.cssText = `display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;cursor:pointer;`;
    header.innerHTML = `<span style="font-size:14px;font-weight:600;color:${C.txt};">${gIcons[g]} ${g}</span>
      <span style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:11px;color:${C.sub};">${blocks.length} 个模块</span>
        <span class="tog-icon" style="font-size:12px;color:${C.sub};">▼</span>
      </span>`;

    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

    function renderGroupItems() {
      list.innerHTML = '';
      blocks.forEach((m, i) => {
        const item = document.createElement('div');
        item.style.cssText = `display:flex;align-items:center;gap:10px;padding:10px 12px;background:${C.c2};border-radius:10px;border:1px solid ${m.active?C.bd:C.red+'44'};transition:all 0.15s;`;
        if (m.active) {
          item.onmouseover = () => { item.style.borderColor = gColors[g]; item.style.boxShadow = `0 2px 8px ${gColors[g]}22`; };
          item.onmouseout = () => { item.style.borderColor = C.bd; item.style.boxShadow = 'none'; };
        }

        item.innerHTML = `<span style="font-size:11px;color:${C.sub};width:20px;text-align:center;font-weight:600;">${i+1}</span>
          <span style="font-size:18px;">${m.ico}</span>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:500;color:${m.active?C.txt:C.sub};">${m.name}</div>
            <div style="font-size:10px;color:${C.sub};margin-top:2px;">${m.desc}</div>
          </div>`;

        // ↑按钮
        if (i > 0) {
          const upBtn = document.createElement('button');
          upBtn.textContent = '↑';
          upBtn.style.cssText = `background:transparent;border:1px solid ${C.bd};color:${C.sub};width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:12px;`;
          upBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            [blocks[i-1], blocks[i]] = [blocks[i], blocks[i-1]];
            renderGroupItems();
          });
          item.appendChild(upBtn);
        } else {
          const sp = document.createElement('span');
          sp.style.cssText = 'width:26px;height:26px;';
          item.appendChild(sp);
        }

        // ↓按钮
        if (i < blocks.length - 1) {
          const dnBtn = document.createElement('button');
          dnBtn.textContent = '↓';
          dnBtn.style.cssText = `background:transparent;border:1px solid ${C.bd};color:${C.sub};width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:12px;`;
          dnBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            [blocks[i], blocks[i+1]] = [blocks[i+1], blocks[i]];
            renderGroupItems();
          });
          item.appendChild(dnBtn);
        } else {
          const sp = document.createElement('span');
          sp.style.cssText = 'width:26px;height:26px;';
          item.appendChild(sp);
        }

        // ▼ 开关
        const tgl = document.createElement('label');
        tgl.style.cssText = 'position:relative;display:inline-block;width:42px;height:24px;cursor:pointer;flex-shrink:0;';
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.checked = m.active;
        cb.style.cssText = 'opacity:0;width:0;height:0;position:absolute;';
        const sp = document.createElement('span');
        sp.style.cssText = `position:absolute;top:0;left:0;right:0;bottom:0;background:${m.active?C.gn:C.red+'66'};border-radius:24px;transition:0.3s;`;
        const dot = document.createElement('span');
        dot.style.cssText = `position:absolute;top:3px;left:${m.active?'21px':'3px'};width:18px;height:18px;background:white;border-radius:50%;transition:0.3s;`;
        sp.appendChild(dot);
        tgl.appendChild(cb); tgl.appendChild(sp);

        tgl.addEventListener('click', (e) => {
          e.stopPropagation();
          m.active = !m.active;
          updateActiveCount();
          renderGroupItems();
        });
        item.appendChild(tgl);

        list.appendChild(item);
      });
    }

    renderGroupItems();

    // 折叠/展开
    let open = true;
    header.addEventListener('click', () => {
      open = !open;
      list.style.display = open ? 'flex' : 'none';
      header.querySelector('.tog-icon').textContent = open ? '▼' : '▶';
    });

    gDiv.appendChild(header);
    gDiv.appendChild(list);
    container.appendChild(gDiv);
  });
});

})();
```
