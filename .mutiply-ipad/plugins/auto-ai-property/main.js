'use strict';
var obsidian = require('obsidian');

// ===================== Translations =====================
var zhCN = {
  settings: {
    llm: {title:'LLM 设置', serviceType:'服务类型', cloudProvider:'云服务提供商',
      localEndpoint:'本地端点', modelName:'模型名称', temperature:'温度',
      apiEndpoint:'API 端点', apiKey:'API 密钥', connectionTest:'连接测试',
      testConnection:'测试连接', testing:'测试中...', connectionSuccessful:'连接成功',
      connectionFailed:'连接失败', requestTimeout:'请求超时（秒）', debugMode:'调试模式'},
    fields: {title:'字段管理', fieldName:'字段名称', enabled:'启用',
      strategy:'填充策略', strategyAI:'AI 推断', strategyFixed:'固定值',
      strategyFolder:'取自文件夹名', strategyFileName:'取自文件名', strategyDate:'当前日期时间',
      description:'字段说明', options:'可选值', defaultValue:'默认值', allowCustom:'允许自定义值',
      emptyFieldsOnly:'仅填充空字段', addField:'添加字段', editField:'编辑字段', deleteField:'删除字段',
      matchMode:'匹配模式',
      matchModeConfigured:'按配置列表（所有已启用的字段）',
      matchModeExisting:'按笔记已有字段（仅填充文件中存在的字段）'},
    combos: {title:'组合管理', add:'添加组合', edit:'编辑组合', delete:'删除组合',
      name:'组合名称', namePlaceholder:'输入组合名（如：播客）',
      memberFields:'包含字段',
      noCombos:'暂无组合，点击「添加组合」创建',
      deleteConfirm:'确定删除组合「{name}」？', fill:'▶ 填充', memberCount:'{count} 个字段'},
    prompt: {title:'提示词设置', customPrompt:'自定义提示词',
      promptTip:'可用变量：{existing_properties} {empty_fields} {document_content}'},
    interface: {title:'界面设置', language:'界面语言'}
  },
  commands: {fillCurrentNote:'填充当前笔记属性', fillCurrentFolder:'填充当前文件夹属性',
    fillVault:'填充整个库属性',
    autoFillNote:'AI 智能识别填充属性', autoFillFolder:'AI 智能识别填充当前文件夹', autoFillVault:'AI 智能识别填充整个库',
    previewFields:'预览空缺属性',
    fillWithGroup:'选择字段填充...', fillFolderWithGroup:'选择字段填充当前文件夹...',
    fillVaultWithGroup:'选择字段填充整个库...',
    clearCurrentNote:'清除当前笔记属性', clearCurrentFolder:'清除当前文件夹属性', clearVault:'清除整个库属性'},
  messages: {openNote:'请先打开一个笔记', analyzing:'AI 正在分析...',
    noContent:'笔记内容为空', noEmptyFields:'没有需要填充的空字段', operationCancelled:'操作已取消',
    noMdFiles:'没有 Markdown 文件', success:'成功填充属性', failed:'填充属性失败',
    clearing:'正在清除属性...', clearNoteSuccess:'已清除当前笔记属性', noFieldsToClear:'没有可清除的字段',
    fillFolderConfirm:'确定要填充当前文件夹中 {count} 个文件的属性吗？',
    fillVaultConfirm:'确定要填充整个库中 {count} 个文件的属性吗？',
    fillInProgress:'分析 {current}/{total} 个文件...', fillSuccess:'成功填充 {success}/{total} 个文件',
    autoPreviewTitle:'AI 识别结果预览', autoNewFields:'新增字段', autoUpdateFields:'更新字段',
    autoNoChanges:'AI 未发现需要新增或更新的属性',
    autoConfirmBatch:'AI 将分析 {count} 个文件，自动判断并填充属性，是否继续？',
    autoFillProgress:'AI 分析 {current}/{total} 个文件...', autoFillSuccess:'AI 识别填充完成，更新 {success}/{total} 个文件',
    previewTitle:'需要填充的属性字段', noProperties:'未配置属性字段',
    selectGroup:'勾选要填充的字段', noGroupFields:'没有可显示的字段',
    clearFolderConfirm:'确定要清除当前文件夹中 {count} 个文件的属性吗？',
    clearSuccessMultiple:'已清除 {success}/{total} 个文件的属性'},
  modals: {cancel:'取消', save:'保存'}
};
var en = {
  settings: {
    llm: {title:'LLM Settings', serviceType:'Service Type', cloudProvider:'Cloud Provider',
      localEndpoint:'Local Endpoint', modelName:'Model Name', temperature:'Temperature',
      apiEndpoint:'API Endpoint', apiKey:'API Key', connectionTest:'Connection Test',
      testConnection:'Test Connection', testing:'Testing...', connectionSuccessful:'Connection successful',
      connectionFailed:'Connection failed', requestTimeout:'Request Timeout (s)', debugMode:'Debug Mode'},
    fields: {title:'Field Management', fieldName:'Field Name', enabled:'Enabled',
      strategy:'Strategy', strategyAI:'AI Inference', strategyFixed:'Fixed Value',
      strategyFolder:'From Folder Name', strategyFileName:'From File Name', strategyDate:'Current Date/Time',
      description:'Description', options:'Options', defaultValue:'Default Value', allowCustom:'Allow Custom',
      emptyFieldsOnly:'Fill empty fields only', addField:'Add Field', editField:'Edit Field', deleteField:'Delete Field',
      matchMode:'Match Mode',
      matchModeConfigured:'From configured list (all enabled fields)',
      matchModeExisting:'From existing note fields (only fields that exist in the file)'},
    combos: {title:'Combo Management', add:'Add Combo', edit:'Edit Combo', delete:'Delete Combo',
      name:'Combo Name', namePlaceholder:'Enter combo name (e.g., Podcast)',
      memberFields:'Member Fields',
      noCombos:'No combos yet. Click "Add Combo" to create one.',
      deleteConfirm:'Delete combo "{name}"?', fill:'▶ Fill', memberCount:'{count} fields'},
    prompt: {title:'Prompt Settings', customPrompt:'Custom Prompt',
      promptTip:'Variables: {existing_properties} {empty_fields} {document_content}'},
    interface: {title:'Interface', language:'Language'}
  },
  commands: {fillCurrentNote:'Fill properties for current note', fillCurrentFolder:'Fill properties for current folder',
    fillVault:'Fill properties for vault',
    autoFillNote:'AI Auto-Detect & Fill', autoFillFolder:'AI Auto-Detect Fill Folder', autoFillVault:'AI Auto-Detect Fill Vault',
    previewFields:'Preview empty fields',
    fillWithGroup:'Select fields to fill...', fillFolderWithGroup:'Select fields to fill folder...',
    fillVaultWithGroup:'Select fields to fill vault...',
    clearCurrentNote:'Clear current note properties', clearCurrentFolder:'Clear current folder properties',
    clearVault:'Clear vault properties'},
  messages: {openNote:'Please open a note first', analyzing:'AI analyzing...',
    noContent:'Note content is empty', noEmptyFields:'No empty fields to fill', operationCancelled:'Operation cancelled',
    noMdFiles:'No Markdown files found', success:'Properties filled successfully', failed:'Failed to fill properties',
    clearing:'Clearing properties...', clearNoteSuccess:'Current note properties cleared', noFieldsToClear:'No fields to clear',
    fillFolderConfirm:'Fill properties for {count} files in current folder?',
    fillVaultConfirm:'Fill properties for {count} files in vault?',
    fillInProgress:'Analyzing {current}/{total} files...', fillSuccess:'Successfully filled {success}/{total} files',
    autoPreviewTitle:'AI Detection Preview', autoNewFields:'New Fields', autoUpdateFields:'Fields to Update',
    autoNoChanges:'AI found no new or updated properties to add',
    autoConfirmBatch:'AI will analyze {count} files and auto-detect properties. Continue?',
    autoFillProgress:'AI analyzing {current}/{total} files...', autoFillSuccess:'AI auto-fill complete, updated {success}/{total} files',
    previewTitle:'Fields to fill', noProperties:'No property fields configured',
    selectGroup:'Check fields to fill', noGroupFields:'No fields available',
    clearFolderConfirm:'Clear properties from {count} files in current folder?',
    clearSuccessMultiple:'Cleared {success}/{total} files'},
  modals: {cancel:'Cancel', save:'Save'}
};
var translations = {'zh-cn':zhCN,'en':en};
function T(lang){return translations[lang]||translations['en']||zhCN;}

