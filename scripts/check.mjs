import { readdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
async function checkDirectory(path) {
  for (const file of await readdir(path, {withFileTypes:true})) {
    const target=join(path,file.name);
    if(file.isDirectory())await checkDirectory(target);
    else if(/\.(js|mjs)$/.test(file.name)) {
      const result=spawnSync(process.execPath,['--check',target],{stdio:'inherit'});
      if(result.status!==0)process.exit(result.status||1);
    }
  }
}
for(const path of ['src','scripts','tests'])await checkDirectory(path);
for(const path of ['index.html','src/app.js','src/styles.css','assets/logo.svg','assets/workspace.svg'])await access(path);
console.log('JavaScript syntax and required frontend assets checked.');
