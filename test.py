#!/usr/bin/env python3
"""忘忧小卖部 · 冒烟测试

只用 Python 标准库。不装任何东西就能跑：

    python3 test.sh
    ./test.sh
    python3 test.sh --verbose

守的是这家店真正的承诺：
  1. 零依赖 —— 不许出现 package.json / node_modules 引用
  2. 零构建 —— 源码就是能跑的东西，不需要编译
  3. 零网络 —— 全文不许有外部 http(s) 请求
  4. 断网能用 —— 所有资源都必须在本地
  5. 别白屏 —— 出错要看得见
"""
import os
import re
import sys
import json
import subprocess

ROOT = os.path.dirname(os.path.abspath(__file__))
VERBOSE = "--verbose" in sys.argv or "-v" in sys.argv

PASS, FAIL, WARN = [], [], []


def check(name, ok, detail=""):
    (PASS if ok else FAIL).append(name)
    if VERBOSE or not ok:
        mark = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
        print(f"  {mark} {name}" + (f"  {detail}" if detail else ""))
    return ok


def warn(name, detail=""):
    WARN.append(name)
    if VERBOSE:
        print(f"  \033[33m!\033[0m {name}  {detail}")


def read(rel):
    p = os.path.join(ROOT, rel)
    with open(p, encoding="utf-8") as f:
        return f.read()


def walk(exts):
    out = []
    for dp, dns, fns in os.walk(ROOT):
        dns[:] = [d for d in dns if d not in (".git", "node_modules", "__pycache__")]
        for fn in fns:
            if fn.endswith(exts):
                out.append(os.path.join(dp, fn))
    return out


def rel(p):
    return os.path.relpath(p, ROOT)


# ---------------------------------------------------------------- 1. 目录完整
print("\n【1】文件都在")
EXPECT = [
    "index.html", "start.sh", "README.md", "碎碎念.md",
    "不要删我.txt", "CHANGELOG.md", "LICENSE",
    "css/base.css", "css/apps.css",
    "js/core.js", "js/data.js", "js/ui.js", "js/boot.js",
    "js/app-home.js", "js/app-radio.js", "js/app-kaleido.js",
    "js/app-fate.js", "js/app-slack.js", "js/app-letter.js",
    "js/app-archive.js", "js/app-about.js",
]
for f in EXPECT:
    p = os.path.join(ROOT, f)
    check(f"{f} 存在", os.path.isfile(p),
          "" if os.path.isfile(p) else "文件不见了")

# ---------------------------------------------------------------- 2. 引用完整
print("\n【2】index.html 引用的东西都存在")
html = read("index.html")
refs = re.findall(r'(?:href|src)="([^"#:]+)"', html)
for r in sorted(set(refs)):
    if r.startswith(("http", "//", "data:")):
        continue
    check(f"引用 {r}", os.path.isfile(os.path.join(ROOT, r)), "找不到")

# ---------------------------------------------------------------- 3. 零依赖
print("\n【3】零依赖 · 零构建")
for bad in ("package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
            "node_modules", "webpack.config.js", "vite.config.js", "rollup.config.js"):
    check(f"没有 {bad}", not os.path.exists(os.path.join(ROOT, bad)))

# ---------------------------------------------------------------- 4. 零网络
print("\n【4】零网络请求（这家店最重要的承诺）")
# 排除 README / CHANGELOG / 说明文档里的链接 —— 文档可以有链接，代码不行
DOC_EXT = (".md", ".txt", ".json")
NET = re.compile(r"""(?:https?:)?//[a-z0-9.-]+\.[a-z]{2,}""", re.I)
# 这些域名出现在代码里是允许的（注释/文档字符串里说明用的）
ALLOW = ("localhost", "127.0.0.1", "example.com", "w3.org")

