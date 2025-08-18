// == 样式注入 ==
(function injectCSS() {
  const style = document.createElement('style');
  style.textContent = `
    /* 隐藏父级类名为 mt-4 w-full mx-auto 下的所有 div */
    .mt-4.w-full.mx-auto > div { display: none; }

    /* 进度条过窄时仍可显示 */
    .progress-bar { min-width: 2px; }
  `;
  document.head.appendChild(style);
})();

// == 工具函数 ==
const utils = (() => {
  function formatFileSize(bytes) {
    if (bytes === 0) return { value: '0', unit: 'B' };
    const units = ['B','KB','MB','GB','TB','PB'];
    let size = bytes, unitIndex = 0;
    while(size>=1024 && unitIndex<units.length-1){size/=1024;unitIndex++;}
    return { value:size.toFixed(unitIndex===0?0:2), unit: units[unitIndex] };
  }
  function calculatePercentage(used,total){used=Number(used);total=Number(total);return total===0?'0.00':((used/total)*100).toFixed(2);}
  function formatDate(dateString){const date=new Date(dateString);return isNaN(date)?'':date.toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'});}
  function getHslGradientColor(p){const clamp=(v,m,M)=>Math.min(Math.max(v,m),M), lerp=(s,e,t)=>s+(e-s)*t; const P=clamp(Number(p),0,100); let h,s,l; if(P<=35){const t=P/35; h=lerp(142,32,t);s=lerp(69,85,t);l=lerp(45,55,t);} else if(P<=85){const t=(P-35)/50; h=lerp(32,0,t);s=lerp(85,75,t);l=lerp(55,50,t);} else {const t=(P-85)/15; h=0;s=75;l=lerp(50,45,t);} return `hsl(${h.toFixed(0)},${s.toFixed(0)}%,${l.toFixed(0)}%)`;}
  function fadeOutIn(el,newContent,duration=500){el.style.transition=`opacity ${duration/2}ms`;el.style.opacity='0';setTimeout(()=>{el.innerHTML=newContent;el.style.transition=`opacity ${duration/2}ms`;el.style.opacity='1';},duration/2);}
  function safeSetTextContent(parent,selector,text){const el=parent.querySelector(selector);if(el)el.textContent=text;}
  return { formatFileSize, calculatePercentage, formatDate, getHslGradientColor, fadeOutIn, safeSetTextContent };
})();

// == 流量条渲染 ==
const trafficRenderer = (() => {
  const toggleElements = [];
  function renderTrafficStats(trafficData, config){
    const serverMap = new Map();
    for(const cycleId in trafficData){
      const cycle = trafficData[cycleId];
      if(!cycle.server_name||!cycle.transfer) continue;
      for(const serverId in cycle.server_name){
        const serverName = cycle.server_name[serverId];
        const transfer = cycle.transfer[serverId];
        const max = cycle.max;
        const from = cycle.from;
        const to = cycle.to;
        const next_update = cycle.next_update[serverId];
        if(serverName && transfer!==undefined && max && from && to){
          serverMap.set(serverName,{id:serverId,transfer,max,name:cycle.name,from,to,next_update});
        }
      }
    }

    serverMap.forEach((serverData, serverName)=>{
      const targetSection = Array.from(document.querySelectorAll('section.grid.items-center.gap-2'))
        .find(sec=>sec.querySelector('p')?.textContent.trim()===serverName.trim());
      if(!targetSection) return;

      const usedFormatted = utils.formatFileSize(serverData.transfer);
      const totalFormatted = utils.formatFileSize(serverData.max);
      const percentage = utils.calculatePercentage(serverData.transfer, serverData.max);
      const fromFormatted = utils.formatDate(serverData.from);
      const toFormatted = utils.formatDate(serverData.to);
      const nextUpdateFormatted = new Date(serverData.next_update).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai"});
      const uniqueClassName = 'traffic-stats-for-server-' + serverData.id;
      const progressColor = utils.getHslGradientColor(percentage);

      const containerDiv = targetSection.closest('div');
      if(!containerDiv) return;

      const existing = Array.from(containerDiv.querySelectorAll('.new-inserted-element'))
        .find(el=>el.classList.contains(uniqueClassName));

      const defaultTimeInfoHTML = `<span class="from-date">${fromFormatted}</span>
        <span class="text-neutral-500 dark:text-neutral-400">-</span>
        <span class="to-date">${toFormatted}</span>`;

      const contents = [
        defaultTimeInfoHTML,
        `<span class="text-[10px] font-medium text-neutral-800 dark:text-neutral-200 percentage-value">${percentage}%</span>`,
        `<span class="text-[10px] font-medium text-neutral-600 dark:text-neutral-300">${nextUpdateFormatted}</span>`
      ];

      if(existing){
        utils.safeSetTextContent(existing,'.used-traffic',usedFormatted.value);
        utils.safeSetTextContent(existing,'.used-unit',usedFormatted.unit);
        utils.safeSetTextContent(existing,'.total-traffic',totalFormatted.value);
        utils.safeSetTextContent(existing,'.total-unit',totalFormatted.unit);
        utils.safeSetTextContent(existing,'.from-date',fromFormatted);
        utils.safeSetTextContent(existing,'.to-date',toFormatted);
        utils.safeSetTextContent(existing,'.percentage-value',percentage+'%');
        utils.safeSetTextContent(existing,'.next-update',`next update: ${nextUpdateFormatted}`);
        const progressBar = existing.querySelector('.progress-bar');
        if(progressBar){progressBar.style.width=percentage+'%';progressBar.style.background=`linear-gradient(90deg, ${progressColor}, ${progressColor} 90%, #1e293b)`;}
      } else {
        let oldSection = config.insertAfter? containerDiv.querySelector('section.flex.items-center.w-full.justify-between.gap-1')||containerDiv.querySelector('section.grid.items-center.gap-3') : containerDiv.querySelector('section.grid.items-center.gap-3');
        if(!oldSection) return;

        const newElement = document.createElement('div');
        newElement.classList.add('space-y-1.5','new-inserted-element',uniqueClassName);
        newElement.style.width='100%';
        newElement.innerHTML = `
<div class="flex items-center justify-between">
  <div class="flex items-baseline gap-1">
    <span class="text-[10px] font-medium text-neutral-800 dark:text-neutral-200 used-traffic">${usedFormatted.value}</span>
    <span class="text-[10px] font-medium text-neutral-800 dark:text-neutral-200 used-unit">${usedFormatted.unit}</span>
    <span class="text-[10px] text-neutral-500 dark:text-neutral-400">/ </span>
    <span class="text-[10px] text-neutral-500 dark:text-neutral-400 total-traffic">${totalFormatted.value}</span>
    <span class="text-[10px] text-neutral-500 dark:text-neutral-400 total-unit">${totalFormatted.unit}</span>
  </div>
  <div class="text-[10px] font-medium text-neutral-600 dark:text-neutral-300 time-info" style="opacity:1; transition: opacity 0.3s;">
    ${defaultTimeInfoHTML}
  </div>
</div>

<div class="relative h-1.5">
  <!-- 最底层暗色底条 -->
  <div class="absolute inset-0 rounded-full" style="background-color: rgba(30,41,59,0.8);"></div>
  <!-- 浅色灰条 -->
  <div class="absolute inset-0 rounded-full dark:hidden" style="background-color:#d1d5db;"></div>
  <!-- 深色灰条 -->
  <div class="absolute inset-0 rounded-full hidden dark:block" style="background-color:#374151;"></div>
  <!-- 已用彩条 -->
  <div class="absolute inset-0 rounded-full transition-all duration-300 progress-bar" style="width:${percentage}%; max-width:100%; background:linear-gradient(90deg, ${progressColor}, ${progressColor} 90%, #1e293b); min-width:2px;"></div>
</div>
`;
        oldSection.after(newElement);

        if(config.toggleInterval>0){
          const timeInfoElement = newElement.querySelector('.time-info');
          if(timeInfoElement){
            toggleElements.push({el:timeInfoElement,contents});
          }
        }
      }
    });
  }

  function startToggleCycle(toggleInterval,duration){
    if(toggleInterval<=0)return;
    let toggleIndex=0;
    setInterval(()=>{
      toggleIndex++;
      toggleElements.forEach(({el,contents})=>{
        if(!document.body.contains(el))return;
        const index=toggleIndex%contents.length;
        utils.fadeOutIn(el,contents[index],duration);
      });
    },toggleInterval);
  }

  return { renderTrafficStats, startToggleCycle };
})();

// == 数据请求 ==
const trafficDataManager = (() => {
  let trafficCache = null;
  function fetchTrafficData(apiUrl, config, callback){
    const now = Date.now();
    if(trafficCache && (now-trafficCache.timestamp<config.interval)){
      callback(trafficCache.data);
      return;
    }
    fetch(apiUrl).then(res=>res.json()).then(data=>{
      if(!data.success) return;
      const trafficData = data.data.cycle_transfer_stats;
      trafficCache={timestamp:now,data:trafficData};
      callback(trafficData);
    }).catch(err=>console.error('[fetchTrafficData]',err));
  }
  return { fetchTrafficData };
})();

// == DOM 监听 ==
const domObserver = (() => {
  const TARGET_SELECTOR = 'section.server-card-list, section.server-inline-list';
  let currentSection=null, childObserver=null;
  function observeSection(section,onChangeCallback){
    if(childObserver) childObserver.disconnect();
    currentSection=section;
    childObserver=new MutationObserver(mutations=>{
      for(const m of mutations){if(m.type==='childList' && (m.addedNodes.length||m.removedNodes.length)){onChangeCallback();break;}}
    });
    childObserver.observe(currentSection,{childList:true,subtree:false});
    onChangeCallback();
  }
  function startSectionDetector(onChangeCallback){
    const detector=new MutationObserver(()=>{
      const section=document.querySelector(TARGET_SELECTOR);
      if(section && section!==currentSection) observeSection(section,onChangeCallback);
    });
    const root=document.querySelector('main')||document.body;
    detector.observe(root,{childList:true,subtree:true});
    return detector;
  }
  function disconnectAll(detector){if(childObserver)childObserver.disconnect(); if(detector)detector.disconnect();}
  return { startSectionDetector, disconnectAll };
})();

// == 主程序 ==
(function main(){
  const defaultConfig={
    showTrafficStats:true,
    insertAfter:true,
    interval:60000,
    toggleInterval:5000,
    duration:500,
    apiUrl:'/api/v1/service',
    enableLog:false
  };
  let config=Object.assign({},defaultConfig,window.TrafficScriptConfig||{});

  function updateTrafficStats(){
    trafficDataManager.fetchTrafficData(config.apiUrl,config,trafficData=>{
      trafficRenderer.renderTrafficStats(trafficData,config);
    });
  }

  function onDomChange(){updateTrafficStats(); if(!trafficTimer) startPeriodicRefresh();}

  let trafficTimer=null;
  function startPeriodicRefresh(){if(!trafficTimer){trafficTimer=setInterval(()=>{updateTrafficStats();},config.interval);}}

  trafficRenderer.startToggleCycle(config.toggleInterval,config.duration);
  const sectionDetector=domObserver.startSectionDetector(onDomChange);
  onDomChange();

  window.addEventListener('beforeunload',()=>{domObserver.disconnectAll(sectionDetector); if(trafficTimer) clearInterval(trafficTimer);});
})();
