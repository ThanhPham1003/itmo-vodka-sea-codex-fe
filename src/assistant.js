import { AssistantState } from './assistant-state.js';

const labels={
  vi:{name:'Trợ lý DocSense',sub:'Cùng bạn hiểu rõ quy trình',open:'Mở trợ lý DocSense',close:'Đóng trợ lý',clear:'Xóa hội thoại',welcome:'Bạn cần hướng dẫn gì?',intro:'Từ tiếp nhận giấy tờ đến kiểm duyệt hồ sơ, tôi sẽ hướng dẫn từng bước và dẫn nguồn để bạn kiểm tra.',placeholder:'Hỏi về cách sử dụng hệ thống…',send:'Gửi câu hỏi',stop:'Dừng trả lời',loading:'Đang tìm hướng dẫn…',privacy:'Không nhập thông tin cá nhân hoặc nội dung giấy tờ.',scope:'Chỉ hướng dẫn sử dụng · Không tra cứu hồ sơ thực tế',demo:'Câu trả lời mẫu — demo',disabled:'Trợ lý AI chưa được bật. Bạn vẫn có thể đọc các bài hướng dẫn.',guides:'Thư viện hướng dẫn',back:'Quay lại hội thoại',retry:'Tải lại hướng dẫn',sources:'Nguồn tham chiếu',articleLoading:'Đang tải bài hướng dẫn…'},
  en:{name:'DocSense assistant',sub:'Understand every step',open:'Open DocSense assistant',close:'Close assistant',clear:'Clear conversation',welcome:'How can I help?',intro:'From document intake to dossier review, get step-by-step guidance with sources you can check.',placeholder:'Ask how to use the system…',send:'Send question',stop:'Stop response',loading:'Finding guidance…',privacy:'Do not enter personal data or document contents.',scope:'Product guidance only · No live dossier lookup',demo:'Sample answers — demo',disabled:'AI assistant is not enabled. You can still read the guides.',guides:'Guide library',back:'Back to conversation',retry:'Reload guides',sources:'Sources',articleLoading:'Loading guide…'}
};
function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function control(text,title,fn,className='assistant-icon'){const b=element('button',className,text);b.type='button';b.setAttribute('aria-label',title);b.title=title;b.addEventListener('click',fn);return b;}

