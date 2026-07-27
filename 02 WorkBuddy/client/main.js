const API_BASE = "http://localhost:3001/api";

// ==================== API Service ====================

async function apiGet(url) {
  const res = await fetch(`${API_BASE}${url}`);
  return res.json();
}

async function apiPost(url, data) {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// ==================== State ====================

const state = reactive({
  currentView: "dashboard", // dashboard | health | mood | tasks | chat
  dashboard: null,
  healthToday: null,
  healthStats: null,
  moodToday: null,
  toast: null,
  loading: false,
});

// ==================== Reactivity ====================

function reactive(obj) {
  const deps = new Map();
  const handlers = {
    get(target, key) {
      if (typeof target[key] === "object" && target[key] !== null) {
        return new Proxy(target[key], handlers);
      }
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      render();
      return true;
    },
  };
  return new Proxy(obj, handlers);
}

// ==================== Toast ====================

function showToast(message, type = "success", duration = 3000) {
  state.toast = { message, type, id: Date.now() };
  setTimeout(() => {
    if (state.toast?.id === state.toast?.id) state.toast = null;
  }, duration);
}

// ==================== Data Fetching ====================

async function loadDashboard() {
  state.loading = true;
  try {
    const [dashboard, healthStats] = await Promise.all([
      apiGet("/dashboard"),
      apiGet("/health/stats"),
    ]);
    state.dashboard = dashboard.data;
    state.healthStats = healthStats.data;
  } catch (e) {
    console.error("加载仪表盘失败:", e);
  }
  state.loading = false;
}

async function loadHealth() {
  try {
    const result = await apiGet("/health/today");
    state.healthToday = result.data;
  } catch (e) {
    console.error("加载健康数据失败:", e);
  }
}

async function loadMood() {
  try {
    const result = await apiGet("/mood/today");
    state.moodToday = result.data;
  } catch (e) {
    console.error("加载心情数据失败:", e);
  }
}

async function saveHealth(data) {
  try {
    const result = await apiPost("/health", data);
    if (result.success) {
      showToast("健康数据已保存");
      await loadHealth();
      await loadDashboard();
    }
  } catch (e) {
    showToast("保存失败: " + e.message, "error");
  }
}

async function saveMood(data) {
  try {
    const result = await apiPost("/mood", data);
    if (result.success) {
      showToast("心情日记已保存");
      await loadMood();
    }
  } catch (e) {
    showToast("保存失败: " + e.message, "error");
  }
}

// ==================== Components ====================

function ProgressBar(value, max = 100, color = "#6366f1") {
  const w = Math.min(Math.max((value / max) * 100, 0), 100);
  return `<div class="progress-bar"><div class="progress-fill" style="width:${w}%;background:${color}"></div></div>`;
}

function StatCard(label, value, unit = "", icon = "") {
  return `<div class="stat-card">
    ${icon ? `<div style="font-size:22px;margin-bottom:6px">${icon}</div>` : ""}
    <div class="stat-value">${value}<span style="font-size:14px;font-weight:500;color:var(--muted)">${unit}</span></div>
    <div class="stat-label">${label}</div>
  </div>`;
}

function Tag(text, type = "primary") {
  return `<span class="tag tag-${type}">${text}</span>`;
}

// ==================== Date Helpers ====================

const now = new Date();
const today = now.toISOString().split("T")[0];
const todayDay = now.getDate();
const todayMonth = now.getMonth() + 1;
const weekDay = ["日", "一", "二", "三", "四", "五", "六"][now.getDay()];
const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];

// 时间进度
const yearProgress = ((now.getMonth() + 1) / 12 * 100).toFixed(1);
const monthProgress = (now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() * 100).toFixed(1);
const dayProgress = ((now.getHours() * 60 + now.getMinutes()) / 1440 * 100).toFixed(1);
const weekProgress = ((now.getDay() || 7) / 7 * 100).toFixed(1);

// CPA 考试倒计时
const cpaDate = new Date(2025, 7, 23); // 8月23日
const cpaDiff = Math.ceil((cpaDate - now) / (1000 * 60 * 60 * 24));

// ==================== View: Dashboard ====================

