import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import type { StackProfile } from '@ai-skillops/shared';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  try {
    const text = await readFile(path, 'utf-8');
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function readText(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf-8');
  } catch {
    return '';
  }
}

// Extract tech hints from project context documents (project-plan.md, AGENTS.md, CLAUDE.md, README.md)
async function readProjectContext(cwd: string): Promise<string> {
  const candidates = [
    'blueprint/project-plan.md',
    'blueprint/context/project-overview.md',
    'AGENTS.md',
    'CLAUDE.md',
    'README.md',
  ];
  const parts: string[] = [];
  for (const f of candidates) {
    const text = await readText(join(cwd, f));
    if (text) parts.push(text);
  }
  return parts.join('\n').toLowerCase();
}

export async function detectStack(cwd: string): Promise<StackProfile> {
  const profile: StackProfile = {
    language: null,
    framework: null,
    runtime: null,
    buildTool: null,
    database: null,
    agents: [],
    architecture: null,
  };

  // Detect agents
  if (await fileExists(join(cwd, '.claude'))) profile.agents.push('claude-code');
  if (await fileExists(join(cwd, '.cursor'))) profile.agents.push('cursor');
  if (await fileExists(join(cwd, '.github', 'copilot-instructions.md'))) profile.agents.push('copilot');

  // Node.js / TypeScript project
  const pkgJsonPath = join(cwd, 'package.json');
  if (await fileExists(pkgJsonPath)) {
    const pkg = await readJson(pkgJsonPath);
    const deps = {
      ...((pkg.dependencies as Record<string, string>) ?? {}),
      ...((pkg.devDependencies as Record<string, string>) ?? {}),
    };

    if ('typescript' in deps) profile.language = 'typescript';
    else profile.language = 'javascript';

    if ('next' in deps) profile.framework = 'next.js';
    else if ('react' in deps) profile.framework = 'react';
    else if ('@angular/core' in deps) profile.framework = 'angular';
    else if ('vue' in deps) profile.framework = 'vue';
    else if ('express' in deps) profile.framework = 'express';

    if (await fileExists(join(cwd, 'pnpm-lock.yaml'))) profile.buildTool = 'pnpm';
    else if (await fileExists(join(cwd, 'yarn.lock'))) profile.buildTool = 'yarn';
    else profile.buildTool = 'npm';
  }

  // Java / Spring Boot via pom.xml
  const pomPath = join(cwd, 'pom.xml');
  if (await fileExists(pomPath)) {
    const pom = await readText(pomPath);
    profile.language = 'java';
    if (pom.includes('spring-boot')) profile.framework = 'spring-boot';
    profile.buildTool = 'maven';
  }

  // Java / Gradle
  if (await fileExists(join(cwd, 'build.gradle'))) {
    const gradle = await readText(join(cwd, 'build.gradle'));
    if (!profile.language) profile.language = 'java';
    if (gradle.includes('spring-boot')) profile.framework = 'spring-boot';
    profile.buildTool = 'gradle';
  }

  // Python
  const reqPath = join(cwd, 'requirements.txt');
  const pyprojectPath = join(cwd, 'pyproject.toml');
  if ((await fileExists(reqPath)) || (await fileExists(pyprojectPath))) {
    profile.language = 'python';
    const req = await readText(reqPath);
    const pyproject = await readText(pyprojectPath);
    const combined = (req + pyproject).toLowerCase();
    if (combined.includes('fastapi')) profile.framework = 'fastapi';
    else if (combined.includes('flask')) profile.framework = 'flask';
    else if (await fileExists(join(cwd, 'manage.py'))) profile.framework = 'django';
  }

  // Database detection from env files and docker-compose
  const envFiles = ['.env', '.env.local', '.env.example', 'docker-compose.yml', 'docker-compose.yaml'];
  for (const f of envFiles) {
    const content = (await readText(join(cwd, f))).toLowerCase();
    if (content.includes('postgres') || content.includes('postgresql')) { profile.database = 'postgresql'; break; }
    if (content.includes('mysql')) { profile.database = 'mysql'; break; }
    if (content.includes('oracle')) { profile.database = 'oracle'; break; }
    if (content.includes('mongodb') || content.includes('mongo_uri')) { profile.database = 'mongodb'; break; }
    if (content.includes('sqlite')) { profile.database = 'sqlite'; break; }
  }

  // Fill gaps from project context documents (project-plan.md, AGENTS.md, CLAUDE.md, README.md)
  // Only fills fields that file-based detection didn't resolve
  const ctx = await readProjectContext(cwd);
  if (ctx) {
    if (!profile.language) {
      if (ctx.includes('typescript')) profile.language = 'typescript';
      else if (ctx.includes('javascript') || ctx.includes('node.js') || ctx.includes('nodejs')) profile.language = 'javascript';
      else if (ctx.includes('python') || ctx.includes('fastapi') || ctx.includes('django') || ctx.includes('flask')) profile.language = 'python';
      else if (ctx.includes('java') || ctx.includes('spring boot') || ctx.includes('spring-boot')) profile.language = 'java';
      else if (ctx.includes('kotlin')) profile.language = 'kotlin';
    }
    if (!profile.framework) {
      if (ctx.includes('next.js') || ctx.includes('nextjs') || ctx.includes('next js')) profile.framework = 'next.js';
      else if (ctx.includes('react')) profile.framework = 'react';
      else if (ctx.includes('angular')) profile.framework = 'angular';
      else if (ctx.includes('vue')) profile.framework = 'vue';
      else if (ctx.includes('spring boot') || ctx.includes('spring-boot')) profile.framework = 'spring-boot';
      else if (ctx.includes('fastapi')) profile.framework = 'fastapi';
      else if (ctx.includes('django')) profile.framework = 'django';
      else if (ctx.includes('flask')) profile.framework = 'flask';
    }
    if (!profile.database) {
      if (ctx.includes('postgresql') || ctx.includes('postgres')) profile.database = 'postgresql';
      else if (ctx.includes('mysql')) profile.database = 'mysql';
      else if (ctx.includes('oracle')) profile.database = 'oracle';
      else if (ctx.includes('mongodb') || ctx.includes('mongo')) profile.database = 'mongodb';
      else if (ctx.includes('sqlite')) profile.database = 'sqlite';
    }
    // Agents from context docs
    if (!profile.agents.includes('claude-code') && (ctx.includes('claude code') || ctx.includes('claude-code'))) profile.agents.push('claude-code');
    if (!profile.agents.includes('cursor') && ctx.includes('cursor')) profile.agents.push('cursor');
    if (!profile.agents.includes('copilot') && (ctx.includes('copilot') || ctx.includes('github copilot'))) profile.agents.push('copilot');
    if (!profile.agents.includes('codex') && ctx.includes('codex')) profile.agents.push('codex');
  }

  return profile;
}
