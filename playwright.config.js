import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',
  fullyParallel:false,
  workers:1,
  timeout:30000,
  use:{baseURL:'http://127.0.0.1:41873',channel:'chrome',trace:'retain-on-failure'},
  projects:[
    {name:'desktop',use:{viewport:{width:1440,height:1000}}},
    {name:'mobile',use:{viewport:{width:390,height:844}}}
  ],
  webServer:{command:'node scripts/server.mjs',env:{PORT:'41873'},url:'http://127.0.0.1:41873',reuseExistingServer:false},
});