function renderDashboard() {
  const d = state.dashboard || {};
  const h = state.healthStats || {};
  return `<div>
    <div class="grid-4">
      ${StatCard("今日笔记", d.todayNotes || "-", "", "📝")}
      ${StatCard("睡眠", d.sleepAvg || "-", "h", "😴")}
      ${StatCard("运动", d.exerciseMinutes || "-", "min", "🏃")}
      ${StatCard("心情", d.moodAvg || "-", "/5", "💭")}
    </div>

    <div class="grid-2" style="margin-top:18px">
      <div class="panel">
        <div class="panel-title">⏳ 时间进度</div>
        <div style="margin:8px 0">今日 ${dayProgress}% ${ProgressBar(dayProgress)}</div>
        <div style="margin:8px 0">本周 ${weekProgress}% ${ProgressBar(weekProgress, 100, "#10b981")}</div>
        <div style="margin:8px 0">本月 ${monthProgress}% ${ProgressBar(monthProgress, 100, "#f59e0b")}</div>
        <div style="margin:8px 0">今年 ${yearProgress}% ${ProgressBar(yearProgress, 100, "#ec4899")}</div>
      </div>

      <div class="panel">
        <div class="panel-title">📊 健康概览（近7天）</div>
        <div class="grid-2">
          ${StatCard("平均睡眠", h.sleepAvg || "-", "h", "😴")}
          ${StatCard("平均运动", h.exerciseAvg || "-", "min", "🏃")}
          ${StatCard("平均饮水", h.waterAvg || "-", "杯", "💧")}
        </div>
        ${cpaDiff > 0 ? `<div style="margin-top:12px;padding:10px;background:rgba(99,102,241,.06);border-radius:12px;text-align:center">
          <span style="font-size:13px;color:var(--muted)">📚 CPA 考试倒计时</span>
          <span style="font-size:32px;font-weight:800;display:block;background:var(--primary-grad);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent">${cpaDiff} 天</span>
        </div>` : ""}
      </div>
    </div>

    <div class="quick-actions">
      <button class="qa-btn" onclick="state.currentView='health'">🏥 健康记录</button>
      <button class="qa-btn" onclick="state.currentView='mood'">💭 心情日记</button>
      <button class="qa-btn" onclick="state.currentView='chat'">🤖 AI 助手</button>
      <button class="qa-btn" onclick="openFileExplorer()">📂 文件浏览</button>
    </div>
  </div>`;
}

// ==================== View: Health ====================

function renderHealth() {
  const today = new Date().toISOString().split("T")[0];
  const h = state.healthToday || {};
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  return `<div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
      <button class="btn btn-outline" onclick="state.currentView='dashboard'">← 返回</button>
      <h2 style="font-size:20px;font-weight:700">🏥 健康追踪</h2>
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-title">
          📅 ${todayMonth}月${todayDay}日 周${weekDays[now.getDay()]}
          <span style="flex:1"></span>
          <button class="btn btn-primary" onclick="showHealthForm()" style="font-size:12px;padding:6px 14px">✏️ 记录</button>
        </div>

        <div class="grid-2">
          <div class="stat-card">
            <div style="font-size:22px;margin-bottom:4px">😴</div>
            <div class="stat-value">${h.sleep || "-"}<span style="font-size:14px;color:var(--muted)">h</span></div>
            <div class="stat-label">睡眠</div>
          </div>
          <div class="stat-card">
            <div style="font-size:22px;margin-bottom:4px">🏃</div>
            <div class="stat-value">${h.exerciseDuration || "-"}<span style="font-size:14px;color:var(--muted)">min</span></div>
            <div class="stat-label">${h.exercise || "运动"}</div>
          </div>
          <div class="stat-card">
            <div style="font-size:22px;margin-bottom:4px">💧</div>
            <div class="stat-value">${h.water || "-"}<span style="font-size:14px;color:var(--muted)">杯</span></div>
            <div class="stat-label">饮水</div>
          </div>
          <div class="stat-card">
            <div style="font-size:22px;margin-bottom:4px">⚖️</div>
            <div class="stat-value">${h.weight || "-"}<span style="font-size:14px;color:var(--muted)">kg</span></div>
            <div class="stat-label">体重</div>
          </div>
        </div>

        ${h.notes ? `<div style="margin-top:14px;padding:12px;background:rgba(99,102,241,.04);border-radius:12px;font-size:13px;color:var(--muted)">📝 ${h.notes}</div>` : ""}
      </div>

      <div class="panel">
        <div class="panel-title">🍽️ 饮食记录</div>
        <div style="padding:10px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:13px;color:var(--muted)">🌅 早餐</span>
          <div style="font-size:14px;margin-top:2px">${h.breakfast || "未记录"}</div>
        </div>
        <div style="padding:10px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:13px;color:var(--muted)">☀️ 午餐</span>
          <div style="font-size:14px;margin-top:2px">${h.lunch || "未记录"}</div>
        </div>
        <div style="padding:10px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:13px;color:var(--muted)">🌆 晚餐</span>
          <div style="font-size:14px;margin-top:2px">${h.dinner || "未记录"}</div>
        </div>
        <div style="padding:10px 0">
          <span style="font-size:13px;color:var(--muted)">🍿 零食</span>
          <div style="font-size:14px;margin-top:2px">${h.snacks || "未记录"}</div>
        </div>
      </div>
    </div>
  </div>`;
}