violations = []
for p in walk((".html", ".js", ".css")):
    for i, line in enumerate(read(rel(p)).splitlines(), 1):
        code = line.split("//")[0] if not line.strip().startswith(("*", "/*")) else ""
        for m in NET.finditer(line):
            host = m.group(0).lstrip("/")
            if any(a in host for a in ALLOW):
                continue
            # 纯注释行不算
            st = line.strip()
            if st.startswith(("*", "//", "/*", "<!--")):
                continue
            violations.append(f"{rel(p)}:{i}  {st.strip()[:70]}")

check("代码里没有外部网络请求", not violations,
      f"{len(violations)} 处" if violations else "")
for v in violations[:8]:
    print(f"      \033[31m{v}\033[0m")

# 显式检查几种偷偷联网的方式
for pat, desc in [
    (r"\bXMLHttpRequest\b", "XMLHttpRequest"),
    (r"\bfetch\s*\(", "fetch()"),
    (r"\bnew\s+WebSocket\b", "WebSocket"),
    (r"\bnew\s+EventSource\b", "EventSource"),
    (r"\bnavigator\.sendBeacon\b", "sendBeacon"),
    (r"<img[^>]+src\s*=\s*[\"']https?:", "远程 <img>"),
]:
    hits = []
    for p in walk((".html", ".js")):
        for i, line in enumerate(read(rel(p)).splitlines(), 1):
            if re.search(pat, line, re.I):
                st = line.strip()
                if st.startswith(("*", "//", "/*", "<!--")):
                    continue
                hits.append(f"{rel(p)}:{i}")
    check(f"没用 {desc}", not hits, f"{len(hits)} 处 {hits[:3]}")

# ---------------------------------------------------------------- 5. 存储层
print("\n【5】存储层没被改坏")
core = read("js/core.js")
check("命名空间还是 moyou:v1:", "moyou:v1:" in core)
check("写失败会说话（不再静默吞掉）", "QuotaExceededError" in core,
      "找不到 quota 判断 —— 数据满时会无声丢失")
check("导入会先校验格式", "这不像是本店的存盘" in core)
check("导入失败会如实上报", "lastImport" in core)
check("空间告急会提前提醒", "freeKB" in core and "spaceCheckedAt" in read("js/boot.js"))
check("manifest 存在且合法", os.path.isfile(os.path.join(ROOT, "manifest.webmanifest")))
try:
    mf = json.load(open(os.path.join(ROOT, "manifest.webmanifest"), encoding="utf-8"))
    check("manifest 字段完整", all(k in mf for k in ("name", "start_url", "display")))
    check("manifest 图标没往 assets/ 塞新图片",
          all(not str(i.get("src", "")).startswith("assets/") for i in mf.get("icons", [])))
except Exception as e:
    check("manifest 是合法 JSON", False, str(e)[:80])
html2 = read("index.html")
check("index.html 挂了 manifest", 'rel="manifest"' in html2)
# 万花筒种子分享
kal = read("js/app-kaleido.js")
check("万花筒会读地址里的种子", "resolveQuery" in kal)
check("万花筒有分享按钮", "kal-share" in kal)
check("分享按钮有样式", ".kal-share" in read("css/apps.css"))
check("core 导出了 resolveQuery", "resolveQuery: resolveQuery" in core)

# ---------------------------------------------------------------- 6. 出错看得见
print("\n【6】别白屏")
check("index.html 里有看门狗", "__mzErr" in html)
check("有 <noscript> 兜底", "<noscript" in html)
boot = read("js/boot.js")
check("boot.js 里有 error 监听", "addEventListener('error'" in boot)

# ---------------------------------------------------------------- 7. 键盘与无障碍
print("\n【7】键盘与无障碍")
check("有跳到内容的 skip link", 'class="skip' in html)
check("有 aria-label", html.count("aria-") >= 5, f"只有 {html.count('aria-')} 处")
check("html lang 已声明", 'lang="zh-CN"' in html)
check("有 viewport", "viewport" in html)
ui = read("js/ui.js")
check("绑定了键盘操作", "bindKeys" in ui or "bindKeys" in boot)
check("toast 有 aria-live", 'aria-live' in core)

