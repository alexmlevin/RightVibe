import { put, head, BlobNotFoundError } from '@vercel/blob';
import type { Project } from '../../types';

const projectPath = (id: string) => `projects/${id}.json`;

export async function getProjectById(id: string): Promise<Project | null> {
  try {
    const meta = await head(projectPath(id));
    const res = await fetch(meta.url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as Project;
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw error;
  }
}

export async function saveProject(project: Project): Promise<void> {
  await put(projectPath(project.id), JSON.stringify(project), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