// ==================== View: Mood ====================

function renderMood() {
  const m = state.moodToday || {};
  const moodEmojis = ["", "😢", "😔", "😐", "🙂", "😄"];

  return `<div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
      <button class="btn btn-outline" onclick="state.currentView='dashboard'">← 返回</button>
      <h2 style="font-size:20px;font-weight:700">💭 心情日记</h2>
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-title">
          今日心情
          <span style="flex:1"></span>
          <button class="btn btn-primary" onclick="showMoodForm()" style="font-size:12px;padding:6px 14px">✏️ 记录</button>
        </div>
        <div style="text-align:center;padding:20px 0">
          <div style="font-size:64px">${moodEmojis[m.mood] || "😐"}</div>
          <div style="font-size:24px;font-weight:700;margin-top:8px">${m.mood ? m.mood + "/5" : "今日未记录"}</div>
          ${(m.tags || []).length > 0 ? `<div style="margin-top:8px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap">${m.tags.map(t => Tag(t)).join("")}</div>` : ""}
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">🌟 感恩日记</div>
        ${(m.gratitude || []).length > 0 ?
          `<ul style="list-style:none;padding:0">${m.gratitude.map(g => `<li style="padding:8px 0;border-bottom:1px solid var(--border);font-size:14px">💫 ${g}</li>`).join("")}</ul>`
          : `<div style="text-align:center;padding:20px;color:var(--muted)">今天还没记录感恩事项</div>`}
      </div>
    </div>

    ${m.content ? `<div class="panel" style="margin-top:18px">
      <div class="panel-title">📝 今日日记</div>
      <div style="font-size:14px;line-height:1.8;white-space:pre-wrap">${m.content}</div>
    </div>` : ""}
  </div>`;
}

// ==================== View: Chat ====================

let chatMessages = [];

function renderChat() {
  return `<div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
      <button class="btn btn-outline" onclick="state.currentView='dashboard'">← 返回</button>
      <h2 style="font-size:20px;font-weight:700">🤖 AI 助手</h2>
      <span style="font-size:12px;color:var(--muted)">基于 CodeBuddy Agent SDK</span>
    </div>

    <div class="panel" style="min-height:400px;display:flex;flex-direction:column">
      <div id="chat-messages" style="flex:1;overflow-y:auto;max-height:500px;padding:10px 0">
        ${chatMessages.length === 0 ? `<div style="text-align:center;color:var(--muted);padding:40px">欢迎使用 WorkBuddy AI 助手！<br/>我可以帮你管理健康数据、记录心情、搜索笔记。</div>` : ""}
        ${chatMessages.map(m => renderChatBubble(m)).join("")}
      </div>
      <div style="margin-top:16px;display:flex;gap:8px">
        <input type="text" id="chat-input" placeholder="输入消息..." style="flex:1;padding:10px 14px;border-radius:10px;border:1.5px solid var(--border);font-family:var(--font);font-size:14px" onkeypress="if(event.key==='Enter')sendChat()" />
        <button class="btn btn-primary" onclick="sendChat()">发送</button>
      </div>
    </div>
  </div>`;
}

function renderChatBubble(m) {
  return `<div style="margin:8px 0;padding:10px 14px;border-radius:12px;font-size:13px;${m.role==='user'?'background:rgba(99,102,241,.08);margin-left:40px':'background:rgba(15,23,42,.04);margin-right:40px'}">
    <div style="font-weight:600;font-size:11px;color:var(--muted);margin-bottom:4px">${m.role === 'user' ? '👤 你' : '🤖 WorkBuddy'}</div>
    ${m.content}
  </div>`;
}

