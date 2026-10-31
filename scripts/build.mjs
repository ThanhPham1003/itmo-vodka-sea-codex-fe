import { mkdir, cp } from 'node:fs/promises';
await mkdir('dist', { recursive:true });
for (const path of ['index.html','src','assets']) await cp(path, 'dist/' + path, { recursive:true });
console.log('Built static frontend in dist/. Proxy /backend/health to the Go backend when hosting.');
