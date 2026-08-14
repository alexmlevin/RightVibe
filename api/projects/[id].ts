import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, projectKey } from '../_lib/redis';
import type { Project } from '../../types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (typeof id !== 'string' || !id) {
    return res.status(400).json({ error: 'Invalid project id.' });
  }

  if (req.method === 'GET') {
    const project = await redis.get<Project>(projectKey(id));
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    return res.status(200).json(project);
  }

  if (req.method === 'PUT') {
    const existing = await redis.get<Project>(projectKey(id));
    if (!existing) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const updates = (req.body ?? {}) as Partial<Project>;
    const updated: Project = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    };

    await redis.set(projectKey(id), updated);
    return res.status(200).json(updated);
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}
