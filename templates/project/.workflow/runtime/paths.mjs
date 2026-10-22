import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

export function digest(content) {
  return createHash('sha256').update(content).digest('hex');
}

export function safePath(root, relativePath) {
  if (typeof relativePath !== 'string' || !relativePath || relativePath.startsWith('/') ||
      relativePath.split('/').some(part => !part || part === '.' || part === '..') ||
      /[\\\x00-\x1f]/.test(relativePath)) throw new Error(`Unsafe path: ${relativePath}`);
  let currentPath = resolve(root);
  try {
    if (lstatSync(currentPath).isSymbolicLink()) throw new Error(`Symlink refused: ${currentPath}`);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const part of relativePath.split('/')) {
    currentPath = join(currentPath, part);
    try {
      if (lstatSync(currentPath).isSymbolicLink()) throw new Error(`Symlink refused: ${currentPath}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return currentPath;
}

export function readTree(root, relativePath) {
  const absolutePath = safePath(root, relativePath);
  const metadata = lstatSync(absolutePath);
  if (metadata.isFile()) return [{ path: relativePath, content: readFileSync(absolutePath), mode: metadata.mode & 0o777 }];
  if (!metadata.isDirectory()) throw new Error(`Not a regular file or directory: ${absolutePath}`);
  return readdirSync(absolutePath).sort().flatMap(name => readTree(root, `${relativePath}/${name}`));
}

export function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }

export function assertKeys(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${label}`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`Unknown ${label} field: ${key}`);
}

// Lists the regular files matching `pattern`, where `*` stands for any part of a single path segment.
export function expandPattern(root, pattern) {
  safePath(root, pattern);
  const base = resolve(root);
  let matches = [''];
  for (const segment of pattern.split('/')) {
    const wildcard = new RegExp(`^${segment.split('*').map(part => part.replace(/[.+?^$|()[\]{}\\]/g, '\\$&')).join('.*')}$`);
    matches = matches.flatMap(prefix => {
      const directory = join(base, prefix);
      if (!lstatSync(directory).isDirectory()) return [];
      return readdirSync(directory).filter(name => wildcard.test(name)).sort().map(name => prefix ? `${prefix}/${name}` : name);
    });
  }
  return matches.filter(path => lstatSync(join(base, path)).isFile());
}
