#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve('static-uikit');
const pagesDir = path.join(rootDir, 'pages');
const scanDirs = [path.join(rootDir, 'pages'), path.join(rootDir, 'partials'), path.join(rootDir, 'assets', 'js')];
const textExt = new Set(['.html', '.js', '.mjs', '.css', '.md']);

const forbiddenExternalPattern = /(https?:\/\/|cdn|fonts\.googleapis|fonts\.gstatic|unpkg|jsdelivr|cloudflare|analytics|gtag|tagmanager|sentry|amplitude|mixpanel)/i;
const forbiddenApiPattern = /(fetch\(|XMLHttpRequest|axios|WebSocket|EventSource|localStorage|sessionStorage|history\.pushState)/;

const errors = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function rel(file) {
  return path.relative(process.cwd(), file).replaceAll('\\', '/');
}

function addError(file, message, sample = '') {
  const suffix = sample ? ` :: ${sample}` : '';
  errors.push(`${rel(file)}: ${message}${suffix}`);
}

const pageFiles = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.html'));
const pageSet = new Set(pageFiles);

const allFiles = scanDirs.flatMap((dir) => walk(dir)).filter((file) => textExt.has(path.extname(file)));

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');

  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (forbiddenExternalPattern.test(line)) {
      addError(file, `forbidden external/CDN/analytics pattern on line ${idx + 1}`, line.trim());
    }
    if (forbiddenApiPattern.test(line)) {
      addError(file, `forbidden API pattern on line ${idx + 1}`, line.trim());
    }
  });

  if (file.endsWith('.html')) {
    const dataHrefMatches = content.matchAll(/\bdata-href="([^"]+)"/g);
    for (const m of dataHrefMatches) {
      const target = m[1];
      if (/^[a-z]+:/i.test(target) || target.startsWith('#') || target.startsWith('/')) continue;
      if (target.endsWith('.html') && !pageSet.has(path.basename(target))) {
        addError(file, `data-href target does not exist in static-uikit/pages`, target);
      }
    }

    const hrefMatches = content.matchAll(/\bhref="([^"]+)"/g);
    for (const m of hrefMatches) {
      const target = m[1];
      if (!target.endsWith('.html')) continue;
      if (/^[a-z]+:/i.test(target) || target.startsWith('/') || target.startsWith('#')) continue;
      if (!pageSet.has(path.basename(target))) {
        addError(file, `href target does not exist in static-uikit/pages`, target);
      }
    }

    const formRegex = /<form\b([^>]*)>([\s\S]*?)<\/form>/g;
    for (const formMatch of content.matchAll(formRegex)) {
      const attrs = formMatch[1];
      const formInner = formMatch[2];
      if (!/\baction=/.test(attrs)) addError(file, 'form missing action attribute');
      if (!/\bmethod=/.test(attrs)) addError(file, 'form missing method attribute');
      if (!/\bdata-form=/.test(attrs)) addError(file, 'form missing data-form attribute');
      if (!/\bdata-action=/.test(attrs)) addError(file, 'form missing data-action attribute');

      const fieldRegex = /<(input|select|textarea)\b([^>]*)>/g;
      for (const fieldMatch of formInner.matchAll(fieldRegex)) {
        const tag = fieldMatch[1];
        const fieldAttrs = fieldMatch[2];
        const type = (fieldAttrs.match(/\btype="([^"]+)"/) || [])[1] || '';
        if (['submit', 'reset', 'button'].includes(type.toLowerCase())) continue;
        if (!/\bname=/.test(fieldAttrs)) {
          addError(file, `<${tag}> inside form is missing name attribute`, fieldMatch[0]);
        }
      }
    }
  }
}

for (const page of pageFiles) {
  const file = path.join(pagesDir, page);
  const content = fs.readFileSync(file, 'utf8');
  if (!/<body[^>]*\bdata-page="[^"]+"/i.test(content)) {
    addError(file, 'missing body[data-page]');
  }
  if (!/<section[^>]*class="[^"]*crm-page[^"]*"[^>]*\bdata-page="[^"]+"/i.test(content)) {
    addError(file, 'missing section.crm-page[data-page]');
  }
}

if (errors.length) {
  console.error(`❌ static-uikit validation failed: ${errors.length} issue(s)`);
  errors.forEach((error, idx) => console.error(`${idx + 1}. ${error}`));
  process.exit(1);
}

console.log('✅ static-uikit validation passed');