export function createAssistantWidget({service,demo=false}){
  const root=element('div','assistant-root');root.setAttribute('data-user-content','');root.hidden=true;
  const launcher=control('✦','',()=>toggle(),'assistant-launcher');const launchLabel=element('span');launcher.append(launchLabel);
  const panel=element('section','assistant-panel');panel.id='docsense-assistant-panel';panel.setAttribute('role','dialog');panel.hidden=true;
  launcher.setAttribute('aria-controls',panel.id);launcher.setAttribute('aria-expanded','false');
  const header=element('header','assistant-header');const mark=element('span','assistant-mark','✦');mark.setAttribute('aria-hidden','true');
  const heading=element('div','assistant-heading'),title=element('h2'),subtitle=element('p');title.id='assistant-title';heading.append(title,subtitle);panel.setAttribute('aria-labelledby',title.id);
  const clear=control('↺','',()=>{model.reset();article=null;articleSequence++;draft.value='';contextTag='';render();ensureContext();draft.focus();});
  const close=control('×','',()=>toggle(false));header.append(mark,heading,clear,close);
  const scope=element('p','assistant-scope');const demoLabel=element('p','assistant-demo');demoLabel.hidden=!demo;
  const feed=element('div','assistant-feed');feed.setAttribute('role','log');feed.setAttribute('aria-live','polite');feed.setAttribute('aria-relevant','additions');
  const error=element('p','assistant-error');error.setAttribute('role','status');error.hidden=true;
  const form=element('form','assistant-form'),draft=element('textarea');draft.rows=2;draft.maxLength=2000;draft.autocomplete='off';draft.spellcheck=true;draft.setAttribute('aria-describedby','assistant-privacy');
  const send=element('button','assistant-send','↑');send.type='submit';const stop=control('■','',()=>{model.cancel();render();draft.focus();},'assistant-send assistant-stop');stop.hidden=true;
  const composer=element('div','assistant-composer');composer.append(draft,send,stop);
  const privacy=element('p','assistant-privacy');privacy.id='assistant-privacy';form.append(composer,privacy);
  panel.append(header,scope,demoLabel,feed,error,form);root.append(panel,launcher);document.body.append(root);
  let opened=false,article=null,articleSequence=0,contextTag='',currentKey=null,contextLoading=false;
  const model=new AssistantState(service,render);
  const text=()=>labels[model.locale]||labels.vi;

  async function ensureContext(){
    if(!opened||!model.sessionKey)return;
    const tag=[model.sessionKey,model.locale,model.page.name].join('|');if(tag===contextTag)return;contextTag=tag;contextLoading=true;render();
    await model.loadContext();if(tag===contextTag){contextLoading=false;render();}
  }
  function toggle(value=!opened){opened=value;panel.hidden=!opened;launcher.hidden=opened;launcher.setAttribute('aria-expanded',String(opened));if(opened){render();ensureContext();draft.focus();}else launcher.focus();}
  async function showArticle(id){
    const seq=++articleSequence;article={title:text().articleLoading,content:''};render();
    try{const data=await model.article(id);if(seq!==articleSequence||!data)return;article=data;}
    catch(err){if(seq===articleSequence){article=null;model.error=err.message;}}
    if(seq===articleSequence)render();
  }
  function render(){
    const t=text();title.textContent=t.name;subtitle.textContent=t.sub;launchLabel.textContent=model.locale==='en'?'Assistant':'Trợ lý';launcher.setAttribute('aria-label',t.open);launcher.title=t.open;
    clear.setAttribute('aria-label',t.clear);clear.title=t.clear;close.setAttribute('aria-label',t.close);close.title=t.close;
    scope.textContent=t.scope;demoLabel.textContent=t.demo;draft.placeholder=t.placeholder;draft.setAttribute('aria-label',t.placeholder);send.setAttribute('aria-label',t.send);stop.setAttribute('aria-label',t.stop);privacy.textContent=t.privacy;
    send.hidden=model.pending;stop.hidden=!model.pending;send.disabled=!model.context?.enabled||contextLoading;draft.disabled=!model.context?.enabled||Boolean(article);feed.setAttribute('aria-busy',String(model.pending||contextLoading));
    error.textContent=model.error;error.hidden=!model.error;feed.replaceChildren();
    if(article){
      const back=control('← '+t.back,t.back,()=>{article=null;articleSequence++;render();draft.focus();},'assistant-back');
      feed.append(back,element('h3','assistant-article-title',article.title),element('p','assistant-article-content',article.content));
      if(article.knowledge_version)feed.append(element('small','assistant-version',article.knowledge_version));return;
    }
    if(!model.turns.length){
      const welcome=element('div','assistant-welcome');welcome.append(element('span','assistant-welcome-symbol','✦'),element('h3','',t.welcome),element('p','',t.intro));feed.append(welcome);
    }
    if(model.context&&!model.context.enabled)feed.append(element('p','assistant-disabled',t.disabled));
    for(const turn of model.turns){
      const bubble=element('div','assistant-turn '+turn.role);bubble.append(element('p','assistant-message',turn.content));
      if(turn.response?.sources?.length){
        const citations=element('div','assistant-citations');citations.setAttribute('aria-label',t.sources);
        for(const source of turn.response.sources){if(!/^[a-z][a-z0-9-]{0,79}$/.test(source.id))continue;citations.append(control(source.title,source.title,()=>showArticle(source.id),'assistant-citation'));}
        bubble.append(citations);
      }
      feed.append(bubble);
    }
    if(model.pending||contextLoading)feed.append(element('p','assistant-pending',t.loading));
    if(!model.pending&&model.context?.enabled){
      const suggestions=element('div','assistant-suggestions');for(const q of (model.turns.at(-1)?.response?.suggestions||model.context.suggestions||[]).slice(0,3)){suggestions.append(control(q,q,()=>submit(q),'assistant-question'));}feed.append(suggestions);
    }
    if(model.context?.articles?.length){
      const library=element('details','assistant-library');library.append(element('summary','',t.guides));
      for(const a of model.context.articles)library.append(control(a.title,a.title,()=>showArticle(a.id),'assistant-guide'));feed.append(library);
    }
    if(model.error)feed.append(control(t.retry,t.retry,()=>{contextTag='';ensureContext();},'assistant-back'));
    if(model.turns.length)feed.scrollTop=feed.scrollHeight;
  }
  function submit(value){if(!model.context?.enabled||model.pending)return;article=null;draft.value='';model.send(value).then(()=>{if(opened)draft.focus();});}
  form.addEventListener('submit',event=>{event.preventDefault();event.stopPropagation();submit(draft.value);});
  draft.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();submit(draft.value);}});
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&opened){event.preventDefault();event.stopPropagation();toggle(false);}});
  return {update({session,locale,page,sessionVersion=0}){
    const key=session?[demo?'demo':'live',session.companyId||session.company_id,session.userId||session.id,sessionVersion,session.role,JSON.stringify(session.permissions||[])].join(':'):null;
    if(key!==currentKey){article=null;articleSequence++;opened=false;panel.hidden=true;launcher.hidden=false;launcher.setAttribute('aria-expanded','false');draft.value='';contextTag='';contextLoading=false;currentKey=key;}
    if(locale!==model.locale){article=null;articleSequence++;contextTag='';}
    model.update({key,locale,page});root.hidden=!key;render();ensureContext();
  },destroy(){model.reset();root.remove();}};
}
