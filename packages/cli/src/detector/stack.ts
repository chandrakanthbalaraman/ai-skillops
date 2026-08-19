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
  if (
    (await fileExists(join(cwd, 'pyproject.toml'))) ||
    (await fileExists(join(cwd, 'requirements.txt')))
  ) {
    profile.language = 'python';
    if (await fileExists(join(cwd, 'manage.py'))) profile.framework = 'django';
  }

  return profile;
}
