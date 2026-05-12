/* ============================================
   知行案例库 — 一键同步脚本
   用法：node sync.js
   把导出的 zip 放到跟 index.html 同一目录，
   运行此脚本自动解压并上传到 GitHub
   ============================================ */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_DIR = __dirname;
const ZIP_FILE = path.join(REPO_DIR, '知行案例库_导出.zip');
const TOKEN_FILE = path.join(REPO_DIR, '.github_token');

// ---- 1. 检查 token 文件 ----
if (!fs.existsSync(TOKEN_FILE)) {
  console.log('首次使用需要 GitHub Token，生成方法：');
  console.log('1. 打开 https://github.com/settings/tokens/new');
  console.log('2. Note 填「知行案例库」');
  console.log('3. Expiration 选 No expiration');
  console.log('4. 勾选 repo（会自动勾选下面全部）');
  console.log('5. 点 Generate token，复制 ghp_ 开头的那串字符');
  console.log('');
  process.stdout.write('请粘贴 Token: ');

  const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  readline.question('', function(token) {
    token = token.trim();
    if (!token.startsWith('ghp_')) {
      console.log('Token 格式不对，应该以 ghp_ 开头');
      process.exit(1);
    }
    fs.writeFileSync(TOKEN_FILE, token);
    console.log('Token 已保存');
    readline.close();
    doSync(token);
  });
  return;
}

const TOKEN = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
doSync(TOKEN);

// ---- 主流程 ----
async function doSync(token) {
  // 2. 检查 zip 文件
  if (!fs.existsSync(ZIP_FILE)) {
    console.log('错误：找不到「知行案例库_导出.zip」');
    console.log('请先把导出的 zip 文件放到本目录下');
    console.log('目录：' + REPO_DIR);
    process.exit(1);
  }

  // 3. 备份当前 data.js
  const dataJsPath = path.join(REPO_DIR, 'data.js');
  const backupPath = path.join(REPO_DIR, 'data.js.backup');
  if (fs.existsSync(dataJsPath)) {
    fs.copyFileSync(dataJsPath, backupPath);
  }

  // 4. 解压 zip 并复制文件
  console.log('解压 zip...');
  const AdmZip = require('adm-zip');
  let zip;
  try {
    zip = new AdmZip(ZIP_FILE);
  } catch(e) {
    // adm-zip 可能未安装，用系统命令
    console.log('使用系统命令解压...');
    const unzipDir = path.join(process.env.TEMP || '/tmp', 'zx_sync_' + Date.now());
    execSync('powershell -Command "Expand-Archive -Path \'' + ZIP_FILE + '\' -DestinationPath \'' + unzipDir + '\' -Force"', { stdio: 'inherit' });

    // 递归复制
    copyDir(unzipDir, REPO_DIR);
    // 清理临时目录
    fs.rmSync(unzipDir, { recursive: true, force: true });
  }

  if (zip) {
    // 用 adm-zip 解压
    zip.extractAllTo(REPO_DIR, true);
  }

  // 5. 删除 zip 文件（已解压）
  fs.unlinkSync(ZIP_FILE);

  // 删除空 .gitkeep 文件
  ['assets/images/.gitkeep', 'assets/videos/.gitkeep', 'assets/files/.gitkeep'].forEach(function(f) {
    const fp = path.join(REPO_DIR, f);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  });

  // 6. 恢复备份中的 .gitignore（zip 里没有）
  if (!fs.existsSync(path.join(REPO_DIR, '.gitignore'))) {
    fs.writeFileSync(path.join(REPO_DIR, '.gitignore'), 'Thumbs.db\n.DS_Store\n.github_token\n*.backup\n');
  }

  console.log('文件已同步');

  // 7. Git add + commit + push
  console.log('提交到 Git...');
  try {
    execSync('git add -A', { cwd: REPO_DIR, stdio: 'inherit' });

    const today = new Date().toISOString().slice(0, 10);
    execSync('git commit -m "案例更新 ' + today + '"', { cwd: REPO_DIR, stdio: 'inherit' });

    // 用 token 推送
    const remoteUrl = 'https://' + token + ':x-oauth-basic@github.com/super-binbin/zhixing-cases.git';
    execSync('git remote set-url origin "' + remoteUrl + '"', { cwd: REPO_DIR, stdio: 'inherit' });
    execSync('git push origin main', { cwd: REPO_DIR, stdio: 'inherit' });

    console.log('');
    console.log('========================================');
    console.log('  同步成功！网站将在 1-2 分钟后更新');
    console.log('  https://super-binbin.github.io/zhixing-cases/');
    console.log('========================================');
  } catch(e) {
    console.log('Git 操作失败：' + e.message);
    console.log('请尝试手动运行:');
    console.log('  cd "' + REPO_DIR + '"');
    console.log('  git add -A');
    console.log('  git commit -m "案例更新"');
    console.log('  git push origin main');
  }

  // 恢复 remote URL（去掉 token）
  try {
    execSync('git remote set-url origin https://github.com/super-binbin/zhixing-cases.git', { cwd: REPO_DIR, stdio: 'ignore' });
  } catch(e) {}
}

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