var CLOUD_ENDPOINTS = {
  openai:'https://api.openai.com/v1/chat/completions', deepseek:'https://api.deepseek.com/v1/chat/completions',
  gemini:'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  aliyun:'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', claude:'https://api.anthropic.com/v1/messages',
  groq:'https://api.groq.com/openai/v1/chat/completions', openrouter:'https://openrouter.ai/api/v1/chat/completions',
  glm:'https://open.bigmodel.cn/api/paas/v4/chat/completions', mistral:'https://api.mistral.ai/v1/chat/completions',
  minimax:'https://api.minimax.io/v1/chat/completions', mimo:'https://api.xiaomimimo.com/v1/chat/completions',
  'openai-compatible':'http://your-api-endpoint/v1/chat/completions'
};
var DEFAULT_MODELS = {
  openai:'gpt-4o', deepseek:'deepseek-chat', gemini:'gemini-2.0-flash', aliyun:'qwen-max',
  claude:'claude-sonnet-4-5-20250929', groq:'llama-3.3-70b-versatile', openrouter:'openai/gpt-4o',
  glm:'glm-4-flash', mistral:'mistral-large-latest', minimax:'MiniMax-M2.1', mimo:'MiMo-V2-Flash',
  'openai-compatible':'your-model'
};

var DEFAULT = {
  serviceType:'cloud', localEndpoint:'http://localhost:11434/v1/chat/completions', localModel:'mistral',
  cloudEndpoint:'https://api.deepseek.com/v1/chat/completions', cloudApiKey:'', cloudModel:'deepseek-chat',
  cloudServiceType:'deepseek', llmTemperatureOverride:0.3, requestTimeout:60, debugMode:false,
  language:'zh-cn', interfaceLanguage:'zh-cn', matchMode:'existing', emptyFieldsOnly:true,
  customPrompt:'请根据以下笔记内容，分析并填写这些空缺的 Frontmatter 属性字段。\n\n### 当前已有属性（请勿修改）\n{existing_properties}\n\n### 需要填充的空缺字段\n{empty_fields}\n\n### 笔记内容:\n{document_content}\n\n请只返回需要填充的字段对应的 YAML 键值对，不要修改已有属性，不要额外解释。确保值准确基于笔记内容。',
  excludedFolders:[],
  propertyFields:[
    {name:'章节',enabled:true,strategy:'ai',description:'笔记所属章节',options:[],allowCustom:true},
    {name:'困难程度',enabled:true,strategy:'ai',description:'难易程度',options:['简单','中等','困难'],allowCustom:false},
    {name:'科目类别',enabled:true,strategy:'folder',description:'取文件所在文件夹名',options:[],allowCustom:true},
    {name:'主要程度',enabled:true,strategy:'ai',description:'重要程度',options:['核心','次要','了解'],allowCustom:false},
    {name:'分值',enabled:true,strategy:'ai',description:'价值评分',options:[],allowCustom:true},
    {name:'复习次数',enabled:true,strategy:'fixed',description:'复习次数',options:[],allowCustom:true,defaultValue:''},
    {name:'创建时间',enabled:true,strategy:'date',description:'当前日期时间',options:[],allowCustom:true},
    {name:'结束日期',enabled:true,strategy:'date',description:'当前日期',options:[],allowCustom:true},
    {name:'文件分类',enabled:true,strategy:'folder',description:'取文件所在文件夹名',options:[],allowCustom:true}
  ],
  combos:[{name:'播客组合',fields:['播客','收藏标签','季号','文件分类','结束日期']},{name:'分类组合',fields:['文件分类','科目类别']}]
};

