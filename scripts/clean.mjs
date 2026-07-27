import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const generatedPaths = ['dist', 'target', 'coverage'];

await Promise.all(generatedPaths.map(async (directory) => {
  await rm(resolve(process.cwd(), directory), { recursive: true, force: true });
}));

console.log(`Removed generated folders: ${generatedPaths.join(', ')}`);