async function sendChat() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  chatMessages.push({ role: "user", content: text });
  chatMessages.push({ role: "assistant", content: "思考中..." });
  input.value = "";
  render();

  try {
    const result = await apiPost("/chat", { message: text });
    chatMessages = chatMessages.filter(m => m.content !== "思考中...");
    if (result.success) {
      const lastMsg = result.data?.[result.data.length - 1];
      chatMessages.push({ role: "assistant", content: lastMsg?.content?.[0]?.text || "完成" });
    } else {
      chatMessages.push({ role: "assistant", content: "出错了: " + result.error });
    }
  } catch (e) {
    chatMessages = chatMessages.filter(m => m.content !== "思考中...");
    chatMessages.push({ role: "assistant", content: "连接失败: " + e.message });
  }
  render();
}

// ==================== Modals ====================

function showHealthForm() {
  const today = new Date().toISOString().split("T")[0];
  const h = state.healthToday || {};
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `<div class="modal">
    <h3>✏️ 记录健康数据 - ${todayMonth}月${todayDay}日</h3>
    <div class="form-group"><label>睡眠时长 (小时)</label><input id="hf-sleep" type="number" step="0.1" value="${h.sleep || ""}" /></div>
    <div class="form-group"><label>睡眠质量 (1-5)</label><input id="hf-sleep-quality" type="number" min="1" max="5" value="${h.sleepQuality || ""}" /></div>
    <div class="form-group"><label>运动类型</label><input id="hf-exercise" value="${h.exercise || ""}" placeholder="跑步/游泳/健身..." /></div>
    <div class="form-group"><label>运动时长 (分钟)</label><input id="hf-exercise-duration" type="number" value="${h.exerciseDuration || ""}" /></div>
    <div class="form-group"><label>饮水 (杯)</label><input id="hf-water" type="number" value="${h.water || ""}" /></div>
    <div class="form-group"><label>早餐</label><input id="hf-breakfast" value="${h.breakfast || ""}" /></div>
    <div class="form-group"><label>午餐</label><input id="hf-lunch" value="${h.lunch || ""}" /></div>
    <div class="form-group"><label>晚餐</label><input id="hf-dinner" value="${h.dinner || ""}" /></div>
    <div class="form-group"><label>体重 (kg)</label><input id="hf-weight" type="number" step="0.1" value="${h.weight || ""}" /></div>
    <div class="form-group"><label>备注</label><textarea id="hf-notes" rows="2">${h.notes || ""}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
      <button class="btn btn-primary" id="save-health-btn">保存</button>
    </div>
  </div>`;

  document.body.appendChild(modal);

  modal.querySelector("#save-health-btn").onclick = async () => {
    const data = {
      date: today,
      sleep: parseFloat(modal.querySelector("#hf-sleep").value) || 0,
      sleepQuality: parseInt(modal.querySelector("#hf-sleep-quality").value) || 0,
      exercise: modal.querySelector("#hf-exercise").value,
      exerciseDuration: parseInt(modal.querySelector("#hf-exercise-duration").value) || 0,
      water: parseInt(modal.querySelector("#hf-water").value) || 0,
      breakfast: modal.querySelector("#hf-breakfast").value,
      lunch: modal.querySelector("#hf-lunch").value,
      dinner: modal.querySelector("#hf-dinner").value,
      snacks: "",
      weight: parseFloat(modal.querySelector("#hf-weight").value) || 0,
      notes: modal.querySelector("#hf-notes").value,
      sleepQuality: parseInt(modal.querySelector("#hf-sleep-quality").value) || 0,
    };
    await saveHealth(data);
    modal.remove();
    render();
  };

  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function showMoodForm() {
  const today = new Date().toISOString().split("T")[0];
  const m = state.moodToday || {};

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `<div class="modal">
    <h3>💭 记录心情 - ${todayMonth}月${todayDay}日</h3>
    <div class="form-group"><label>心情指数 (1-5)</label>
      <div style="display:flex;gap:10px;margin-top:6px" id="mood-picker">
        ${[1,2,3,4,5].map(i => `<button class="mood-btn ${m.mood===i?'active':''}" data-val="${i}" style="font-size:36px;cursor:pointer;border:none;background:none;opacity:${m.mood===i?'1':'0.4'};transition:all.2s">${["","😢","😔","😐","🙂","😄"][i]}</button>`).join("")}
      </div>
    </div>
    <input type="hidden" id="mf-mood" value="${m.mood || 3}" />
    <div class="form-group"><label>标签</label><input id="mf-tags" placeholder="开心,学习,运动..." value="${(m.tags||[]).join(",")}" /></div>
    <div class="form-group"><label>日记内容</label><textarea id="mf-content" rows="4">${m.content || ""}</textarea></div>
    <div class="form-group"><label>感恩事项（每行一个）</label><textarea id="mf-gratitude" rows="3">${(m.gratitude||[]).join("\n")}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
      <button class="btn btn-primary" id="save-mood-btn">保存</button>
    </div>
  </div>`;

  document.body.appendChild(modal);

  // Mood picker
  modal.querySelectorAll(".mood-btn").forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll(".mood-btn").forEach(b => b.style.opacity = "0.4");
      btn.style.opacity = "1";
      modal.querySelector("#mf-mood").value = btn.dataset.val;
    };
  });

  modal.querySelector("#save-mood-btn").onclick = async () => {
    const data = {
      date: today,
      mood: parseInt(modal.querySelector("#mf-mood").value),
      tags: modal.querySelector("#mf-tags").value.split(",").map(t => t.trim()).filter(Boolean),
      content: modal.querySelector("#mf-content").value,
      gratitude: modal.querySelector("#mf-gratitude").value.split("\n").filter(Boolean),
    };
    await saveMood(data);
    modal.remove();
    render();
  };

  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

