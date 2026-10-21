#!/usr/bin/env node
// Reconcile and audit all repository markdown documentation outside website/, locales/, node_modules/
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const git = (...args) => spawnSync('git', args, { encoding: 'utf8' });
const top = git('rev-parse', '--show-toplevel');
if (top.status !== 0) {
  console.error('Run inside git repo.');
  process.exit(1);
}
const ROOT = resolve(top.stdout.trim());
process.chdir(ROOT);

const args = process.argv.slice(2);
const checkStale = args.includes('--check-stale');
const staleDaysIdx = args.indexOf('--stale-days');
const maxStaleDays = staleDaysIdx !== -1 && args[staleDaysIdx + 1] ? parseInt(args[staleDaysIdx + 1], 10) : 90;

const files = git('ls-files', '*.md', ':!:website/*', ':!:locales/*', ':!:node_modules/*')
  .stdout.trim().split('\n').map(s => s.trim().replace(/\\/g, '/')).filter(Boolean);

console.log(`Found ${files.length} markdown files to reconcile.`);

const today = new Date().toISOString().split('T')[0];
const todayMs = new Date(today).getTime();
const rows = [];
const linkErrors = [];
const staleDocs = [];

// Parse existing verified dates if registry exists
const existingVerifiedDates = new Map();
if (existsSync('.agent/aro-program/DOCS-REGISTRY.md')) {
  const regContent = readFileSync('.agent/aro-program/DOCS-REGISTRY.md', 'utf8');
  for (const line of regContent.split('\n')) {
    if (!line.startsWith('| `')) continue;
    const parts = line.split('|').map(s => s.trim());
    if (parts.length >= 7) {
      const p = parts[1].replace(/`/g, '');
      const v = parts[6];
      if (p && v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
        existingVerifiedDates.set(p, v);
      }
    }
  }
}

for (const file of files) {
  if (file === '.agent/aro-program/DOCS-REGISTRY.md') continue;
  
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const firstLine = lines[0] || '';
  
  // Extract title
  let title = '';
  for (const line of lines.slice(0, 10)) {
    if (line.startsWith('# ')) {
      title = line.replace(/^#\s+/, '').trim();
      break;
    }
  }
  if (!title) {
    title = file.split('/').pop().replace(/\.md$/, '');
  }
  // Sanitize title for markdown table
  title = title.replace(/\|/g, '-').replace(/`/g, '');
  if (title.length > 50) title = title.slice(0, 47) + '...';

  // Determine status & owner phase
  let status = 'ACTIVE';
  let supersededBy = '-';
  let ownerPhase = 'P10';

  if (firstLine.includes('SUPERSEDED')) {
    status = 'SUPERSEDED';
    const match = firstLine.match(/SUPERSEDED by ([^\s]+)/);
    if (match) supersededBy = match[1];
  } else if (file.startsWith('.agent/archive/') || file.startsWith('docs/archive/')) {
    status = 'ARCHIVED';
  } else if (file.startsWith('.agent/hermes-ui-port/')) {
    status = 'ARCHIVED';
    ownerPhase = 'P0-P7';
  } else if (file.startsWith('port/')) {
    status = 'ARCHIVED';
    ownerPhase = 'P0-P7';
  } else if (file.startsWith('.agent/aro-design-system/')) {
    status = 'COMPLETE (frozen)';
    ownerPhase = 'P8';
  } else if (file.startsWith('.agent/aro-ux-assembly/')) {
    status = 'COMPLETE (frozen)';
    ownerPhase = 'P9';
  } else if (file.startsWith('.agent/aro-program/phases/P10')) {
    ownerPhase = 'P10';
  } else if (file.startsWith('.agent/aro-program/phases/P11')) {
    ownerPhase = 'P11';
  } else if (file.startsWith('.agent/aro-program/phases/P12')) {
    ownerPhase = 'P12';
  } else if (file.startsWith('.agent/aro-program/phases/P13')) {
    ownerPhase = 'P13';
  } else if (file.startsWith('.agent/aro-program/phases/P14')) {
    ownerPhase = 'P14';
  } else if (file.startsWith('.agent/aro-program/phases/P15')) {
    ownerPhase = 'P15';
  } else if (file.startsWith('.agent/aro-program/phases/P16')) {
    ownerPhase = 'P16';
  } else if (file.startsWith('.agent/aro-program/phases/P17')) {
    ownerPhase = 'P17';
  } else if (file.startsWith('skills/')) {
    ownerPhase = 'P13';
  } else if (file.startsWith('docs/brand/')) {
    ownerPhase = 'P16';
  } else if (file.startsWith('docs/research/')) {
    ownerPhase = 'P10/P12';
  } else if (file.startsWith('docs/adr/')) {
    ownerPhase = 'P10';
  } else if (file.startsWith('apps/desktop/DESIGN.md')) {
    ownerPhase = 'P8/P14';
  } else if (file.startsWith('apps/desktop/LAYOUT-UX.md')) {
    ownerPhase = 'P9/P14';
  } else if (file.startsWith('apps/desktop/')) {
    ownerPhase = 'P11';
  } else if (file === 'SECURITY.md') {
    ownerPhase = 'P15';
  } else if (file === 'AGENTS.md') {
    ownerPhase = 'P10/P17';
  } else if (file === 'docs/operations.md') {
    ownerPhase = 'P17';
  }

  // Link checking for local relative links
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const rawTarget = match[2].trim();
    if (rawTarget.startsWith('http://') || rawTarget.startsWith('https://') || rawTarget.startsWith('mailto:') || rawTarget.startsWith('#') || rawTarget.startsWith('file://') || rawTarget.startsWith('conversation://')) {
      continue;
    }
    // Remove query and anchor
    const targetPath = rawTarget.split('#')[0].split('?')[0];
    if (!targetPath) continue;

    let resolvedPath;
    if (targetPath.startsWith('/')) {
      resolvedPath = join(ROOT, targetPath.slice(1));
    } else {
      resolvedPath = join(dirname(file), targetPath);
    }

    if (!existsSync(resolvedPath)) {
      linkErrors.push({ file, target: rawTarget, text: match[1] });
    }
  }

  const verifiedDate = existingVerifiedDates.get(file) || today;
  const ageDays = Math.floor((todayMs - new Date(verifiedDate).getTime()) / (1000 * 60 * 60 * 24));
  if (ageDays > maxStaleDays) {
    staleDocs.push({ file, verifiedDate, ageDays });
  }

  rows.push({
    file,
    topic: title,
    status,
    supersededBy,
    ownerPhase,
    verified: verifiedDate
  });
}

// Generate registry markdown
let registryMd = `# Docs registry (managed via .agent/aro-program/tools/reconcile-docs.mjs)

Total registered documents: ${rows.length}
Last full audit: ${today}

| Path | Topic | Status | Superseded by | Owner phase | Verified (date) |
| --- | --- | --- | --- | --- | --- |
`;

for (const r of rows) {
  registryMd += `| \`${r.file}\` | ${r.topic} | ${r.status} | ${r.supersededBy} | ${r.ownerPhase} | ${r.verified} |\n`;
}

writeFileSync('.agent/aro-program/DOCS-REGISTRY.md', registryMd, 'utf8');
console.log('DOCS-REGISTRY.md written successfully.');
console.log(`Link audit completed: ${linkErrors.length} broken links found.`);
if (linkErrors.length > 0) {
  console.log('Sample broken links (first 10):');
  for (const err of linkErrors.slice(0, 10)) {
    console.log(`  in ${err.file}: [${err.text}](${err.target})`);
  }
}

if (checkStale) {
  console.log(`\nStale docs check (threshold: >${maxStaleDays} days):`);
  if (staleDocs.length === 0) {
    console.log(`✓ All ${rows.length} documents verified within ${maxStaleDays} days.`);
  } else {
    console.log(`Found ${staleDocs.length} stale documents:`);
    for (const d of staleDocs.slice(0, 15)) {
      console.log(`  - ${d.file}: verified ${d.verifiedDate} (${d.ageDays} days ago)`);
    }
  }
}
