import { createSimulation } from './simulation.mjs';

// Frontend demonstration only. A reload begins a new simulation session.
export function startSimulation() {
  const simulation=createSimulation();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const number=new Intl.NumberFormat('en-US');
  const time=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  const bindings=new Map();
  function bind(element,key) {
    element.dataset.counter=key;
    const elements=bindings.get(key)||[];
    elements.push(element); bindings.set(key,elements);
  }
  const metrics=document.querySelectorAll('.metric-value strong');
  bind(metrics[0],'archives');bind(metrics[1],'batches');bind(metrics[3],'ai');
  document.querySelectorAll('.product-copy').forEach((row,i)=>{
    const values=row.querySelectorAll('b');
    bind(values[0],`archive${i}`);bind(values[1],`views${i}`);
  });
  for(const [id,key,suffix] of [['raw','batches',' 批｜可追溯'],['factory','processing','条记录｜运行正常'],['product','archives','个｜已建档'],['transport','trace','次｜可查询']]) {
    const label=document.querySelector(`.trace-node.${id} small`);
    const value=document.createElement('span');
    label.replaceChildren(value,document.createTextNode(suffix));bind(value,key);
  }
  const flatten=snapshot=>Object.assign({batches:snapshot.batches,ai:snapshot.ai,processing:snapshot.processing,trace:snapshot.trace},...snapshot.products.map((p,i)=>({[`archive${i}`]:p.archives,[`views${i}`]:p.views})));
  const total=values=>values.archive0+values.archive1+values.archive2;
  let displayed=flatten(simulation.snapshot());
  let from={...displayed},target={...displayed},transitionStart=0,frame=0;
  function render(values) {
    for(const [key,value] of Object.entries({...values,archives:total(values)})) {
      for(const element of bindings.get(key)||[]) {
        const text=number.format(value);
        if(element.textContent!==text)element.textContent=text;
      }
    }
    for(const node of document.querySelectorAll('.trace-node'))node.setAttribute('aria-label',`${node.querySelector('strong').textContent}，${node.querySelector('small').textContent}`);
  }
  function animate(now) {
    const progress=Math.min(1,(now-transitionStart)/650);
    const eased=1-(1-progress)**3;
    for(const key of Object.keys(target))displayed[key]=Math.round(from[key]+(target[key]-from[key])*eased);
    render(displayed);
    frame=progress<1?requestAnimationFrame(animate):0;
  }
  function update(snapshot) {
    const next=flatten(snapshot);
    const changed=Object.keys(next).filter(key=>next[key]!==target[key]);
    if(!changed.length)return;
    if(total(next)!==total(target))changed.push('archives');
    cancelAnimationFrame(frame);
    from={...displayed};target=next;
    if(reduced.matches) {displayed={...target};render(displayed);frame=0;return;}
    for(const key of changed)for(const element of bindings.get(key)||[]) {
      element.getAnimations().forEach(animation=>animation.cancel());
      element.animate([{textShadow:'0 0 12px #ffd598'},{textShadow:'none'}],{duration:900});
    }
    transitionStart=performance.now();frame=requestAnimationFrame(animate);
  }
  render(displayed);

  const groups=[...document.querySelectorAll('.alert-group')];
  const track=document.querySelector('.alert-track');
  const viewport=document.querySelector('.alert-viewport');
  const rowCount=groups[0].children.length;
  const initialTime=Date.now();
  groups.forEach(group=>[...group.children].forEach((row,i)=>{
    const stamp=new Date(initialTime-i*60000);
    row.querySelector('time').textContent=time.format(stamp);
    row.querySelector('time').dateTime=stamp.toISOString();
  }));
  let pending=[],lastSlot=-1;
  function insertRecord() {
    if(!pending.length)return;
    const progress=track.getAnimations()[0]?.effect.getComputedTiming().progress||0;
    const slot=reduced.matches?0:(Math.floor(progress*rowCount)+6)%rowCount;
    if(!reduced.matches&&slot===lastSlot)return;
    if(!reduced.matches) {
      const bounds=viewport.getBoundingClientRect();
      if(groups.some(group=>{const rect=group.children[slot].getBoundingClientRect();return rect.bottom>bounds.top&&rect.top<bounds.bottom;}))return;
    }
    const event=pending.shift();lastSlot=slot;
    for(const group of groups) {
      const row=group.children[slot],tag=row.querySelector('.status-tag');
      tag.textContent=event.status;tag.className=`status-tag ${event.status==='预警'?'danger':event.status==='提示'?'info':'normal'}`;
      row.querySelector('.alert-copy').textContent=`${event.title}  ${event.note}`;
      row.querySelector('time').textContent=time.format(event.timestamp);
      row.querySelector('time').dateTime=new Date(event.timestamp).toISOString();
    }
  }
  let lastTick=performance.now();
  setInterval(()=>{
    const now=performance.now(),delta=now-lastTick;lastTick=now;
    if(document.hidden)return;
    const result=simulation.advance(Math.min(delta,1000));
    update(result.snapshot);
    // Use display arrival time after background pauses, rather than backdating new records.
    pending.push(...result.events.map(event=>({...event,timestamp:Date.now()})));
    pending=pending.slice(-20);insertRecord();
  },250);
  document.addEventListener('visibilitychange',()=>{lastTick=performance.now();});
  reduced.addEventListener('change',()=>{
    if(reduced.matches){cancelAnimationFrame(frame);displayed={...target};render(displayed);}
  });
}
