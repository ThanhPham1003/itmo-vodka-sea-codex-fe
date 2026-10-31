// In-memory only. Neither business records nor authentication tokens enter chat.
export function boundedHistory(turns){
  const selected=[];let budget=12000;
  for(const turn of turns.slice(-8).reverse()){
    const content=Array.from(turn.content).slice(0,2000).join('');const n=Array.from(content).length;
    if(n>budget)break;budget-=n;selected.unshift({role:turn.role,content});
  }
  return selected;
}
export class AssistantState {
  constructor(service,onChange=()=>{}){this.service=service;this.onChange=onChange;this.sessionKey=null;this.epoch=0;this.turns=[];this.pending=false;this.error='';this.context=null;this.locale='vi';this.page={name:'',tab:''};this.controllers=new Set();}
  update({key,locale,page}){
    if(key!==this.sessionKey){this.reset();this.sessionKey=key;this.context=null;}
    if(locale!==this.locale){this.epoch++;this.abort();this.context=null;this.pending=false;this.error='';}
    if(this.page.name!==(page?.name||''))this.context=null;
    this.locale=locale;this.page={name:page?.name||'',tab:page?.tab||''};
  }
  abort(){for(const c of this.controllers)c.abort();this.controllers.clear();}
  reset(){this.epoch++;this.abort();this.turns=[];this.pending=false;this.error='';this.context=null;this.onChange();}
  cancel(){this.epoch++;this.abort();this.pending=false;this.onChange();}
  async loadContext(){
    if(!this.sessionKey)return;
    const epoch=this.epoch,sequence=this.contextSequence=(this.contextSequence||0)+1,controller=new AbortController();this.controllers.add(controller);
    try{const data=await this.service.assistantContext(this.locale,this.page.name,{signal:controller.signal});if(epoch!==this.epoch||sequence!==this.contextSequence)return;this.context=data;this.error='';}
    catch(error){if(epoch===this.epoch&&sequence===this.contextSequence&&!controller.signal.aborted)this.error=error.message;}
    finally{this.controllers.delete(controller);if(epoch===this.epoch)this.onChange();}
  }
  async article(id){
    if(!/^[a-z][a-z0-9-]{0,79}$/.test(id))throw new Error('Invalid article');
    const epoch=this.epoch,controller=new AbortController();this.controllers.add(controller);
    try{const data=await this.service.assistantArticle(id,this.locale,{signal:controller.signal});return epoch===this.epoch?data:null;}
    finally{this.controllers.delete(controller);}
  }
  async send(message){
    message=message.trim();if(!this.sessionKey||this.pending||!message||Array.from(message).length>2000||!this.context?.enabled)return;
    const epoch=this.epoch,controller=new AbortController();this.controllers.add(controller);
    const body={message,locale:this.locale,page:{...this.page},history:boundedHistory(this.turns)};
    this.turns.push({role:'user',content:message});this.pending=true;this.error='';this.onChange();
    try{
      const data=await this.service.assistantChat(body,{signal:controller.signal});
      if(epoch!==this.epoch)return;
      if(!data||!Array.isArray(data.blocks)||!Array.isArray(data.sources))throw new Error('Invalid assistant response');
      this.turns.push({role:'assistant',content:data.blocks.map(b=>b.text).join('\n\n'),response:data});this.turns=this.turns.slice(-24);
    }catch(error){if(epoch===this.epoch&&!controller.signal.aborted)this.error=error.message+(error.requestId?' · Request ID: '+error.requestId:'');}
    finally{this.controllers.delete(controller);if(epoch===this.epoch){this.pending=false;this.onChange();}}
  }
}
