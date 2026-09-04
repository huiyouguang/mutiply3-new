#!/usr/bin/env bash
# ============================================================
# Xove Dashboard 定制补丁 —— 插件升级后一键重打
#
# 定制内容：
#   1) 目标进度模块：自定义目标（新增/编辑/删除）
#   2) 写作目标自动字数统计（排除 node_modules，持久缓存 + 后台重算，不阻塞首屏）
#   3) 主页「导入」改为「新建」：一级入口——新建日记 / 新建任务 / 新建项目
#      （复用 Xove 原生创建流程，数据格式与「快速捕获」「全部项目」完全一致）
#   4) 修复：清空目标后默认目标自动复活
#   5) 切断更新：manifest 版本锁定 99.99.99
#
# 用法：
#   ./apply-patch.sh                      # 用默认插件目录
#   ./apply-patch.sh /path/to/xove-dashboard
# ============================================================
set -uo pipefail

PLUGIN="${1:-$HOME/Downloads/mutiply3/.obsidian/plugins/xove-dashboard}"
HERE="$(cd "$(dirname "$0")" && pwd)"
TS="$(date +%Y%m%d-%H%M%S)"

echo "补丁目录：$HERE"
echo "插件目录：$PLUGIN"
echo ""

if [ ! -f "$PLUGIN/main.js" ]; then
  echo "❌ 找不到 $PLUGIN/main.js"
  exit 1
fi

# ---------- 1. 备份 ----------
cp "$PLUGIN/main.js"         "$PLUGIN/main.js.bak.$TS"
cp "$PLUGIN/styles.css"      "$PLUGIN/styles.css.bak.$TS" 2>/dev/null
[ -f "$PLUGIN/manifest.json" ] && cp "$PLUGIN/manifest.json" "$PLUGIN/manifest.json.bak.$TS"
echo "✅ 已备份为 *.$TS"

# ---------- 2. main.js ----------
if grep -q 'class GoalEditModal' "$PLUGIN/main.js"; then
  echo "⏭  main.js 已含定制补丁，跳过（避免重复叠加）"
else
  if patch -p0 --fuzz=3 --forward -i "$HERE/xove-main.patch" "$PLUGIN/main.js"; then
    echo "✅ main.js 定制补丁已应用"
  else
    echo "❌ main.js 补丁应用失败（通常是官方改版导致上下文不匹配）"
    echo "   方案A（保留定制、放弃新版改动）："
    echo "     cp \"$HERE/main.js.patched\" \"$PLUGIN/main.js\""
    echo "   方案B：手动把 xove-main.patch 里的改动合并进新版 main.js"
    exit 1
  fi
fi

# ---------- 3. styles.css ----------
if [ -f "$PLUGIN/styles.css" ]; then
  if grep -q 'im-grid' "$PLUGIN/styles.css"; then
    echo "⏭  styles.css 已含定制样式，跳过"
  elif patch -p0 --fuzz=3 --forward -i "$HERE/xove-styles.patch" "$PLUGIN/styles.css"; then
    echo "✅ styles.css 定制样式已应用"
  else
    cp "$HERE/styles.css.patched" "$PLUGIN/styles.css"
    echo "⚠️  patch 失败，已用定制版 styles.css 整体覆盖"
  fi
fi

# ---------- 4. 切断更新 ----------
python3 - "$PLUGIN/manifest.json" <<'PY'
import json, sys
p = sys.argv[1]
try:
    d = json.load(open(p, encoding='utf-8'))
except Exception as e:
    print('⚠️  manifest.json 读取失败：%s' % e)
    sys.exit(0)
d['version'] = '99.99.99'
if '定制版' not in d.get('name', ''):
    d['name'] = d.get('name', 'Xove Dashboard') + ' (定制版·勿更新)'
with open(p, 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent='\t')
print('✅ manifest.json 已锁定：version=99.99.99')
PY

# ---------- 5. 校验 ----------
if command -v node >/dev/null 2>&1; then
  if node --check "$PLUGIN/main.js"; then
    echo "✅ main.js 语法校验通过"
  else
    echo "❌ 语法校验失败！回滚：cp \"$PLUGIN/main.js.bak.$TS\" \"$PLUGIN/main.js\""
    exit 1
  fi
else
  echo "⚠️  未找到 node，跳过语法校验"
fi

echo ""
echo "🎉 完成。请重启 Obsidian（或禁用再启用 Xove Dashboard）后生效。"
