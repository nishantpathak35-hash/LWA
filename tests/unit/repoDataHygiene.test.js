import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

describe('repository data hygiene', () => {
  it('keeps local database and rescue dump paths ignored', () => {
    const ignoreFile = fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8');

    expect(ignoreFile).toContain('/backend/*.sqlite');
    expect(ignoreFile).toContain('/rescue_data/');
    expect(ignoreFile).toContain('/rescue_*.json');
    expect(ignoreFile).toContain('/scratch/backup*');
  });
});
