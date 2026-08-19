import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectStack } from './stack.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ai-skillops-test-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('detectStack', () => {
  it('detects a Next.js TypeScript project', async () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        dependencies: { next: '14.0.0', react: '18.0.0' },
        devDependencies: { typescript: '5.0.0' },
      }),
    );
    const stack = await detectStack(dir);
    expect(stack.language).toBe('typescript');
    expect(stack.framework).toBe('next.js');
  });

  it('detects a Spring Boot project from pom.xml', async () => {
    writeFileSync(
      join(dir, 'pom.xml'),
      `
      <project>
        <parent>
          <groupId>org.springframework.boot</groupId>
          <artifactId>spring-boot-starter-parent</artifactId>
          <version>3.3.0</version>
        </parent>
      </project>
    `,
    );
    const stack = await detectStack(dir);
    expect(stack.framework).toBe('spring-boot');
    expect(stack.language).toBe('java');
  });

  it('detects claude-code agent from .claude directory', async () => {
    mkdirSync(join(dir, '.claude'), { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ dependencies: {} }));
    const stack = await detectStack(dir);
    expect(stack.agents).toContain('claude-code');
  });

  it('returns nulls for unknown project', async () => {
    const stack = await detectStack(dir);
    expect(stack.language).toBeNull();
    expect(stack.framework).toBeNull();
  });
});