// ===================== Utils =====================
var U = {
  parseFM: function(c){
    var m=c.match(/^---\n([\s\S]*?)\n---/);if(!m)return null;
    var y=m[1],r={},ls=y.split('\n'),ck=null,li=[];
    for(var i=0;i<ls.length;i++){var l=ls[i];if(!l.trim()||l.trim().startsWith('#'))continue;
      var am=l.match(/^(\s*)-\s+(.+)/);if(am&&ck){li.push(am[2].trim());continue;}
      if(li.length>0&&ck){r[ck]=li;li=[];}
      var km=l.match(/^(\s*)([\w\u4e00-\u9fff-]+)\s*:\s*(.*)/);
      if(km){ck=km[2].trim();var v=km[3].trim();r[ck]=(v===''||v==='""'||v==="''")?null:v;}
    }
    if(li.length>0&&ck)r[ck]=li;return r;
  },
  getFMKeys: function(fm){return fm?Object.keys(fm):[];},
  getFields: function(fm,defs,mode,filter){
    var r=[],ef=defs.filter(function(f){return f.enabled;});
    if(filter&&filter.length>0)ef=ef.filter(function(f){return filter.indexOf(f.name)>=0;});
    if(mode==='existing'){var nk=this.getFMKeys(fm);for(var i=0;i<ef.length;i++){if(nk.indexOf(ef[i].name)>=0)r.push(ef[i]);}}
    else r=ef;
    return r;
  },
  getEmpty: function(fm,fields){
    var r=[];
    for(var i=0;i<fields.length;i++){var d=fields[i],v=fm?fm[d.name]:undefined;if(v===null||v===undefined||v===''||v==='""'||v==="''"||v==='N/A')r.push(d);}
    return r;
  },
  getExisting: function(fm){
    var r={};if(!fm)return r;for(var k in fm){var v=fm[k];if(v!==null&&v!==undefined&&v!==''&&v!=='""'&&v!=="''")r[k]=v;}return r;
  },
  buildEmptyDesc: function(f){
    if(f.length===0)return '无';
    return f.map(function(fi){var d='- '+fi.name;if(fi.options&&fi.options.length>0)d+=' (可选值: '+fi.options.join(', ')+')';if(fi.description)d+=' - '+fi.description;return d;}).join('\n');
  },
  buildExistingDesc: function(e){
    var k=Object.keys(e);if(k.length===0)return '无';
    return k.map(function(kk){var v=e[kk];return Array.isArray(v)?kk+': ['+v.join(',')+']':kk+': '+v;}).join('\n');
  },
  getFMRange: function(c){
    var m=c.match(/^---\n([\s\S]*?)\n---/);return m?{s:m.index,e:m.index+m[0].length,yt:m[1]}:null;
  },
  updateFM: function(c,nf,eoo){
    var rg=this.getFMRange(c);
    if(!rg){
      var keys=Object.keys(nf);
      if(keys.length===0)return c;
      var lines=['---'];
      for(var k in nf){lines.push(k+': '+nf[k]);}
      lines.push('---');
      return lines.join('\n')+'\n'+c.trimStart();
    }
    var ls=rg.yt.split('\n'),li={},ee={};
    for(var i=0;i<ls.length;i++){var l=ls[i],m=l.match(/^(\s*)([\w\u4e00-\u9fff:-]+)(\s*:\s*)(.*)/);if(m){var k=m[2].trim(),v=m[4].trim();li[k]=i;ee[k]=(v===''||v==='""'||v==="''"||v==='N/A');}}
    var ch={},ak=[];
    for(var k2 in nf){var nv=String(nf[k2]);if(li[k2]!==undefined){if(eoo&&!ee[k2])continue;ch[k2]=nv;}else{ak.push(k2);ch[k2]=nv;}}
    if(Object.keys(ch).length===0)return c;
    var rl=ls.slice();
    for(var k3 in ch){if(li[k3]!==undefined){var idx=li[k3],m2=ls[idx].match(/^(\s*)([\w\u4e00-\u9fff:-]+)(\s*:\s*)(.*)/);rl[idx]=m2?m2[1]+m2[2]+': '+ch[k3]:k3+': '+ch[k3];}}
    for(var a=0;a<ak.length;a++){rl.push(ak[a]+': '+ch[ak[a]]);}
    return '---\n'+rl.join('\n')+'\n---\n'+c.substring(rg.e).trimStart();
  },
  parseAI: function(t){
    var r={};t=t.replace(/```(?:yaml)?\n?/g,'').trim();var ls=t.split('\n');
    for(var i=0;i<ls.length;i++){var l=ls[i].trim();if(!l||l.startsWith('#')||l.startsWith('- '))continue;var m=l.match(/^([\w\u4e00-\u9fff:-]+)\s*:\s*(.*)/);if(m){var k=m[1].trim(),v=m[2].trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);r[k]=v;}}
    return r;
  },
  clearFM: function(c,names){
    if(!names||names.length===0)return c;
    var rg=this.getFMRange(c);if(!rg)return c;var ls=rg.yt.split('\n'),lo={};
    for(var n=0;n<names.length;n++){lo[names[n].toLowerCase()]=true;}
    var rl=[],cnt=0;
    for(var i=0;i<ls.length;i++){var l=ls[i],m=l.match(/^(\s*)([\w\u4e00-\u9fff-]+)\s*:.*/);if(m){var k=m[2].trim().toLowerCase();if(lo[k]){rl.push(m[1]+m[2]+': ');cnt++;continue;}}rl.push(l);}
    if(cnt===0)return c;return '---\n'+rl.join('\n')+'\n---\n'+c.substring(rg.e).trimStart();
  },
  folderName: function(f){return f&&f.path?(f.path.split('/').length>=2?f.path.split('/')[f.path.split('/').length-2]:''):'';},
  nowISO: function(){var n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0')+'T'+String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')+':00.000Z';}
};

// ===================== LLM =====================
var LLM = {
  call: async function(s,sys,usr){
    var isL=s.serviceType==='local',ep,ak,md;
    if(isL){ep=s.localEndpoint;ak='';md=s.localModel;}else{ep=s.cloudEndpoint;ak=s.cloudApiKey;md=s.cloudModel;}
    if(!ep)throw new Error('No endpoint');
    if(!isL&&!ak)throw new Error('No API key');
    var t=(s.llmTemperatureOverride==null||s.llmTemperatureOverride===undefined)?0.3:s.llmTemperatureOverride;
    var h={'Content-Type':'application/json'};
    if(!isL&&ak){if(s.cloudServiceType==='claude'){h['x-api-key']=ak;h['anthropic-version']='2023-06-01';}else{h['Authorization']='Bearer '+ak;}}
    var b=(s.cloudServiceType==='claude')
      ?JSON.stringify({model:md,max_tokens:4096,temperature:t,system:sys,messages:[{role:'user',content:usr}]})
      :JSON.stringify({model:md,messages:[{role:'system',content:sys},{role:'user',content:usr}],temperature:t,max_tokens:4096});
    var ctrl=new AbortController(),to=setTimeout(function(){ctrl.abort();},(s.requestTimeout||60)*1000);
    try{
      if(s.debugMode)console.log('[AAP] Req:',{ep,md,b});
      var r=await fetch(ep,{method:'POST',headers:h,body:b,signal:ctrl.signal});
      if(!r.ok){var e=await r.text();throw new Error('HTTP '+r.status+': '+e);}
      var d=await r.json(),ct='';
      if(d.choices&&d.choices.length>0)ct=d.choices[0].message.content;
      else if(d.content&&d.content.length>0)ct=d.content[0].text;
      if(s.debugMode)console.log('[AAP] Res:',ct);
      return ct;
    }finally{clearTimeout(to);}
  },
  test: async function(s){
    try{var r=await this.call(s,'You are a helpful assistant.','Reply with "OK" only.');return{ok:true,msg:'连接成功'};}
    catch(e){return{ok:false,msg:'连接失败: '+(e.message||'')};}
  }
};

// ===================== Analyzer =====================
var Analyzer = {
  _buildPrompt: function(s,ef,ex,ct){
    var tpl=s.customPrompt||DEFAULT.customPrompt;
    return tpl.replace('{existing_properties}',U.buildExistingDesc(ex)).replace('{empty_fields}',U.buildEmptyDesc(ef)).replace('{document_content}',ct);
  },
  _processDirect: function(fields,file){
    var rf={},af=[];
    for(var i=0;i<fields.length;i++){var f=fields[i];
      switch(f.strategy){
        case'fixed':if(f.defaultValue&&f.defaultValue!=='')rf[f.name]=f.defaultValue;break;
        case'folder':var fn=U.folderName(file);if(fn)rf[f.name]=fn;break;
        case'filename':var fn2=file.basename||file.name.replace(/\.[^/.]+$/,'');if(fn2)rf[f.name]=fn2;break;
        case'date':rf[f.name]=U.nowISO();break;
        default:af.push(f);
      }
    }
    return{rf:rf,af:af};
  },
  _callAI: async function(s,af,ex,ct){
    var rf={};if(af.length===0)return rf;
    try{
      var r=await LLM.call(s,'你是一个 Obsidian 笔记属性分析助手。请严格按照 YAML 格式输出。',this._buildPrompt(s,af,ex,ct));
      var p=U.parseAI(r);
      for(var j=0;j<af.length;j++){var a=af[j],v=p[a.name];if(v&&v!==''&&v!==null){
        if(a.options&&a.options.length>0&&!a.allowCustom){var n=v.trim(),ok=false;for(var k=0;k<a.options.length;k++){if(n===a.options[k]){ok=true;break;}}rf[a.name]=ok?n:(a.options[0]!==''?a.options[0]:n);}
        else rf[a.name]=v.trim();
      }}
    }catch(e){console.error('[AAP] AI call error:', e.message||e);}
    return rf;
  },
  analyze: async function(s,file,ct,fFilter){
    var fm=U.parseFM(ct);
    var cf=U.getFields(fm,s.propertyFields,s.matchMode,fFilter);
    if(cf.length===0)return{ok:true,msg:'没有需要处理的字段',fields:{},skip:true};
    var ef=U.getEmpty(fm,cf);
    if(ef.length===0)return{ok:true,msg:'没有需要填充的空字段',fields:{},skip:true};
    var ex=U.getExisting(fm);
    var p=this._processDirect(ef,file);
    var ai=await this._callAI(s,p.af,ex,ct);
    for(var k in ai)p.rf[k]=ai[k];
    return{ok:true,msg:'属性分析完成',fields:p.rf};
  },
  updateFile: async function(app,file,nf,eoo){
    if(Object.keys(nf).length===0)return{ok:true,msg:'无更新',mod:false};
    var c=await app.vault.read(file),nc=U.updateFM(c,nf,eoo);
    if(nc!==c){await app.vault.modify(file,nc);return{ok:true,msg:'已更新 '+Object.keys(nf).length+' 个字段',mod:true};}
    return{ok:true,msg:'内容未变化',mod:false};
  },
  fill: async function(app,s,file,fFilter){
    try{
      var c=await app.vault.read(file);
      if(!c.trim())return{ok:false,msg:'笔记内容为空'};
      var a=await this.analyze(s,file,c,fFilter);
      if(a.skip)return{ok:true,msg:a.msg,skipN:true};
      if(!a.ok)return a;
      return await this.updateFile(app,file,a.fields,s.emptyFieldsOnly);
    }catch(e){return{ok:false,msg:'处理失败: '+(e.message||'')};}
  },
  analyzeAuto: async function(s,ct){
    var sys='你只输出 key: value 对，每行一个。不要解释，不要代码块。值不能是 null 或空。';
    var usr='分析文本，输出属性字段（key: value，每行一个）：\n\n'+ct;
    var r=await LLM.call(s,sys,usr);
    if(!r||!r.trim())throw new Error('AI 返回了空内容');
    new obsidian.Notice('🤖 AI 返回: '+(r.length>200?r.substring(0,200)+'...':r),12000);
    console.log('[AAP] analyzeAuto raw response:', r);
    var p=U.parseAI(r);
    // 过滤 null 和空值
    var fp={};
    for(var k in p){
      var v=p[k].trim().toLowerCase();
      if(v&&v!=='null'&&v!=='""'&&v!=="''"&&v!=='none'&&v!=='无'&&v!=='n/a')fp[k]=p[k].trim();
    }
    var pk=Object.keys(fp);
    if(pk.length===0){
      new obsidian.Notice('⚠️ 全部值无效（null/空），AI 返回: '+(r.length>100?r.substring(0,100)+'...':r),12000);
    }else{
      new obsidian.Notice('✅ 解析到 '+pk.length+' 个有效字段: '+pk.join(', '),8000);
    }
    console.log('[AAP] analyzeAuto filtered fields:', fp);
    return fp;
  }
};

// ===================== FillConfigModal =====================
var FillConfigModal = (function(){
  return function(app,p,onFill){obsidian.Modal.call(this,app);this.p=p;this.onFill=onFill;this.sel={};};
})();
FillConfigModal.prototype=Object.create(obsidian.Modal.prototype);
FillConfigModal.prototype.constructor=FillConfigModal;
FillConfigModal.prototype.onOpen=function(){
  var el=this.contentEl,p=this.p,t=T(p.settings.interfaceLanguage);el.empty();el.style.minWidth='350px';
  el.createEl('h3',{text:t.messages.selectGroup});
  var all=p.settings.propertyFields,ef2=all.filter(function(f){return f.enabled;});
  if(ef2.length===0){el.createEl('p',{text:t.messages.noGroupFields});var cb=el.createEl('button',{text:'关闭',cls:'mod-cta'});cb.style.marginTop='16px';cb.addEventListener('click',this.close.bind(this));return;}
  var combos=p.settings.combos||[];
  if(combos.length>0){
    el.createEl('h4',{text:'组合快捷选择'});
    for(var ci=0;ci<combos.length;ci++){(function(sel,combo){
      var row=el.createDiv({cls:'fill-config-row'});
      var cb2=row.createEl('input',{type:'checkbox',attr:{id:'cc-'+combo.name}});
      cb2.addEventListener('change',function(){
        var ok=cb2.checked;
        for(var fi=0;fi<ef2.length;fi++){var fn=ef2[fi].name;if(combo.fields.indexOf(fn)>=0){var fc=el.querySelector('#cf-'+fn);if(fc){fc.checked=ok;}sel[fn]=ok;}}
      });
      row.createEl('label',{text:' '+combo.name+' ('+combo.fields.length+' 字段)'}).setAttribute('for','cc-'+combo.name);
    })(this.sel,combos[ci]);}
    el.createEl('hr');
  }
  el.createEl('h4',{text:t.settings.fields.fieldName});
  var self=this;
  for(var fi2=0;fi2<ef2.length;fi2++){(function(sel,field){
    var row=el.createDiv({cls:'fill-config-row'});
    var cb3=row.createEl('input',{type:'checkbox',attr:{id:'cf-'+field.name}});
    cb3.checked=true;sel[field.name]=true;
    cb3.addEventListener('change',function(){sel[field.name]=cb3.checked;});
    var lt=field.name;if(field.strategy==='folder')lt+=' [文件夹]';else if(field.strategy==='filename')lt+=' [文件名]';else if(field.strategy==='date')lt+=' [日期]';else if(field.strategy==='fixed')lt+=' [固定值]';else lt+=' [AI]';
    var fc2=[];for(var ci3=0;ci3<combos.length;ci3++){if(combos[ci3].fields.indexOf(field.name)>=0)fc2.push(combos[ci3].name);}
    if(fc2.length>0)lt+=' ('+fc2.join(', ')+')';
    row.createEl('label',{text:' '+lt}).setAttribute('for','cf-'+field.name);
  })(this.sel,ef2[fi2]);}
  var bc=el.createDiv({cls:'fill-config-buttons'});bc.style.display='flex';bc.style.justifyContent='flex-end';bc.style.gap='8px';bc.style.marginTop='16px';
  bc.createEl('button',{text:'取消'}).addEventListener('click',function(){self.close();});
  bc.createEl('button',{text:'确认填充',cls:'mod-cta'}).addEventListener('click',function(){
    var names=[];for(var n in self.sel){if(self.sel[n])names.push(n);}
    if(names.length===0){new obsidian.Notice('请至少选择一个字段');return;}self.onFill(names);self.close();
  });
};
FillConfigModal.prototype.onClose=function(){this.contentEl.empty();};

// ===================== AutoFillPreviewModal =====================
var AutoFillPreviewModal = (function(){
  return function(app,p,file,aiFields,existing,onConfirm){
    obsidian.Modal.call(this,app);this.p=p;this.file=file;this.onConfirm=onConfirm;
    this.addFields={};this.updateFields={};
    for(var k in aiFields){
      if(existing[k]!==undefined){
        if(String(existing[k])!==String(aiFields[k]))this.updateFields[k]={oldVal:existing[k],newVal:aiFields[k]};
      }else{this.addFields[k]=aiFields[k];}
    }
  };
})();
AutoFillPreviewModal.prototype=Object.create(obsidian.Modal.prototype);
AutoFillPreviewModal.prototype.constructor=AutoFillPreviewModal;
AutoFillPreviewModal.prototype.onOpen=function(){
  var el=this.contentEl,p=this.p,t=T(p.settings.interfaceLanguage);el.empty();el.style.minWidth='400px';
  el.createEl('h3',{text:t.messages.autoPreviewTitle});
  var has=Object.keys(this.addFields).length>0||Object.keys(this.updateFields).length>0;
  if(!has){el.createEl('p',{text:t.messages.autoNoChanges});el.createEl('button',{text:'关闭',cls:'mod-cta',attr:{style:'margin-top:16px'}}).addEventListener('click',this.close.bind(this));return;}
  var ak=Object.keys(this.addFields);
  if(ak.length>0){var h4=el.createEl('h4',{cls:'property-field-name-row'});h4.createSpan({text:t.messages.autoNewFields+' ('+ak.length+')'});var ul=el.createEl('ul');for(var i=0;i<ak.length;i++)ul.createEl('li',{text:ak[i]+': '+this.addFields[ak[i]]});}
  var uk=Object.keys(this.updateFields);
  if(uk.length>0){var h42=el.createEl('h4',{cls:'property-field-name-row'});h42.createSpan({text:t.messages.autoUpdateFields+' ('+uk.length+')'});var ul2=el.createEl('ul');for(var i=0;i<uk.length;i++){var f=this.updateFields[uk[i]];ul2.createEl('li',{text:uk[i]+': '+f.oldVal+' → '+f.newVal});}}
  var bc=el.createDiv({cls:'fill-config-buttons'});bc.style.display='flex';bc.style.justifyContent='flex-end';bc.style.gap='8px';bc.style.marginTop='16px';
  var self=this;
  bc.createEl('button',{text:t.modals.cancel}).addEventListener('click',function(){self.close();});
  bc.createEl('button',{text:'确认填充',cls:'mod-cta'}).addEventListener('click',function(){self.onConfirm(self.addFields,self.updateFields);self.close();});
};
AutoFillPreviewModal.prototype.onClose=function(){this.contentEl.empty();};

// ===================== ComboEditModal =====================
var ComboEditModal = (function(){
  return function(app,p,combo,onSave){obsidian.Modal.call(this,app);this.p=p;this.c=combo||{name:'',fields:[]};this.onSave=onSave;this.isNew=!combo;};
})();
ComboEditModal.prototype=Object.create(obsidian.Modal.prototype);
ComboEditModal.prototype.constructor=ComboEditModal;
ComboEditModal.prototype.onOpen=function(){
  var el=this.contentEl,p=this.p,t=T(p.settings.interfaceLanguage),c=this.c;el.empty();el.style.minWidth='350px';
  el.createEl('h3',{text:this.isNew?t.settings.combos.add:t.settings.combos.edit});
  var ni=new obsidian.TextComponent(el.createDiv());ni.setPlaceholder(t.settings.combos.namePlaceholder).setValue(c.name||'');ni.inputEl.style.width='100%';ni.inputEl.style.marginBottom='16px';ni.onChange(function(v){c.name=v;});
  el.createEl('h4',{text:t.settings.combos.memberFields});
  var af=p.settings.propertyFields;
  if(af.length===0)el.createEl('p',{text:t.messages.noProperties});
  for(var i=0;i<af.length;i++){(function(field){
    var row=el.createDiv({cls:'fill-config-row'});
    var cb=row.createEl('input',{type:'checkbox',attr:{id:'ce-'+field.name}});
    if(c.fields.indexOf(field.name)>=0)cb.checked=true;
    cb.addEventListener('change',function(){if(cb.checked){if(c.fields.indexOf(field.name)<0)c.fields.push(field.name);}else{var idx=c.fields.indexOf(field.name);if(idx>=0)c.fields.splice(idx,1);}});
    row.createEl('label',{text:' '+field.name}).setAttribute('for','ce-'+field.name);
  })(af[i]);}
  var bc=el.createDiv({cls:'fill-config-buttons'});bc.style.display='flex';bc.style.justifyContent='flex-end';bc.style.gap='8px';bc.style.marginTop='16px';
  var self=this;
  bc.createEl('button',{text:t.modals.cancel}).addEventListener('click',function(){self.close();});
  bc.createEl('button',{text:t.modals.save,cls:'mod-cta'}).addEventListener('click',function(){if(!c.name.trim()){new obsidian.Notice('组合名称不能为空');return;}self.onSave({name:c.name.trim(),fields:c.fields});self.close();});
};
ComboEditModal.prototype.onClose=function(){this.contentEl.empty();};

// ===================== PreviewModal =====================
var PreviewModal=(function(){return function(app,p,ef){obsidian.Modal.call(this,app);this.p=p;this.ef=ef;};})();
PreviewModal.prototype=Object.create(obsidian.Modal.prototype);
PreviewModal.prototype.constructor=PreviewModal;
PreviewModal.prototype.onOpen=function(){var el=this.contentEl,t=T(this.p.settings.interfaceLanguage);el.empty();el.createEl('h3',{text:t.messages.previewTitle+' ('+this.ef.length+')'});if(this.ef.length===0){el.createEl('p',{text:t.messages.noEmptyFields});return;}var l=el.createEl('ul');for(var i=0;i<this.ef.length;i++){l.createEl('li',{text:this.ef[i].name+(this.ef[i].description?' - '+this.ef[i].description:'')});}var b=el.createEl('button',{text:'关闭',cls:'mod-cta'});b.style.marginTop='16px';b.addEventListener('click',this.close.bind(this));};
PreviewModal.prototype.onClose=function(){this.contentEl.empty();};

// ===================== FieldEditModal =====================
var FieldEditModal=(function(){return function(app,p,field,onSave){obsidian.Modal.call(this,app);this.p=p;this.f=field||{name:'',enabled:true,strategy:'ai',description:'',options:[],allowCustom:true,defaultValue:''};this.onSave=onSave;this.isNew=!field;};})();
FieldEditModal.prototype=Object.create(obsidian.Modal.prototype);
FieldEditModal.prototype.constructor=FieldEditModal;
FieldEditModal.prototype.onOpen=function(){var el=this.contentEl,p=this.p,t=T(p.settings.interfaceLanguage),f=this.f;el.empty();el.addClass('property-field-modal');el.createEl('h2',{text:this.isNew?t.settings.fields.addField:t.settings.fields.editField});
  var ni=new obsidian.TextComponent(el.createDiv());ni.setPlaceholder(t.settings.fields.fieldName).setValue(f.name||'');ni.inputEl.style.width='100%';ni.inputEl.style.marginBottom='10px';ni.onChange(function(v){f.name=v;});
  new obsidian.Setting(el).setName(t.settings.fields.strategy).addDropdown(function(d){d.addOption('ai',t.settings.fields.strategyAI).addOption('fixed',t.settings.fields.strategyFixed).addOption('folder',t.settings.fields.strategyFolder).addOption('filename',t.settings.fields.strategyFileName).addOption('date',t.settings.fields.strategyDate).setValue(f.strategy||'ai').onChange(function(v){f.strategy=v;});});
  new obsidian.Setting(el).setName(t.settings.fields.description).addText(function(t2){t2.setValue(f.description||'').onChange(function(v){f.description=v;});});
  new obsidian.Setting(el).setName(t.settings.fields.options).addTextArea(function(ta){ta.setValue((f.options||[]).join(', ')).onChange(function(v){f.options=v.split(',').map(function(s){return s.trim();}).filter(Boolean);});ta.inputEl.rows=2;});
  new obsidian.Setting(el).setName(t.settings.fields.allowCustom).addToggle(function(to){to.setValue(f.allowCustom!==false).onChange(function(v){f.allowCustom=v;});});
  new obsidian.Setting(el).setName(t.settings.fields.defaultValue).addText(function(t2){t2.setValue(f.defaultValue||'').onChange(function(v){f.defaultValue=v;});});
  var bc=el.createDiv({cls:'property-field-modal-buttons'});bc.style.display='flex';bc.style.justifyContent='flex-end';bc.style.gap='8px';bc.style.marginTop='16px';
  var self=this;
  bc.createEl('button',{text:t.modals.cancel}).addEventListener('click',function(){self.close();});
  bc.createEl('button',{text:t.modals.save,cls:'mod-cta'}).addEventListener('click',function(){if(!f.name.trim()){new obsidian.Notice('字段名称不能为空');return;}self.onSave(f);self.close();});
};
FieldEditModal.prototype.onClose=function(){this.contentEl.empty();};

// ===================== SettingsTab =====================
var AISettingTab = (function(){
  return function(app,p){obsidian.PluginSettingTab.call(this,app,p);this.p=p;};
})();
AISettingTab.prototype=Object.create(obsidian.PluginSettingTab.prototype);
AISettingTab.prototype.constructor=AISettingTab;
AISettingTab.prototype.display=function(){
  var el=this.containerEl;el.empty();var p=this.p,s=p.settings,t=T(s.interfaceLanguage);

  // LLM
  el.createEl('h1',{text:t.settings.llm.title});
  new obsidian.Setting(el).setName(t.settings.llm.serviceType).addDropdown(function(d){d.addOption('local','本地 LLM').addOption('cloud','云服务').setValue(s.serviceType).onChange(async function(v){s.serviceType=v;await p.saveSettings();p.settingTab.display();});});
  if(s.serviceType==='cloud'){
    new obsidian.Setting(el).setName(t.settings.llm.cloudProvider).addDropdown(function(d){var ps=['openai','deepseek','gemini','aliyun','claude','groq','openrouter','glm','mistral','minimax','mimo','openai-compatible'];for(var i=0;i<ps.length;i++)d.addOption(ps[i],ps[i]);d.setValue(s.cloudServiceType).onChange(async function(v){s.cloudServiceType=v;s.cloudEndpoint=CLOUD_ENDPOINTS[v]||'';s.cloudModel=DEFAULT_MODELS[v]||'';await p.saveSettings();p.settingTab.display();});});
    new obsidian.Setting(el).setName(t.settings.llm.apiEndpoint).addText(function(t2){t2.setValue(s.cloudEndpoint).onChange(async function(v){s.cloudEndpoint=v;await p.saveSettings();});});
    new obsidian.Setting(el).setName(t.settings.llm.apiKey).addText(function(t2){t2.setValue(s.cloudApiKey).onChange(async function(v){s.cloudApiKey=v;await p.saveSettings();});t2.inputEl.type='password';});
  }else{
    new obsidian.Setting(el).setName(t.settings.llm.localEndpoint).addText(function(t2){t2.setValue(s.localEndpoint).onChange(async function(v){s.localEndpoint=v;await p.saveSettings();});});
  }
  new obsidian.Setting(el).setName(t.settings.llm.modelName).addText(function(t2){t2.setValue(s.serviceType==='local'?s.localModel:s.cloudModel).onChange(async function(v){if(s.serviceType==='local')s.localModel=v;else s.cloudModel=v;await p.saveSettings();});});
  new obsidian.Setting(el).setName(t.settings.llm.temperature).addSlider(function(sl){sl.setLimits(0,2,0.1).setValue(s.llmTemperatureOverride||0.3).setDynamicTooltip().onChange(async function(v){s.llmTemperatureOverride=v;await p.saveSettings();});});
  new obsidian.Setting(el).setName(t.settings.llm.requestTimeout).addSlider(function(sl){sl.setLimits(15,300,15).setValue(s.requestTimeout).setDynamicTooltip().onChange(async function(v){s.requestTimeout=v;await p.saveSettings();});});
  new obsidian.Setting(el).setName(t.settings.llm.connectionTest).addButton(function(b){b.setButtonText('测试连接').onClick(async function(){b.setButtonText('测试中...').setDisabled(true);var r=await LLM.test(s);new obsidian.Notice(r.ok?'连接成功':r.msg);b.setButtonText('测试连接').setDisabled(false);});});
  new obsidian.Setting(el).setName(t.settings.llm.debugMode).addToggle(function(to){to.setValue(s.debugMode).onChange(async function(v){s.debugMode=v;await p.saveSettings();});});

  // Fields
  el.createEl('h1',{text:t.settings.fields.title});
  new obsidian.Setting(el).setName(t.settings.fields.matchMode).addDropdown(function(d){d.addOption('configured',t.settings.fields.matchModeConfigured).addOption('existing',t.settings.fields.matchModeExisting).setValue(s.matchMode||'existing').onChange(async function(v){s.matchMode=v;await p.saveSettings();});});
  new obsidian.Setting(el).setName(t.settings.fields.emptyFieldsOnly).addToggle(function(to){to.setValue(s.emptyFieldsOnly).onChange(async function(v){s.emptyFieldsOnly=v;await p.saveSettings();});});
  var fc=el.createDiv({cls:'property-fields-list'});
  this._renderFields(fc,p);
  new obsidian.Setting(el).addButton(function(b){b.setButtonText(t.settings.fields.addField).setCta().onClick(function(){p.openFieldEdit(null);});});

  // Combos
  el.createEl('h1',{text:t.settings.combos.title});
  var cc=el.createDiv({cls:'combo-list'});
  this._renderCombos(cc,p);
  new obsidian.Setting(el).addButton(function(b){b.setButtonText(t.settings.combos.add).setCta().onClick(function(){p.openComboEdit(null);});});

  // Prompt
  el.createEl('h1',{text:t.settings.prompt.title});
  var tip=el.createEl('p',{text:t.settings.prompt.promptTip,cls:'setting-item-description'});tip.style.color='var(--text-muted)';tip.style.fontSize='var(--font-smaller)';
  new obsidian.Setting(el).setName(t.settings.prompt.customPrompt).addTextArea(function(ta){ta.setValue(s.customPrompt).onChange(async function(v){s.customPrompt=v;await p.saveSettings();});ta.inputEl.rows=6;ta.inputEl.cols=50;});

  // Interface
  el.createEl('h1',{text:t.settings.interface.title});
  new obsidian.Setting(el).setName(t.settings.interface.language).addDropdown(function(d){d.addOption('zh-cn','中文（简体）').addOption('en','English').setValue(s.interfaceLanguage).onChange(async function(v){s.interfaceLanguage=v;await p.saveSettings();new obsidian.Notice('语言已更改，重启后生效');});});
};
AISettingTab.prototype._renderFields=function(container,p){
  container.empty();var t=T(p.settings.interfaceLanguage),fs=p.settings.propertyFields;
  if(fs.length===0){container.createEl('p',{text:t.messages.noProperties,cls:'setting-item-description'});return;}
  for(var i=0;i<fs.length;i++){(function(field,idx){
    var item=container.createDiv({cls:'property-field-item'});
    var info=item.createDiv({cls:'property-field-info'});
    var nr=info.createDiv({cls:'property-field-name-row'});
    var ns=nr.createSpan({text:field.name,cls:'property-field-name'});
    if(!field.enabled){ns.style.textDecoration='line-through';ns.style.opacity='0.6';}
    var bt='';if(field.strategy==='fixed')bt=t.settings.fields.strategyFixed;else if(field.strategy==='folder')bt=t.settings.fields.strategyFolder;else if(field.strategy==='filename')bt=t.settings.fields.strategyFileName;else if(field.strategy==='date')bt=t.settings.fields.strategyDate;else bt=t.settings.fields.strategyAI;
    nr.createSpan({text:bt,cls:'property-field-badge'});
    if(field.description)info.createDiv({text:field.description,cls:'property-field-desc'});
    var acts=item.createDiv({cls:'property-field-actions'});
    var tb=acts.createEl('button',{text:field.enabled?'✓':'✗',cls:'property-field-btn'+(field.enabled?' active':'')});tb.addEventListener('click',async function(){field.enabled=!field.enabled;await p.saveSettings();p.settingTab._renderFields(container,p);});
    var eb=acts.createEl('button',{text:'✎',cls:'property-field-btn'});eb.addEventListener('click',function(){p.openFieldEdit(field);});
    var db=acts.createEl('button',{text:'🗑',cls:'property-field-btn delete'});db.addEventListener('click',async function(){if(await p.confirm('确定删除字段「'+field.name+'」？')){p.settings.propertyFields.splice(idx,1);await p.saveSettings();p.settingTab._renderFields(container,p);}});
  })(fs[i],i);}
};
AISettingTab.prototype._renderCombos=function(container,p){
  container.empty();var t=T(p.settings.interfaceLanguage),cs=p.settings.combos||[];
  if(cs.length===0){container.createEl('p',{text:t.settings.combos.noCombos,cls:'setting-item-description'});return;}
  for(var i=0;i<cs.length;i++){(function(combo,idx){
    var item=container.createDiv({cls:'combo-item'});
    var info=item.createDiv({cls:'combo-item-info'});
    info.createSpan({text:'■ '+combo.name,cls:'combo-item-name'});
    info.createSpan({text:t.settings.combos.memberCount.replace('{count}',String(combo.fields.length)),cls:'combo-item-count'});
    if(combo.fields.length>0){var mm=info.createDiv({cls:'combo-members'});mm.textContent=combo.fields.join(', ');}
    var acts=item.createDiv({cls:'property-field-actions'});
    var fb=acts.createEl('button',{text:t.settings.combos.fill,cls:'mod-cta combo-fill-btn'});fb.addEventListener('click',function(){var av=p.app.workspace.getActiveViewOfType(obsidian.MarkdownView);if(!av||!av.file){new obsidian.Notice(t.messages.openNote);return;}p.fillNote(av.file,combo.fields);});
    var eb=acts.createEl('button',{text:'✎',cls:'property-field-btn'});eb.addEventListener('click',function(){p.openComboEdit(combo);});
    var db=acts.createEl('button',{text:'🗑',cls:'property-field-btn delete'});db.addEventListener('click',async function(){if(await p.confirm(t.settings.combos.deleteConfirm.replace('{name}',combo.name))){p.settings.combos.splice(idx,1);await p.saveSettings();p.settingTab._renderCombos(container,p);}});
  })(cs[i],i);}
};

// ===================== ConfirmModal (proper prototype chain) =====================
var ConfirmModal = (function(){
  return function(app,msg,onConfirm){
    obsidian.Modal.call(this,app);
    this.msg=msg;
    this.onConfirm=onConfirm;
  };
})();
ConfirmModal.prototype=Object.create(obsidian.Modal.prototype);
ConfirmModal.prototype.constructor=ConfirmModal;
ConfirmModal.prototype.onOpen=function(){
  var el=this.contentEl;
  el.createEl('h3',{text:'确认'});
  el.createEl('p',{text:this.msg});
  var bc=el.createDiv();
  bc.style.display='flex';bc.style.justifyContent='flex-end';bc.style.gap='8px';bc.style.marginTop='16px';
  var self=this;
  bc.createEl('button',{text:'取消'}).addEventListener('click',function(){self.close();});
  bc.createEl('button',{text:'确认',cls:'mod-cta'}).addEventListener('click',function(){if(self.onConfirm)self.onConfirm(true);self.close();});
};
ConfirmModal.prototype.onClose=function(){this.contentEl.empty();};

// ===================== Main Plugin =====================
var PluginClass;
PluginClass = (function() {
  var Cls = function(app,manifest){
    obsidian.Plugin.call(this,app,manifest);
    this.settings=JSON.parse(JSON.stringify(DEFAULT));
    this.settingTab=null;
  };
  Cls.prototype=Object.create(obsidian.Plugin.prototype);
  Cls.prototype.constructor=Cls;

  Cls.prototype.onload=function(){
    var self=this;
    this.loadData().then(function(data){
      self.settings=Object.assign({},DEFAULT,data||{});
      if(!self.settings.propertyFields||self.settings.propertyFields.length===0)
        self.settings.propertyFields=JSON.parse(JSON.stringify(DEFAULT.propertyFields));
      else for(var i=0;i<self.settings.propertyFields.length;i++){
        var f=self.settings.propertyFields[i];
        if(f.name)f.name=f.name.replace(/:+$/,'').trim();
        delete f.group; delete f.groups;
      }
      if(!self.settings.combos)self.settings.combos=JSON.parse(JSON.stringify(DEFAULT.combos));
      if(!self.settings.customPrompt)self.settings.customPrompt=DEFAULT.customPrompt;
      if(!self.settings.matchMode)self.settings.matchMode='existing';

      self.settingTab=new AISettingTab(self.app,self);
      self.addSettingTab(self.settingTab);
      self._cmds();
      self._menu();
      self.addRibbonIcon('wand','填充当前笔记属性',function(){var af=self.app.workspace.getActiveFile();if(af)self.fillNote(af);else new obsidian.Notice(T(self.settings.interfaceLanguage).messages.openNote);});
      self.addRibbonIcon('sparkles','AI 智能识别填充属性',function(){var af=self.app.workspace.getActiveFile();if(af)self.fillNoteAuto(af);else new obsidian.Notice(T(self.settings.interfaceLanguage).messages.openNote);});
      self.addRibbonIcon('layers','选择字段填充...',function(){var af=self.app.workspace.getActiveFile();if(!af)return;new FillConfigModal(self.app,self,function(fn){self.fillNote(af,fn);}).open();});
    });
  };
  Cls.prototype.onunload=function(){};

  Cls.prototype._t=function(){return T(this.settings.interfaceLanguage);};
  Cls.prototype._cmds=function(){
    var self=this;
    this.addCommand({id:'fill-note',name:'填充当前笔记属性',icon:'wand',editorCallback:function(ed,ctx){var v=ctx instanceof obsidian.MarkdownView?ctx:null;if(!v||!v.file){new obsidian.Notice(self._t().messages.openNote);return;}self.fillNote(v.file);}});
    this.addCommand({id:'fill-folder',name:'填充当前文件夹属性',icon:'folder',callback:function(){self._fillFolder(null);}});
    this.addCommand({id:'fill-vault',name:'填充整个库属性',icon:'building-2',callback:function(){self._fillVault(null);}});
    this.addCommand({id:'fill-note-auto',name:'AI 智能识别填充属性',icon:'sparkles',editorCallback:function(ed,ctx){var v=ctx instanceof obsidian.MarkdownView?ctx:null;if(!v||!v.file){new obsidian.Notice(self._t().messages.openNote);return;}self.fillNoteAuto(v.file);}});
    this.addCommand({id:'fill-folder-auto',name:'AI 智能识别填充当前文件夹',icon:'sparkles',callback:function(){var af=self.app.workspace.getActiveFile();if(!af)return;var pf=af.parent;if(!pf)return;var f2=self._getFiles(pf);if(f2.length===0){new obsidian.Notice(self._t().messages.noMdFiles);return;}self._fillAutoMul(f2,self._t().messages.autoConfirmBatch.replace('{count}',String(f2.length)));}});
    this.addCommand({id:'fill-vault-auto',name:'AI 智能识别填充整个库',icon:'sparkles',callback:function(){var f2=self.app.vault.getMarkdownFiles();if(f2.length===0)return;self._fillAutoMul(f2,self._t().messages.autoConfirmBatch.replace('{count}',String(f2.length)));}});
    this.addCommand({id:'preview',name:'预览空缺属性',icon:'eye',editorCallback:function(ed,ctx){var v=ctx instanceof obsidian.MarkdownView?ctx:null;if(!v||!v.file){new obsidian.Notice(self._t().messages.openNote);return;}self.previewEmpty(v.file);}});
    this.addCommand({id:'fill-select',name:'选择字段填充...',icon:'layers',editorCallback:function(ed,ctx){var v=ctx instanceof obsidian.MarkdownView?ctx:null;if(!v||!v.file){new obsidian.Notice(self._t().messages.openNote);return;}new FillConfigModal(self.app,self,function(fn){self.fillNote(v.file,fn);}).open();}});
    this.addCommand({id:'fill-folder-select',name:'选择字段填充当前文件夹...',icon:'folder-tree',callback:function(){self._cfgFolder();}});
    this.addCommand({id:'fill-vault-select',name:'选择字段填充整个库...',icon:'layers',callback:function(){self._cfgVault();}});
    this.addCommand({id:'clear-note',name:'清除当前笔记属性',icon:'eraser',editorCallback:function(ed,ctx){var v=ctx instanceof obsidian.MarkdownView?ctx:null;if(!v||!v.file){new obsidian.Notice(self._t().messages.openNote);return;}self.clearNote(v.file);}});
    this.addCommand({id:'clear-folder',name:'清除当前文件夹属性',icon:'eraser',callback:function(){var af=self.app.workspace.getActiveFile();if(!af)return;var pf=af.parent;if(!pf)return;var f2=self._getFiles(pf);if(f2.length===0)return;self._clearMul(f2,'确定要清除当前文件夹中 '+f2.length+' 个文件的属性吗？');}});
    this.addCommand({id:'clear-vault-cmd',name:'清除整个库属性',icon:'eraser',callback:function(){var f3=self.app.vault.getMarkdownFiles();self._clearMul(f3,'确定要清除整个库中 '+f3.length+' 个文件的属性吗？');}});
  };
  Cls.prototype._menu=function(){
    var self=this;
    this.registerEvent(this.app.workspace.on('file-menu',function(menu,file,source,files){
      // Folder context menu
      if (file instanceof obsidian.TFolder) {
        var folderFiles = self._getFiles(file);
        if (folderFiles.length > 0) {
          menu.addItem(function(item){item.setTitle('AI 填充该文件夹属性').setIcon('wand').onClick(function(){self._cfgFolderWith(file);});});
          menu.addItem(function(item){item.setTitle('AI 智能识别填充该文件夹属性').setIcon('sparkles').onClick(function(){var ff=self._getFiles(file);var msg=self._t().messages.autoConfirmBatch.replace('{count}',String(ff.length));self._fillAutoMul(ff,msg);});});
          menu.addSeparator();
          menu.addItem(function(item){item.setTitle('清除该文件夹属性').setIcon('eraser').onClick(function(){self._clearMul(folderFiles,'确定要清除该文件夹中 '+folderFiles.length+' 个文件的属性吗？');});});
        }
        return;
      }
      // Multiple files selected
      if(files&&files.length>0){var mf=files.filter(function(f){return f.extension==='md';});if(mf.length>0){menu.addItem(function(item){item.setTitle('AI 填充属性 ('+mf.length+' 个文件)').setIcon('wand').onClick(function(){self._fillMul(mf,'确定要为选中的 '+mf.length+' 个文件填充属性吗？');});});menu.addItem(function(item){item.setTitle('选择字段填充...').setIcon('layers').onClick(function(){self._cfgFiles(mf);});});menu.addItem(function(item){item.setTitle('AI 智能识别填充 ('+mf.length+' 个文件)').setIcon('sparkles').onClick(function(){self._fillAutoMul(mf,null);});});}return;}
      // Single file
      if(file.extension==='md'){menu.addItem(function(item){item.setTitle('AI 填充属性').setIcon('wand').onClick(function(){self.fillNote(file);});});menu.addItem(function(item){item.setTitle('选择字段填充...').setIcon('layers').onClick(function(){new FillConfigModal(self.app,self,function(fn){self.fillNote(file,fn);}).open();});});menu.addItem(function(item){item.setTitle('AI 智能识别填充属性').setIcon('sparkles').onClick(function(){self.fillNoteAuto(file);});});}
    }));
  };
  Cls.prototype._getFiles=function(folder){var r=[];for(var i=0;i<folder.children.length;i++){var c=folder.children[i];if(c instanceof obsidian.TFile&&c.extension==='md')r.push(c);else if(c instanceof obsidian.TFolder)r=r.concat(this._getFiles(c));}return r;};
  Cls.prototype._excluded=function(file){var ex=this.settings.excludedFolders||[];if(ex.length===0)return false;for(var i=0;i<ex.length;i++){if(file.path.startsWith(ex[i])||file.path.includes(ex[i]))return true;}return false;};
  Cls.prototype._clean=function(files){var self=this;return files.filter(function(f){return !self._excluded(f);});};

  Cls.prototype.confirm=function(msg){
    var self=this, done=false;
    return new Promise(function(resolve){
      var modal=new ConfirmModal(self.app,msg,function(){done=true;resolve(true);});
      modal.onClose=function(){if(!done){done=true;resolve(false);}};
      modal.open();
    });
  };

  Cls.prototype.fillNote=async function(file,fFilter){
    if(!file||this._excluded(file))return;
    var t=this._t();new obsidian.Notice(t.messages.analyzing);
    var res=await Analyzer.fill(this.app,this.settings,file,fFilter);
    if(res.ok&&!res.skipN)new obsidian.Notice(res.msg||t.messages.success);else if(!res.ok)new obsidian.Notice(res.msg||t.messages.failed);
    var v=this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);if(v&&v.getMode()==='source')v.editor.refresh();this.app.workspace.trigger('layout-change');
  };
  Cls.prototype._fillMul=async function(files,confirmMsg,fFilter){
    var self=this;files=this._clean(files);if(files.length===0){new obsidian.Notice('没有可处理的文件');return;}
    if(confirmMsg&&!(await this.confirm(confirmMsg)))return;
    var t=this._t(),total=files.length,success=0,last=Date.now();
    new obsidian.Notice('开始填充 '+total+' 个文件...');
    var sn=new obsidian.Notice(t.messages.fillInProgress.replace('{current}','0').replace('{total}',String(total)),0);
    var hasAI=false;for(var fi=0;fi<self.settings.propertyFields.length;fi++){var pf=self.settings.propertyFields[fi];if(pf.enabled&&pf.strategy==='ai'){hasAI=true;break;}}
    for(var i=0;i<total;i++){
      var r=null;try{r=await Analyzer.fill(self.app,self.settings,files[i],fFilter);if(r.ok&&r.mod)success++;}catch(e){if(self.settings.debugMode)console.error('[Fill]',files[i].path,e);}
      if(Date.now()-last>2000||i===total-1){sn.setMessage(t.messages.fillInProgress.replace('{current}',String(i+1)).replace('{total}',String(total)));last=Date.now();}
      if(hasAI)await new Promise(function(res){setTimeout(res,300);});
    }
    sn.hide();new obsidian.Notice(t.messages.fillSuccess.replace('{success}',String(success)).replace('{total}',String(total)));self.app.workspace.trigger('layout-change');
  };
  Cls.prototype._fillFolder=function(fFilter){var self=this,af=self.app.workspace.getActiveFile();if(!af)return;var pf=af.parent;if(!pf)return;var f2=self._getFiles(pf);if(f2.length===0){new obsidian.Notice(self._t().messages.noMdFiles);return;}self._fillMul(f2,self._t().messages.fillFolderConfirm.replace('{count}',String(f2.length)),fFilter);};
  Cls.prototype._fillVault=function(fFilter){var self=this,f2=self.app.vault.getMarkdownFiles();if(f2.length===0)return;self._fillMul(f2,self._t().messages.fillVaultConfirm.replace('{count}',String(f2.length)),fFilter);};
  Cls.prototype._cfgFolder=function(){var self=this,af=self.app.workspace.getActiveFile();if(!af)return;var pf=af.parent;if(!pf)return;var f2=self._getFiles(pf);if(f2.length===0){new obsidian.Notice(self._t().messages.noMdFiles);return;}new FillConfigModal(self.app,self,function(fn){self._fillMul(f2,self._t().messages.fillFolderConfirm.replace('{count}',String(f2.length)),fn);}).open();};
  Cls.prototype._cfgVault=function(){var self=this,f2=self.app.vault.getMarkdownFiles();if(f2.length===0)return;new FillConfigModal(self.app,self,function(fn){self._fillMul(f2,self._t().messages.fillVaultConfirm.replace('{count}',String(f2.length)),fn);}).open();};
  Cls.prototype._cfgFolderWith=function(folder){var self=this,f2=self._getFiles(folder);if(f2.length===0){new obsidian.Notice(self._t().messages.noMdFiles);return;}new FillConfigModal(self.app,self,function(fn){self._fillMul(f2,null,fn);}).open();};
  Cls.prototype._cfgFiles=function(files){var self=this;new FillConfigModal(self.app,self,function(fn){self._fillMul(files,null,fn);}).open();};

  Cls.prototype.fillNoteAuto=async function(file){
    if(!file||this._excluded(file))return;
    var t=this._t();new obsidian.Notice(t.messages.analyzing);
    try{
      var c=await this.app.vault.read(file);
      if(!c.trim()){new obsidian.Notice(t.messages.noContent);return;}
      var fm=U.parseFM(c),existing=U.getExisting(fm);
      var rg=U.getFMRange(c),body=rg?c.substring(rg.e).trimStart():c.trim();
      if(!body&&fm){body='';for(var k in fm)body+=k+': '+fm[k]+'\n';new obsidian.Notice('📄 正文为空，用已有属性作为分析内容',5000);}
      if(!body){new obsidian.Notice(t.messages.noContent);return;}
      new obsidian.Notice('🔍 AI 分析内容长度: '+body.length+' 字符',5000);
      var aiFields=await Analyzer.analyzeAuto(this.settings,body);
      var aiCount=Object.keys(aiFields).length;
      if(aiCount===0){new obsidian.Notice(t.messages.autoNoChanges);return;}
      new obsidian.Notice('✅ AI 识别到 '+aiCount+' 个字段',5000);
      var self=this;
      if(self.settings.debugMode)console.log('[AAP] fillNoteAuto detected fields:', aiFields, 'existing:', existing);
      new AutoFillPreviewModal(this.app,this,file,aiFields,existing,function(addF,updF){
        var addCount=Object.keys(addF).length,updCount=Object.keys(updF).length;
        new obsidian.Notice('确认添加: 新增 '+addCount+' 个, 更新 '+updCount+' 个',5000);
        if(self.settings.debugMode)console.log('[AAP] fillNoteAuto confirm add:', addF, 'update:', updF);
        var allFields={};
        for(var k in addF)allFields[k]=addF[k];
        for(var k in updF)allFields[k]=updF[k].newVal;
        if(Object.keys(allFields).length===0)return;
        (async function(){
          try{
            var res=await Analyzer.updateFile(self.app,file,allFields,false);
            if(self.settings.debugMode)console.log('[AAP] fillNoteAuto updateFile result:', res);
            if(res.mod)new obsidian.Notice('✅ '+'已更新 '+Object.keys(allFields).length+' 个字段');
            else new obsidian.Notice('⚠️ 文件内容未变化: '+res.msg,5000);
            self._addAutoFields(allFields);
            var v=self.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
            if(v&&v.getMode()==='source')v.editor.refresh();
            self.app.workspace.trigger('layout-change');
          }catch(e){
            console.error('[AAP] fillNoteAuto write error:', e);
            new obsidian.Notice('❌ 写入失败: '+(e.message||e));
          }
        })();
      }).open();
    }catch(e){console.error('[AAP] fillNoteAuto error:',e);new obsidian.Notice('AI 识别失败: '+(e.message||''));}
  };
  Cls.prototype._fillAutoMul=async function(files,confirmMsg){
    var self=this;files=this._clean(files);if(files.length===0){new obsidian.Notice('没有可处理的文件');return;}
    if(confirmMsg&&!(await this.confirm(confirmMsg)))return;
    var t=this._t(),total=files.length,success=0,last=Date.now();
    new obsidian.Notice('开始 AI 识别填充 '+total+' 个文件...');
    var sn=new obsidian.Notice(t.messages.autoFillProgress.replace('{current}','0').replace('{total}',String(total)),0);
    var allNewFields={};
    for(var i=0;i<total;i++){
      try{
        var c=await self.app.vault.read(files[i]);
        if(c.trim()){
          var rg=U.getFMRange(c),body=rg?c.substring(rg.e).trimStart():c.trim();
          if(!body){var fm2=U.parseFM(c);if(fm2){body='';for(var k in fm2)body+=k+': '+fm2[k]+'\n';}}
          if(body){
            var ai=await Analyzer.analyzeAuto(self.settings,body);
            if(Object.keys(ai).length>0){
              var r=await Analyzer.updateFile(self.app,files[i],ai,false);
              if(r.mod)success++;
              for(var k in ai)allNewFields[k]=true;
            }
          }
        }
      }catch(e){if(self.settings.debugMode)console.error('[AutoFill]',files[i].path,e);}
      if(Date.now()-last>2000||i===total-1){sn.setMessage(t.messages.autoFillProgress.replace('{current}',String(i+1)).replace('{total}',String(total)));last=Date.now();}
      await new Promise(function(res){setTimeout(res,300);});
    }
    sn.hide();
    self._addAutoFields(allNewFields);
    new obsidian.Notice(t.messages.autoFillSuccess.replace('{success}',String(success)).replace('{total}',String(total)));
    self.app.workspace.trigger('layout-change');
  };
  Cls.prototype._addAutoFields=function(fields){
    var fs=this.settings.propertyFields,changed=false;
    for(var k in fields){
      var exist=false;
      for(var i=0;i<fs.length;i++){if(fs[i].name.toLowerCase()===k.toLowerCase()){exist=true;break;}}
      if(!exist){fs.push({name:k,enabled:true,strategy:'ai',description:'',options:[],allowCustom:true});changed=true;}
    }
    if(changed)this.saveSettings();
  };

  Cls.prototype.clearNote=async function(file){
    if(!file)return;var t=this._t(),names=[];for(var i=0;i<this.settings.propertyFields.length;i++){if(this.settings.propertyFields[i].enabled)names.push(this.settings.propertyFields[i].name);}
    if(names.length===0){new obsidian.Notice(t.messages.noFieldsToClear);return;}
    var c=await this.app.vault.read(file),nc=U.clearFM(c,names);
    if(nc!==c){await this.app.vault.modify(file,nc);this.app.metadataCache.trigger('changed',file);await new Promise(function(r){setTimeout(r,200);});new obsidian.Notice(t.messages.clearNoteSuccess);}else new obsidian.Notice(t.messages.noFieldsToClear);
    var v=this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);if(v&&v.getMode()==='source')v.editor.refresh();this.app.workspace.trigger('layout-change');
  };
  Cls.prototype._clearMul=async function(files,confirmMsg){
    var self=this;files=this._clean(files);if(files.length===0||!await this.confirm(confirmMsg))return;
    var t=this._t(),names=[];for(var i=0;i<this.settings.propertyFields.length;i++){if(this.settings.propertyFields[i].enabled)names.push(this.settings.propertyFields[i].name);}
    if(names.length===0){new obsidian.Notice(t.messages.noFieldsToClear);return;}
    var total=files.length,success=0,last=Date.now(),sn=new obsidian.Notice(t.messages.clearing+' 0/'+total,0);
    for(var i=0;i<total;i++){try{var c=await self.app.vault.read(files[i]),nc=U.clearFM(c,names);if(nc!==c){await self.app.vault.modify(files[i],nc);success++;}}catch(e){}
      if(Date.now()-last>2000||i===total-1){sn.setMessage(t.messages.clearing+' '+String(i+1)+'/'+String(total));last=Date.now();}}
    sn.hide();new obsidian.Notice(t.messages.clearSuccessMultiple.replace('{success}',String(success)).replace('{total}',String(total)));self.app.workspace.trigger('layout-change');
  };
  Cls.prototype.previewEmpty=function(file){var self=this;this.app.vault.read(file).then(function(c){var t=self._t(),fm=U.parseFM(c),cf=U.getFields(fm,self.settings.propertyFields,self.settings.matchMode),ef=U.getEmpty(fm,cf);if(ef.length===0){new obsidian.Notice(t.messages.noEmptyFields);return;}new PreviewModal(self.app,self,ef).open();});};
  Cls.prototype.openFieldEdit=function(field){var self=this;new FieldEditModal(self.app,self,field,function(sf){if(field){var idx=self.settings.propertyFields.indexOf(field);if(idx>=0)self.settings.propertyFields[idx]=sf;}else self.settings.propertyFields.push(sf);self.saveSettings();}).open();};
  Cls.prototype.openComboEdit=function(combo){var self=this;new ComboEditModal(self.app,self,combo,function(sc){if(combo){var idx=self.settings.combos.indexOf(combo);if(idx>=0)self.settings.combos[idx]=sc;}else self.settings.combos.push(sc);self.saveSettings();}).open();};
  Cls.prototype.saveSettings=function(){var self=this;this.saveData(this.settings).then(function(){if(self.settingTab)self.settingTab.display();});};

  return Cls;
})();

module.exports = PluginClass;
