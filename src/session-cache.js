const storageKey='docsense:session:v1';

// Persist only the credential and server expiry for this browser tab. Identity,
// tenant, permissions and document data are always fetched again from the API.
export function createSessionCache({storage,now=()=>Date.now()}={}) {
  const clear=()=>{try{storage?.removeItem(storageKey);}catch{/* Storage may be blocked. */}};
  const valid=record=>record?.version===1&&typeof record.accessToken==='string'&&record.accessToken.length>0&&!/\s/.test(record.accessToken)&&typeof record.expiresAt==='string'&&Number.isFinite(Date.parse(record.expiresAt))&&Date.parse(record.expiresAt)>now();
  return {
    clear,
    read() {
      try {
        const record=JSON.parse(storage?.getItem(storageKey)||'null');
        if(valid(record))return {accessToken:record.accessToken,expiresAt:record.expiresAt};
      }catch{/* Malformed or inaccessible cache is not a session. */}
      clear();return null;
    },
    write(accessToken,expiresAt) {
      const record={version:1,accessToken,expiresAt};
      clear();
      if(valid(record)){try{storage?.setItem(storageKey,JSON.stringify(record));}catch{/* Keep the in-memory session usable. */}}
    }
  };
}

export function browserSessionCache() {
  let storage;
  try{storage=globalThis.sessionStorage;}catch{/* Browser policy may block storage. */}
  return createSessionCache({storage});
}
