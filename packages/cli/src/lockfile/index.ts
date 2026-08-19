import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stringify, parse } from 'yaml';
import { LockfileSchema } from '@ai-skillops/shared';
import type { Lockfile } from '@ai-skillops/shared';

const LOCKFILE_NAME = 'ai-skillops.lock.yaml';

export async function readLockfile(cwd: string): Promise<Lockfile | null> {
  try {
    const text = await readFile(join(cwd, LOCKFILE_NAME), 'utf-8');
    return LockfileSchema.parse(parse(text));
  } catch {
    return null;
  }
}

export async function writeLockfile(cwd: string, lockfile: Lockfile): Promise<void> {
  const content = stringify(lockfile, { indent: 2 });
  await writeFile(join(cwd, LOCKFILE_NAME), content, 'utf-8');
}
