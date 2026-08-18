import { z } from 'zod';

export const ArtifactKindSchema = z.enum([
  'skill', 'rule', 'context', 'command', 'workflow', 'pack'
]);

export const StackProfileSchema = z.object({
  language: z.string().nullable(),
  framework: z.string().nullable(),
  runtime: z.string().nullable(),
  buildTool: z.string().nullable(),
  database: z.string().nullable(),
  agents: z.array(z.string()),
  architecture: z.string().nullable(),
});

export const LockfileEntrySchema = z.object({
  id: z.string(),
  kind: ArtifactKindSchema,
  version: z.string(),
  source: z.object({
    repository: z.string().url(),
    path: z.string(),
    commit: z.string().length(40),
  }),
  integrity: z.string().startsWith('sha256:'),
  safetyScore: z.number().min(0).max(100),
});

export const LockfileSchema = z.object({
  lockVersion: z.literal(1),
  generated: z.string().datetime(),
  project: StackProfileSchema,
  artifacts: z.array(LockfileEntrySchema),
});
