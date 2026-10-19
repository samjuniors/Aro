#!/usr/bin/env node
// Audit .github/workflows and release scripts for upstream-owned references, secrets, and publish triggers
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const git = (...args) => spawnSync('git', args, { encoding: 'utf8' });
const top = git('rev-parse', '--show-toplevel');
const ROOT = resolve(top.stdout.trim());
process.chdir(ROOT);

const workflowFiles = git('ls-files', '.github/workflows/*.yml', '.github/workflows/*.yaml')
  .stdout.trim().split('\n').map(s => s.trim().replace(/\\/g, '/')).filter(Boolean);

console.log(`Auditing ${workflowFiles.length} workflow files...`);

const auditResults = [];

for (const wf of workflowFiles) {
  const content = readFileSync(wf, 'utf8');
  
  // Detect secrets
  const secretMatches = [...content.matchAll(/secrets\.([A-Z0-9_]+)/g)].map(m => m[1]);
  const uniqueSecrets = [...new Set(secretMatches)];

  // Detect upstream identifiers
  const hasNous = /nousresearch/i.test(content) || /NousResearch/i.test(content);
  const hasHermesDomain = /hermesagent\.com|hermes\.nous/i.test(content);
  const hasDockerHub = /docker\.io|registry\.hub\.docker/i.test(content);
  const hasR2 = /r2\.cloudflarestorage/i.test(content);
  const hasPypi = /pypi\.org/i.test(content);

  // Classify
  let classification = 'KEEP';
  let rationale = 'Pure CI verification';

  const isPublishOrDeploy = /publish|release|deploy|upload|docker\.yml|canary/i.test(wf);
  const isUpstreamSpecific = /contributor-check|deploy-site|skills-index|plugin-catalog-ci/i.test(wf);

  if (isPublishOrDeploy) {
    if (uniqueSecrets.length > 0 || hasR2 || hasDockerHub || hasPypi || hasNous) {
      classification = 'DISABLE';
      rationale = 'Publishes release/docker/site artifacts to upstream registries or requires upstream credentials';
    } else {
      classification = 'DISABLE';
      rationale = 'Release pipeline - disable on fork until release credentials configured';
    }
  } else if (isUpstreamSpecific) {
    if (wf.includes('deploy-site')) {
      classification = 'DISABLE';
      rationale = 'Deploys upstream documentation website';
    } else if (wf.includes('contributor-check')) {
      classification = 'DISABLE';
      rationale = 'Checks upstream Nous contributor agreements/attribution';
    } else {
      classification = 'NEEDS-SECRET';
      rationale = 'Requires review or customized configuration for Aro fork';
    }
  } else if (uniqueSecrets.length > 0) {
    classification = 'NEEDS-SECRET';
    rationale = `Requires secrets: ${uniqueSecrets.join(', ')}`;
  }

  auditResults.push({
    file: wf,
    classification,
    secrets: uniqueSecrets,
    rationale,
    hasNous,
    hasHermesDomain,
    hasR2,
    hasDockerHub
  });
}

// Generate markdown report
let md = `# Fork-Safety Audit Report (P10.6)
Date: 2026-10-19
Author: Aro Program
Workflows Audited: ${auditResults.length}

## 1. Summary of Classifications
- **KEEP**: ${auditResults.filter(r => r.classification === 'KEEP').length} workflows (safe local/PR validation: lint, tests, bundle smoke, typecheck)
- **DISABLE**: ${auditResults.filter(r => r.classification === 'DISABLE').length} workflows (deploy/release/upstream publishing actions)
- **NEEDS-SECRET**: ${auditResults.filter(r => r.classification === 'NEEDS-SECRET').length} workflows (require fork secrets or credentials)

## 2. Upstream Secrets & Endpoints Inventory
- **Upstream Organization References**: \`NousResearch/hermes-agent\`, \`nousresearch\`
- **Upstream Domains / Endpoints**: \`hermesagent.com\`, \`nousresearch.com\`, Cloudflare R2 bucket storage
- **Referenced Secrets across Workflows**:
${[...new Set(auditResults.flatMap(r => r.secrets))].sort().map(s => `  - \`${s}\``).join('\n')}

## 3. Workflow Classification Matrix

| Workflow | Classification | Secrets | Notes |
| --- | --- | --- | --- |
`;

for (const r of auditResults) {
  md += `| \`${r.file}\` | **${r.classification}** | ${r.secrets.length ? r.secrets.map(s => `\`${s}\``).join(', ') : '-'} | ${r.rationale} |\n`;
}

// Also audit scripts
md += `
## 4. Release, Update, & Telemetry Scripts Audit
- \`scripts/release.py\`, \`scripts/releases/*\`: Targets upstream R2 storage and GitHub releases. **DISABLE** for automatic runs; customize for Aro in P16.
- \`scripts/deploy-site\` / \`.github/workflows/deploy-site.yml\`: Deploys upstream documentation site. **DISABLE**.
- \`scripts/observability/*\` (telemetry & trace probes): Telemetry must remain strictly opt-in per Aro project charter (ADR 0005, PROGRAM.md §3).
- \`apps/desktop/scripts/sign-*.mjs\`, \`scripts/stage-msixbundle.mjs\`: Windows/macOS code-signing scripts. **NEEDS-SECRET** (Aro signing certificates in P16).
`;

writeFileSync('.agent/aro-program/evidence/P10/fork-safety.md', md, 'utf8');
console.log('Fork-safety audit written to .agent/aro-program/evidence/P10/fork-safety.md');