async function openFileExplorer() {
  try {
    const result = await apiGet("/list");
    if (!result.success) { showToast("无法读取目录", "error"); return; }

    const files = result.data || [];
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `<div class="modal" style="max-width:600px">
      <h3>📂 Vault 目录</h3>
      <div style="max-height:400px;overflow-y:auto">
        ${files.map(f => `<div style="padding:8px 12px;border-bottom:1px solid var(--border);font-size:14px;display:flex;align-items:center;gap:8px">
          ${f.endsWith('.md') ? '📝' : '📁'} ${f}
        </div>`).join("")}
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">关闭</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  } catch (e) {
    showToast("读取目录失败", "error");
  }
}

// ==================== Header ====================

function renderHeader() {
  return `<header>
    <div class="brand-wrap">
      <h1><span style="font-size:22px">⚡</span> <span class="brand">WorkBuddy</span></h1>
      <div class="sub">个人工作台 · 文件逻辑与 Obsidian 主页一致</div>
    </div>
    <div class="spacer"></div>
    <div class="calendar-mini">
      <div class="date-big">${todayDay}</div>
      <div class="month-label">${monthNames[todayMonth - 1]} · 周${weekDay}</div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin-left:16px">
      ${["dashboard","health","mood","chat"].map(v => `<button class="btn btn-outline" onclick="state.currentView='${v}'" style="font-size:12px;padding:6px 12px;${state.currentView===v?'border-color:var(--primary);color:var(--primary);background:rgba(99,102,241,.06)':''}">${v==='dashboard'?'🏠':v==='health'?'🏥':v==='mood'?'💭':'🤖'}</button>`).join("")}
    </div>
  </header>`;
}

// ==================== Main Render ====================

function render() {
  const app = document.getElementById("app");
  let viewHtml = "";

  switch (state.currentView) {
    case "health": viewHtml = renderHealth(); break;
    case "mood": viewHtml = renderMood(); break;
    case "chat": viewHtml = renderChat(); break;
    default: viewHtml = renderDashboard(); break;
  }

  app.innerHTML = `
    ${renderHeader()}
    ${viewHtml}
    ${state.toast ? `<div class="toast toast-${state.toast.type}" id="toast-${state.toast.id}">${state.toast.message}</div>` : ""}
  `;
}

// ==================== Init ====================

async function init() {
  await Promise.all([loadDashboard(), loadHealth(), loadMood()]);
  render();
}

// 切换视图时重新加载对应数据
const origSet = state.constructor.prototype.valueOf || {};
Object.defineProperty(state, "currentView", {
  get() { return state._currentView; },
  set(v) {
    state._currentView = v;
    if (v === "health") loadHealth();
    if (v === "mood") loadMood();
    if (v === "dashboard") loadDashboard();
    render();
  },
});

init();
