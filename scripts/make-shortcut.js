'use strict';

/*
 * 把“小说阅读器”安装到开始菜单（所有应用列表），并尝试自动固定到“开始”屏幕。
 * 图标由 PowerShell GDI+ 绘制成 256x256 PNG，再在 Node 侧打包成
 * PNG-in-ICO 容器（Vista+ 支持），避免 HICON 降质。
 *
 * 注意：Windows 11 对脚本固定“开始”屏幕有限制，若自动固定未生效，
 * 在开始菜单“所有应用”里右键“小说阅读器”→“固定到‘开始’屏幕”即可。
 *
 * 用法：node scripts/make-shortcut.js（或 npm run shortcut）
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const electronExe = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
if (!fs.existsSync(electronExe)) {
  console.error('未找到 electron.exe，请先在项目目录运行 npm install');
  process.exit(1);
}

const assetsDir = path.join(root, 'assets');
fs.mkdirSync(assetsDir, { recursive: true });
const pngFile = path.join(assetsDir, 'icon.png');
const iconFile = path.join(assetsDir, 'icon.ico');

const ps = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear([System.Drawing.Color]::Transparent)

# 圆角背景
$round = New-Object System.Drawing.Drawing2D.GraphicsPath
$r = 52
$round.AddArc(10, 10, $r, $r, 180, 90)
$round.AddArc(246 - $r, 10, $r, $r, 270, 90)
$round.AddArc(246 - $r, 246 - $r, $r, $r, 0, 90)
$round.AddArc(10, 246 - $r, $r, $r, 90, 90)
$round.CloseFigure()

$rect = New-Object System.Drawing.Rectangle(10, 10, 236, 236)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, [System.Drawing.Color]::FromArgb(255, 186, 138, 84), [System.Drawing.Color]::FromArgb(255, 138, 94, 46), 90)
$g.FillPath($brush, $round)

# 书脊
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(130, 255, 244, 224), 5)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawLine($pen, 60, 54, 60, 202)

# “阅”字
$font = New-Object System.Drawing.Font('Microsoft YaHei UI', 116, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = [System.Drawing.StringAlignment]::Center
$fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
$textBox = New-Object System.Drawing.RectangleF(48, 16, 182, 224)
$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$g.DrawString([string][char]0x9605, $font, $white, $textBox, $fmt)
$g.Dispose()

$png = '${pngFile.replace(/\\/g, '/')}'
$bmp.Save($png, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
`;

// PowerShell 在非 TTY 管道下会把错误包装成 CLIXML，直接打印会是一堆乱码，
// 这里先把 <S S="Error"> 的内容还原成纯文本，再丢掉 CLIXML 容器。
function cleanPs(raw) {
  let s = String(raw || '');
  s = s.replace(/<S S="Error">([\s\S]*?)<\/S>/g, (_, t) => t.replace(/_x000D_|_x000A_/g, '\n'));
  s = s.replace(/^#<\s*CLIXML.*$/gm, '');
  s = s.replace(/<[^>]*>/g, '');
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

function runPs(text) {
  const res = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(text, 'utf16le').toString('base64')],
    { stdio: 'pipe', encoding: 'utf8' }
  );
  const out = cleanPs(res.stdout);
  const err = cleanPs(res.stderr);
  if (res.status !== 0) {
    if (out) process.stdout.write(out + '\n');
    if (err) process.stderr.write(err + '\n');
    process.exit(res.status || 1);
  }
  if (err) process.stderr.write(err + '\n');
  return out;
}

runPs(ps);

// ---- 把 PNG 打包成 ICO（256x256 PNG-in-ICO） ----
const png = fs.readFileSync(pngFile);
const head = Buffer.alloc(6);
head.writeUInt16LE(0, 0); // 保留
head.writeUInt16LE(1, 2); // 类型：图标
head.writeUInt16LE(1, 4); // 图片数量
const entry = Buffer.alloc(16);
entry[0] = 0; // 宽 256（0 表示 256）
entry[1] = 0; // 高 256
entry[2] = 0; // 调色板
entry[3] = 0; // 保留
entry.writeUInt16LE(1, 4); // 颜色平面
entry.writeUInt16LE(32, 6); // 位深
entry.writeUInt32LE(png.length, 8);
entry.writeUInt32LE(6 + 16, 12); // PNG 数据偏移
fs.writeFileSync(iconFile, Buffer.concat([head, entry, png]));
fs.copyFileSync(pngFile, path.join(assetsDir, 'icon-preview.png'));

// ---- 创建“开始菜单 → 所有应用”快捷方式，并尝试固定到“开始”屏幕 ----
const psShortcut = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

$programs = [Environment]::GetFolderPath([Environment+SpecialFolder]::Programs)
$lnkPath = Join-Path $programs '小说阅读器.lnk'
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut($lnkPath)
$lnk.TargetPath = '${electronExe}'
$lnk.Arguments = '"' + '${root}' + '"'
$lnk.WorkingDirectory = '${root}'
$lnk.IconLocation = '${iconFile}' + ',0'
$lnk.Description = '小说阅读器'
$lnk.Save()
Write-Output ('LNK=' + $lnkPath)

# 尝试通过 Shell 动词固定到“开始”屏幕。
# 注意：已固定的快捷方式只有「从“开始”菜单取消固定」没有「固定到“开始”屏幕」，
# 因此必须先把“取消固定”排除掉，否则会误调取消固定并抛 E_ACCESSDENIED。
$shell = New-Object -ComObject Shell.Application
$ns = $shell.NameSpace($programs)
$item = $ns.ParseName('小说阅读器.lnk')
$verbs = @($item.Verbs())
$verbNames = @($verbs | ForEach-Object { $_.Name -replace '&', '' })
Write-Output ('VERBS=' + ($verbNames -join ' | '))

$unpinVerb = $verbs | Where-Object { ($_.Name -replace '&', '') -match '取消固定|Unpin from' }
$pinVerb = $verbs | Where-Object {
  $n = ($_.Name -replace '&', '').Trim()
  ($n -notmatch '取消|Unpin') -and ($n -match '固定到|Pin to (Start|Taskbar)')
}

if ($unpinVerb) {
  Write-Output 'PIN_STATE=ALREADY_PINNED'
} elseif (-not $pinVerb) {
  Write-Output 'PIN_STATE=NO_VERB'
} else {
  try {
    $pinVerb | Select-Object -First 1 | ForEach-Object { $_.DoIt() }
    Start-Sleep -Milliseconds 800
    Write-Output 'PIN_STATE=PINNED'
  } catch {
    Write-Output ('PIN_STATE=BLOCKED ' + $_.Exception.Message)
  }
}
`;
const out = runPs(psShortcut);
process.stdout.write(out + '\n');
console.log('ICON=' + iconFile);

if (!/PIN_STATE=(PINNED|ALREADY_PINNED)/.test(out)) {
  console.log('');
  console.log('快捷方式已安装到「开始菜单 → 所有应用」，可以直接搜索“小说阅读器”启动。');
  console.log('自动固定到「开始」屏幕被系统拦截，手动固定只需一次点击：');
  console.log('  开始菜单 → 所有应用 → 右键「小说阅读器」→ 固定到“开始”屏幕');
}
