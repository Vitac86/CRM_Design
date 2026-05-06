import fs from 'fs';
import path from 'path';
import process from 'process';

const ROOT = process.cwd();
const DIRECTORIES_TO_SCAN = ['src', 'docs', 'public'];
const ROOT_FILES_TO_SCAN = [
  'index.html',
  'vite.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  'package.json',
  'README.md',
];

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git']);
const IGNORE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.woff', '.woff2', '.ico', '.zip']);
const PUBLIC_TEXT_EXTENSIONS = new Set(['.txt', '.md', '.html', '.htm', '.css', '.js', '.mjs', '.cjs', '.json', '.xml', '.svg', '.map', '.yml', '.yaml']);

const HARD_CODED_ROUTES = ['/dashboard', '/subjects', '/compliance', '/requests', '/documents', '/trading', '/brokerage', '/trust-management', '/depository', '/back-office', '/middle-office', '/agents', '/archives', '/administration'];
const EXTERNAL_RUNTIME_PATTERNS = ['http://', 'https://', 'fonts.googleapis', 'fonts.gstatic', 'googleapis', 'gstatic', 'cdn', 'unpkg', 'jsdelivr', 'cloudflare', 'firebase', 'analytics', 'gtag', 'tagmanager', 'maps', 'sentry', 'amplitude', 'mixpanel'];
const RUNTIME_NETWORK_PATTERNS = ['fetch(', 'axios', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'navigator.sendBeacon'];
const THEME_BREAKING_PATTERNS = ['bg-white', 'bg-slate-', 'bg-gray-', 'text-slate-', 'text-gray-', 'border-slate-', 'border-gray-'];

const BIDI_REGEX = /[\u202A-\u202E\u2066-\u2069\u200B\u200C\u200D\uFEFF]/u;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

const warnings = [];
const failures = [];

const pathExists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));
const isDocFile = (filePath) => filePath.startsWith('docs/');
const isSourceFile = (filePath) => filePath.startsWith('src/');

function getTsConfigFiles() {
  return fs.readdirSync(ROOT).filter((entry) => /^tsconfig.*\.json$/i.test(entry));
}

function collectFilesFromDirectory(relativeDir) {
  const result = [];
  const absoluteDir = path.join(ROOT, relativeDir);
  if (!fs.existsSync(absoluteDir)) return result;

  const stack = [absoluteDir];
  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) continue;

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) continue;

      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = path.relative(ROOT, absolutePath).replaceAll(path.sep, '/');

      if (entry.isDirectory()) {
        stack.push(absolutePath);
        continue;
      }

      const ext = path.extname(relativePath).toLowerCase();
      if (IGNORE_EXTENSIONS.has(ext)) continue;
      if (relativeDir === 'public' && !PUBLIC_TEXT_EXTENSIONS.has(ext)) continue;

      result.push(relativePath);
    }
  }

  return result;
}

function buildScanFileList() {
  const files = new Set();
  for (const dir of DIRECTORIES_TO_SCAN) collectFilesFromDirectory(dir).forEach((file) => files.add(file));
  ROOT_FILES_TO_SCAN.forEach((file) => pathExists(file) && files.add(file));
  getTsConfigFiles().forEach((file) => files.add(file));
  return Array.from(files).sort();
}

function addWarning(type, file, line, details) {
  warnings.push({ type, file, line, details });
}

function addFailure(type, file, line, details) {
  failures.push({ type, file, line, details });
}

function isAllowedRouteFile(filePath) {
  if (filePath === 'src/routes/paths.ts') return true;
  if (filePath.includes('/routes.') || filePath.endsWith('/routes.tsx') || filePath.endsWith('/routes.ts')) return true;
  if (filePath.startsWith('docs/') || filePath.startsWith('tests/') || filePath.startsWith('__tests__/')) return true;
  return false;
}

function isThemeCheckTarget(filePath) {
  return filePath.startsWith('src/pages/') || filePath.startsWith('src/components/');
}

function hasDevGuard(lines, idx) {
  const start = Math.max(0, idx - 4);
  const end = Math.min(lines.length - 1, idx + 4);
  for (let i = start; i <= end; i += 1) {
    if (lines[i].includes('import.meta.env.DEV')) return true;
  }
  return false;
}

function checkFile(filePath) {
  const absolutePath = path.join(ROOT, filePath);
  let content = '';
  try {
    content = fs.readFileSync(absolutePath, 'utf8');
  } catch (error) {
    addFailure('read-error', filePath, 0, `Cannot read file as UTF-8: ${error.message}`);
    return;
  }

  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;

    if (BIDI_REGEX.test(line)) addFailure('hidden-bidi-unicode', filePath, lineNo, 'Detected hidden/Bidi Unicode character');

    if (!isDocFile(filePath)) {
      if (line.includes('debugger')) addFailure('debugger-leftover', filePath, lineNo, 'Found debugger statement');
      if (line.includes('console.log')) addFailure('debug-console', filePath, lineNo, 'Found console.log');
      if (line.includes('console.warn')) addFailure('debug-console', filePath, lineNo, 'Found console.warn');
      if (line.includes('console.error')) {
        if (hasDevGuard(lines, idx)) addWarning('dev-console-error', filePath, lineNo, 'console.error used under import.meta.env.DEV guard');
        else addFailure('debug-console', filePath, lineNo, 'Found console.error outside explicit DEV guard');
      }
    }

    for (const pattern of EXTERNAL_RUNTIME_PATTERNS) {
      if (!line.includes(pattern)) continue;
      if (line.includes(SVG_NAMESPACE)) continue;
      if (isDocFile(filePath)) addWarning('external-url-in-docs', filePath, lineNo, `Pattern "${pattern}" found in docs`);
      else addFailure('external-runtime-url', filePath, lineNo, `Pattern "${pattern}" found`);
    }

    if (isSourceFile(filePath)) {
      for (const pattern of RUNTIME_NETWORK_PATTERNS) {
        if (line.includes(pattern)) addFailure('runtime-network-call', filePath, lineNo, `Pattern "${pattern}" found in src`);
      }
    }

    for (const route of HARD_CODED_ROUTES) {
      if (line.includes(route) && !isAllowedRouteFile(filePath)) {
        addWarning('hardcoded-route', filePath, lineNo, `Hardcoded route "${route}" found outside route catalog`);
      }
    }

    if (isThemeCheckTarget(filePath)) {
      for (const pattern of THEME_BREAKING_PATTERNS) {
        if (line.includes(pattern)) addWarning('theme-hardcode', filePath, lineNo, `Pattern "${pattern}" found`);
      }
    }
  });
}

function printIssues(label, items) {
  if (items.length === 0) return console.log(`${label}: none`);
  console.log(`${label}: ${items.length}`);
  for (const item of items) console.log(`- [${item.type}] ${item.file}:${item.line} — ${item.details}`);
}

const filesToScan = buildScanFileList();
if (filesToScan.length === 0) {
  console.log('No files found to scan.');
  process.exit(0);
}

filesToScan.forEach(checkFile);

console.log('Project health check report');
console.log(`Scanned files: ${filesToScan.length}`);
printIssues('Warnings', warnings);
printIssues('Failures', failures);

process.exit(failures.length > 0 ? 1 : 0);