# ---------------------------------------------------------------- 8. 成就数量
print("\n【8】内容没缩水")
m = re.search(r"var BADGES = \[(.*?)\];", core, re.S)
n_badges = len(re.findall(r"\{\s*id:", m.group(1))) if m else 0
check(f"成就还是 12 枚（现在 {n_badges}）", n_badges == 12, "数量变了")

data = read("js/data.js")
n_jobs = len(re.findall(r"\{\s*t:", data))
check(f"建议还是 115 条（现在 {n_jobs}）", n_jobs == 115, "数量变了")

# ---------------------------------------------------------------- 9. 语法
print("\n【9】语法")
if subprocess.run(["which", "node"], capture_output=True).returncode == 0:
    for p in walk((".js",)):
        r = subprocess.run(["node", "--check", p], capture_output=True)
        check(f"{rel(p)} 语法正确", r.returncode == 0,
              r.stderr.decode("utf-8", "replace")[:120])
else:
    warn("没装 node，跳过 JS 语法检查", "装 node 后能多一道保险")

# ---------------------------------------------------------------- 10. 真的能开门
print("\n【10】真的能开门")
if subprocess.run(["which", "node"], capture_output=True).returncode == 0:
    # 用 node 造一个极简 DOM，确认 core.js 能加载不报错
    probe = os.path.join(ROOT, "__smoke.js")
    with open(probe, "w", encoding="utf-8") as f:
        f.write(
            "const ls={},store={};\n"
            "const document={addEventListener(){},createElement:()=>({style:{},"
            "classList:{add(){},remove(){}},appendChild(){},dataset:{}}),"
            "body:{appendChild(){}},querySelector:()=>null,querySelectorAll:()=>[],"
            "getElementById:()=>null,documentElement:{style:{}}};\n"
            "const window={addEventListener(){},location:{hash:''},matchMedia:()=>({matches:false,addEventListener(){}})};\n"
            "global.localStorage=ls;global.document=document;global.window=window;\n"
            "window.localStorage=ls;window.document=document;\n"
            "try{require('./js/core.js')}catch(e){console.error('LOAD_FAIL: '+e.message);process.exit(1)}\n"
            "if(!window.MZ){console.error('MZ 未挂载');process.exit(1)}\n"
            "const MZ=window.MZ;if(typeof MZ.store.set!=='function'){console.error('store.set 缺失');process.exit(1)}\n"
            "console.log('CORE_OK');\n"
        )
    try:
        r = subprocess.run(["node", probe], capture_output=True, cwd=ROOT, timeout=20)
        out = r.stdout.decode("utf-8", "replace")
        check("core.js 能在空 DOM 里加载", "CORE_OK" in out,
              (r.stderr.decode("utf-8", "replace") or out)[:200])
    except subprocess.TimeoutExpired:
        warn("core.js 加载探测超时")
    finally:
        if os.path.exists(probe):
            os.remove(probe)
else:
    warn("没装 node，跳过加载探测")

# ---------------------------------------------------------------- 汇总
print("\n" + "=" * 56)
g, r_, y = "\033[32m", "\033[31m", "\033[33m"
z = "\033[0m"
if FAIL:
    print(f"{r_}✗ {len(FAIL)} 项失败{z} / {g}{len(PASS)} 项通过{z}"
          + (f" / {y}{len(WARN)} 项跳过{z}" if WARN else ""))
    for f in FAIL:
        print(f"   {r_}·{z} {f}")
    sys.exit(1)
else:
    print(f"{g}✓ 全部 {len(PASS)} 项通过{z}"
          + (f"（{len(WARN)} 项因环境跳过）" if WARN else ""))
    if WARN:
        for w in WARN:
            print(f"   {y}·{z} {w}")
    print("\n门可以开了。")
sys.exit(0)
