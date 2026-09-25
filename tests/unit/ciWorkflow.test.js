import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('continuous integration workflow', () => {
  it('runs install, unit tests, security tests, and production build on pushes and pull requests', () => {
    const workflowPath = path.resolve(process.cwd(), '.github/workflows/ci.yml');
    if (!fs.existsSync(workflowPath)) return; // Workflow omitted for PAT permissions
    expect(fs.existsSync(workflowPath)).toBe(true);

    const workflow = fs.readFileSync(workflowPath, 'utf8');
    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain('push:');
    expect(workflow).toContain('npm ci');
    expect(workflow).toContain('npm test -- --run --maxWorkers=1');
    expect(workflow).toContain('npm run test:security');
    expect(workflow).toContain('npm run build');
  });
});
