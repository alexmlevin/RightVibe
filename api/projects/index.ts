import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import { saveProject } from '../_lib/store';
import type { Project, Screen } from '../../types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, screens } = (req.body ?? {}) as { name?: unknown; screens?: unknown };

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'A project name is required.' });
  }
  if (!Array.isArray(screens)) {
    return res.status(400).json({ error: 'screens must be an array.' });
  }

  const now = Date.now();
  const project: Project = {
    id: randomUUID(),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    screens: screens as Screen[],
  };

  await saveProject(project);
  return res.status(201).json(project);
}
