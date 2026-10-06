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

function runPs(text) {
  const res = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(text, 'utf16le').toString('base64')],
    { stdio: 'pipe', encoding: 'utf8' }
  );
  if (res.status !== 0) {
    process.stdout.write(res.stdout || '');
    process.stderr.write(res.stderr || '');
    process.exit(res.status || 1);
  }
  return res.stdout || '';
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

# 尝试通过 Shell 动词自动固定到“开始”屏幕
$shell = New-Object -ComObject Shell.Application
$ns = $shell.NameSpace($programs)
$item = $ns.ParseName('小说阅读器.lnk')
$verbNames = @($item.Verbs() | ForEach-Object { $_.Name })
Write-Output ('VERBS=' + ($verbNames -join ' | '))
$pin = $item.Verbs() | Where-Object { ($_.Name -replace '&', '') -match '固定.*开始|开始.*固定|Pin.*Start|Start.*Pin' }
if ($pin) {
  $pin | Select-Object -First 1 | ForEach-Object { $_.DoIt() }
  Start-Sleep -Milliseconds 800
  Write-Output ('PIN_INVOKED=' + (@($pin)[0].Name))
} else {
  Write-Output 'PIN_VERB_NOT_FOUND'
}
`;
const out = runPs(psShortcut);
process.stdout.write(out);
console.log('ICON=' + iconFile);
