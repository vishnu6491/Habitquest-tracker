// ─── Storage shim (replaces Claude's window.storage with localStorage) ────────
import { useState, useEffect } from "react";

if (!window.storage) {
  window.storage = {
    set: async (k, v) => {
      localStorage.setItem(k, v);
      return { key: k, value: v };
    },
    get: async (k) => {
      const v = localStorage.getItem(k);
      return v !== null ? { key: k, value: v } : null;
    },
    delete: async (k) => {
      localStorage.removeItem(k);
      return { key: k, deleted: true };
    },
    list: async (prefix = '') => ({
      keys: Object.keys(localStorage).filter(k => k.startsWith(prefix))
    }),
  };
}

// ─── Utility ──────────────────────────────────────────────────────────────────
const todayKey  = () => new Date().toISOString().slice(0,10);
const weekKey   = () => { const d=new Date(),dy=d.getDay(),diff=d.getDate()-dy+(dy===0?-6:1); return new Date(new Date(d).setDate(diff)).toISOString().slice(0,10); };
const monthKey  = () => new Date().toISOString().slice(0,7);
const save = async(k,v)=>{ try{await window.storage.set(k,JSON.stringify(v));}catch{} };
const load = async(k,fb)=>{ try{const r=await window.storage.get(k);return r?JSON.parse(r.value):fb;}catch{return fb;} };

// ─── Levels & Stages ─────────────────────────────────────────────────────────
const LV_XP=[0,120,300,600,1100,1800,2700,3900,5400,7200,9500];
const getLevel=(xp)=>{ let l=1; LV_XP.forEach((t,i)=>{if(xp>=t)l=i+1;}); return Math.min(l,11); };
const STAGES=[
  {lv:1, title:"Seeker",        skin:"#c8906a",hair:"#2a1608",glowR:0,  bodyOp:1.00,auraOp:0,   desc:"The journey begins within"},
  {lv:2, title:"Aspirant",      skin:"#cc9870",hair:"#2a1608",glowR:22, bodyOp:0.98,auraOp:0.15,desc:"Awakening to higher purpose"},
  {lv:3, title:"Initiate",      skin:"#d6a87c",hair:"#6b3a2a",glowR:38, bodyOp:0.95,auraOp:0.25,desc:"Donning the robes of practice"},
  {lv:4, title:"Practitioner",  skin:"#e0b88a",hair:"#8b4a1a",glowR:54, bodyOp:0.90,auraOp:0.35,desc:"Deepening the daily discipline"},
  {lv:5, title:"Renunciant",    skin:"#ecc89e",hair:"#8b5cf6",glowR:72, bodyOp:0.82,auraOp:0.45,desc:"Releasing attachment to outcome"},
  {lv:6, title:"Yogi",          skin:"#f2d8b2",hair:"#a78bfa",glowR:90, bodyOp:0.72,auraOp:0.55,desc:"Union of body, mind and spirit"},
  {lv:7, title:"Sadhu",         skin:"#f6e4c8",hair:"#c4b5fd",glowR:110,bodyOp:0.58,auraOp:0.65,desc:"Beyond all worldly boundaries"},
  {lv:8, title:"Rishi",         skin:"#faeedd",hair:"#ddd6fe",glowR:132,bodyOp:0.43,auraOp:0.75,desc:"Seer of eternal divine truth"},
  {lv:9, title:"Mahatma",       skin:"#fdf5ee",hair:"#ede9fe",glowR:156,bodyOp:0.28,auraOp:0.85,desc:"Great soul, nearly formless"},
  {lv:10,title:"Saint",         skin:"#ffffff", hair:"#ffffff",glowR:182,bodyOp:0.14,auraOp:0.93,desc:"Pure radiance, no shadow remains"},
  {lv:11,title:"Liberated One", skin:"#ffffff", hair:"#ffffff",glowR:210,bodyOp:0.06,auraOp:1.00,desc:"Beyond body, beyond time, beyond self"},
];

// ─── Shop Items ───────────────────────────────────────────────────────────────
const SHOP=[
  {id:"mala",    name:"Rudraksha Mala",  sym:"📿",karma:50, lib:5,  desc:"108 seeds of Shiva — count every breath"},
  {id:"robe",    name:"Saffron Robe",    sym:"🟠",karma:80, lib:7,  desc:"Fire-colored cloth of the renunciant"},
  {id:"halo",    name:"Golden Halo",     sym:"🌕",karma:120,lib:10, desc:"Crown of light, grace made visible"},
  {id:"lotus",   name:"Lotus Throne",    sym:"🪷",karma:150,lib:12, desc:"Rise from mud, bloom untouched"},
  {id:"thirdeye",name:"Ājñā Gem",        sym:"🔮",karma:200,lib:15, desc:"Third eye opens — all illusion dissolves"},
  {id:"aura",    name:"Divine Aura",     sym:"✨",karma:250,lib:18, desc:"Cosmic light radiating from within"},
  {id:"trishul", name:"Trishul",         sym:"🔱",karma:180,lib:12, desc:"Shiva's trident — destroyer of illusion"},
  {id:"crown",   name:"Crown of Light",  sym:"👑",karma:300,lib:20, desc:"Sahasrāra fully blossomed open"},
  {id:"wings",   name:"Wings of Light",  sym:"🕊️",karma:350,lib:22, desc:"Freed from the gravity of attachment"},
  {id:"flame",   name:"Sacred Flame",    sym:"🕯️",karma:200,lib:14, desc:"The flame of consciousness, eternally lit"},
  {id:"cosmic",  name:"Cosmic Mandala",  sym:"☸️",karma:400,lib:25, desc:"The universe as your backdrop, always"},
  {id:"om",      name:"Āum Amulet",      sym:"🕉️",karma:100,lib:8,  desc:"The primordial sound before all worlds"},
];
const MAX_LIB = SHOP.reduce((s,i)=>s+i.lib,0);

const liberationPct=(lv,equipped)=>{
  const lvBonus=(lv/11)*40;
  const eqBonus=(equipped.reduce((s,id)=>{const it=SHOP.find(x=>x.id===id);return s+(it?it.lib:0);},0)/MAX_LIB)*60;
  return Math.min(100,Math.round(lvBonus+eqBonus));
};

// ─── Moods ────────────────────────────────────────────────────────────────────
const MOODS=[
  {min:0,  label:"Struggling",emoji:"😞",col:"#ef4444"},
  {min:20, label:"Meh",       emoji:"😐",col:"#f97316"},
  {min:40, label:"Okay",      emoji:"🙂",col:"#eab308"},
  {min:60, label:"Good",      emoji:"😊",col:"#22c55e"},
  {min:80, label:"Great",     emoji:"😄",col:"#06b6d4"},
  {min:100,label:"Fantastic!",emoji:"🤩",col:"#a855f7"},
];
const getMood=(p)=>{ let m=MOODS[0]; MOODS.forEach(x=>{if(p>=x.min)m=x;}); return p>=100?MOODS[5]:m; };

const DEFAULT_HABITS=[
  {id:"h1",name:"Morning Meditation",freq:"daily",  xp:25,icon:"🧘",color:"#8b5cf6"},
  {id:"h2",name:"Physical Practice",  freq:"daily",  xp:20,icon:"💪",color:"#ef4444"},
  {id:"h3",name:"Sacred Reading",     freq:"daily",  xp:15,icon:"📚",color:"#3b82f6"},
  {id:"h4",name:"Mindful Eating",     freq:"daily",  xp:10,icon:"🥗",color:"#22c55e"},
  {id:"h5",name:"Weekly Reflection",  freq:"weekly", xp:40,icon:"🌙",color:"#f59e0b"},
  {id:"h6",name:"Monthly Vow",        freq:"monthly",xp:80,icon:"🕉️",color:"#ec4899"},
];
const FC={"daily":"#a78bfa","weekly":"#f59e0b","monthly":"#10b981"};
const FI={"daily":"🔁","weekly":"📅","monthly":"🗓️"};

// ─── Saint SVG ────────────────────────────────────────────────────────────────
function SaintSVG({level,equipped}){
  const st=STAGES[Math.min(level-1,10)];
  const {skin,hair,bodyOp}=st;
  const has=id=>equipped.includes(id);
  const bodyFill=has("robe")?"#f97316":skin;
  const isEthereal=level>=9;
  const eyeCol=isEthereal?"#fde68a":"#5a3010";
  return(
    <svg viewBox="0 0 120 215" width="100%" height="100%" style={{overflow:"visible"}}>
      <defs>
        <radialGradient id="ag" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity={0.95}/>
          <stop offset="45%" stopColor="#fbbf24" stopOpacity={0.45}/>
          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0}/>
        </radialGradient>
        <radialGradient id="dg" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#ede9fe" stopOpacity={0.9}/>
          <stop offset="55%" stopColor="#7c3aed" stopOpacity={0.4}/>
          <stop offset="100%" stopColor="#4c1d95" stopOpacity={0}/>
        </radialGradient>
        <radialGradient id="lg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={1}/>
          <stop offset="55%" stopColor="#c4b5fd" stopOpacity={0.6}/>
          <stop offset="100%" stopColor="#7c3aed" stopOpacity={0}/>
        </radialGradient>
        <filter id="glow1" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow2" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="9" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {has("cosmic")&&(
        <g opacity={0.32} transform="translate(60,100)">
          {[0,45,90,135,180,225,270,315].map((deg,i)=>{
            const a=deg*Math.PI/180;
            return<line key={i} x1={0} y1={0} x2={Math.cos(a)*95} y2={Math.sin(a)*95} stroke="#fbbf24" strokeWidth={0.6}/>;
          })}
          {[32,56,80].map(r=><circle key={r} cx={0} cy={0} r={r} fill="none" stroke="#fbbf24" strokeWidth={0.5}/>)}
          {[0,45,90,135,180,225,270,315].map((deg,i)=>{
            const a=(deg+22.5)*Math.PI/180;
            return<circle key={i} cx={Math.cos(a)*56} cy={Math.sin(a)*56} r={3} fill="#fbbf24" opacity={0.55}/>;
          })}
        </g>
      )}
      {has("aura")&&<ellipse cx={60} cy={100} rx={72} ry={88} fill="url(#dg)" opacity={0.65}/>}
      {level>1&&<ellipse cx={60} cy={100} rx={st.glowR*0.52} ry={st.glowR*0.62} fill="url(#ag)" opacity={Math.min(0.9,level*0.085)}/>}
      {level>=9&&<ellipse cx={60} cy={110} rx={34} ry={55} fill="url(#lg)" opacity={(level-8)*0.28} filter="url(#glow2)"/>}

      {has("wings")&&(
        <g opacity={0.82} filter="url(#glow1)">
          <path d="M43,128 Q12,102 8,76 Q6,56 24,63 Q38,73 43,112" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth={1}/>
          <path d="M43,112 Q33,92 30,76 Q32,65 43,72" fill="#bae6fd" opacity={0.65}/>
          <path d="M77,128 Q108,102 112,76 Q114,56 96,63 Q82,73 77,112" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth={1}/>
          <path d="M77,112 Q87,92 90,76 Q88,65 77,72" fill="#bae6fd" opacity={0.65}/>
        </g>
      )}

      {has("lotus")?(
        <g>
          {[0,36,72,108,144,180,216,252,288,324].map((deg,i)=>{
            const a=(deg-90)*Math.PI/180,r=28;
            const px=60+Math.cos(a)*r, py=180+Math.sin(a)*r*0.38;
            const cs=["#fda4af","#f9a8d4","#fbcfe8","#fce7f3","#ffd7e4"];
            return<ellipse key={i} cx={px} cy={py} rx={14} ry={7} fill={cs[i%5]} opacity={0.87} transform={`rotate(${deg},${px},${py})`}/>;
          })}
          <ellipse cx={60} cy={180} rx={24} ry={9} fill="#fecdd3" opacity={0.75}/>
        </g>
      ):(
        <ellipse cx={60} cy={185} rx={40} ry={7} fill="rgba(255,255,255,0.07)"/>
      )}

      <g opacity={bodyOp} filter={level>=8?"url(#glow1)":undefined}>
        <path d="M26,160 Q20,148 24,138 Q32,127 50,140 Q60,149 70,140 Q88,127 96,138 Q100,148 94,160 Q76,172 60,172 Q44,172 26,160" fill={bodyFill}/>
        <path d="M44,142 Q42,116 47,101 Q53,93 67,101 Q72,116 76,142 Z" fill={bodyFill}/>
        <path d="M44,132 Q32,127 27,118 Q27,110 35,114 Q41,119 44,128" fill={has("robe")?"#f97316":skin}/>
        <path d="M76,132 Q88,127 93,118 Q93,110 85,114 Q79,119 76,128" fill={has("robe")?"#f97316":skin}/>
        <ellipse cx={52} cy={152} rx={11} ry={5.5} fill={skin}/>
        <ellipse cx={68} cy={152} rx={11} ry={5.5} fill={skin}/>
        <path d="M55,90 Q55,83 60,81 Q65,83 65,90" fill={skin}/>
        <ellipse cx={60} cy={69} rx={18} ry={20} fill={skin}/>
        {level<10&&<path d="M42,63 Q44,47 60,44 Q76,47 78,63 Q75,50 60,48 Q45,50 42,63" fill={hair}/>}
        <path d="M50,68 Q53,69.5 57,68" fill="none" stroke={eyeCol} strokeWidth={1.6} strokeLinecap="round"/>
        <path d="M63,68 Q67,69.5 70,68" fill="none" stroke={eyeCol} strokeWidth={1.6} strokeLinecap="round"/>
        <path d="M55,77 Q60,81 65,77" fill="none" stroke={isEthereal?"#fde68a":"#7c4a1e"} strokeWidth={1.4} strokeLinecap="round"/>
        <path d="M58,72 Q60,75 62,72" fill="none" stroke={isEthereal?"#fde68a88":"#a0714a"} strokeWidth={1} strokeLinecap="round"/>
      </g>

      {has("thirdeye")&&(
        <g filter="url(#glow1)">
          <ellipse cx={60} cy={62} rx={5} ry={3.2} fill="#7c3aed"/>
          <ellipse cx={60} cy={62} rx={2.8} ry={1.7} fill="#fde68a"/>
          {[0,45,90,135,180,225,270,315].map((deg,i)=>{
            const a=deg*Math.PI/180;
            return<line key={i} x1={60+Math.cos(a)*5.5} y1={62+Math.sin(a)*3.8} x2={60+Math.cos(a)*10} y2={62+Math.sin(a)*6.8} stroke="#fde68a" strokeWidth={0.75} opacity={0.72}/>;
          })}
        </g>
      )}

      {has("mala")&&(
        <g opacity={bodyOp}>
          {Array.from({length:22},(_,i)=>{
            const a=(i*(360/22)-90)*Math.PI/180;
            const bx=60+Math.cos(a)*25, by=100+Math.sin(a)*11;
            return<circle key={i} cx={bx} cy={by} r={2.4} fill={i%11===0?"#dc2626":"#92400e"}/>;
          })}
        </g>
      )}

      {has("om")&&(
        <g filter="url(#glow1)" opacity={bodyOp}>
          <circle cx={60} cy={110} r={7.5} fill="#78350f" stroke="#fbbf24" strokeWidth={1.3}/>
          <text x={60} y={113.5} textAnchor="middle" fontSize={9} fill="#fde68a" fontFamily="serif">ॐ</text>
        </g>
      )}

      {has("halo")&&(
        <g filter="url(#glow1)">
          <ellipse cx={60} cy={44} rx={25} ry={8.5} fill="none" stroke="#fbbf24" strokeWidth={3.2} opacity={0.92}/>
          <ellipse cx={60} cy={44} rx={25} ry={8.5} fill="none" stroke="#fef3c7" strokeWidth={1.4} opacity={0.5}/>
        </g>
      )}

      {has("crown")&&(
        <g filter="url(#glow2)">
          {[-13,-8,-4,0,4,8,13].map((ox,i)=>{
            const h=i%2===0?20:14;
            return<line key={i} x1={60+ox} y1={47} x2={60+ox} y2={47-h} stroke="#fbbf24" strokeWidth={2.8} strokeLinecap="round"/>;
          })}
        </g>
      )}

      {has("flame")&&(
        <g filter="url(#glow1)">
          <path d="M60,24 Q52,13 56,5 Q60,-3 64,5 Q68,13 60,24" fill="#f97316" opacity={0.95}/>
          <path d="M60,22 Q56,13 58,7 Q60,3 62,7 Q64,13 60,22" fill="#fef3c7"/>
        </g>
      )}

      {has("trishul")&&(
        <g transform="translate(100,78)">
          <line x1={0} y1={87} x2={0} y2={4} stroke="#fbbf24" strokeWidth={2.6}/>
          <line x1={-8} y1={14} x2={8} y2={14} stroke="#fbbf24" strokeWidth={1.7}/>
          <path d="M-4,4 Q-6,-5 0,4" fill="none" stroke="#fbbf24" strokeWidth={2}/>
          <path d="M4,4 Q6,-5 0,4" fill="none" stroke="#fbbf24" strokeWidth={2}/>
          <line x1={0} y1={4} x2={0} y2={-16} stroke="#fbbf24" strokeWidth={2.6}/>
        </g>
      )}

      {level>=7&&Array.from({length:14},(_,i)=>{
        const a=i*(360/14)*Math.PI/180;
        const r=55+(level-6)*13;
        const px=60+Math.cos(a)*r, py=100+Math.sin(a)*r*0.55;
        return<circle key={i} cx={px} cy={py} r={1.6+(i%4)*0.4} fill="#fde68a" opacity={0.3+(level-7)*0.06}/>;
      })}
    </svg>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState("today");
  const [habits,setHabits]=useState(DEFAULT_HABITS);
  const [completions,setCompletions]=useState({});
  const [xp,setXp]=useState(0);
  const [karma,setKarma]=useState(0);
  const [streaks,setStreaks]=useState({});
  const [inventory,setInventory]=useState([]);
  const [equipped,setEquipped]=useState([]);
  const [loaded,setLoaded]=useState(false);
  const [toast,setToast]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [newH,setNewH]=useState({name:"",freq:"daily",xp:15,icon:"⭐",color:"#6366f1"});
  const [repPeriod,setRepPeriod]=useState("week");

  useEffect(()=>{
    (async()=>{
      setHabits(await load("habits",DEFAULT_HABITS));
      setCompletions(await load("completions",{}));
      setXp(await load("xp",0));
      setKarma(await load("karma",0));
      setStreaks(await load("streaks",{}));
      setInventory(await load("inventory",[]));
      setEquipped(await load("equipped",[]));
      setLoaded(true);
    })();
  },[]);

  const flash=(msg,col="#22c55e")=>{ setToast({msg,col}); setTimeout(()=>setToast(null),2200); };

  const compKey=(freq,id)=>`${freq}:${id}:${freq==="daily"?todayKey():freq==="weekly"?weekKey():monthKey()}`;
  const isDone=(freq,id)=>!!completions[compKey(freq,id)];

  const toggleHabit=(h)=>{
    const key=compKey(h.freq,h.id);
    const done=completions[key];
    const nc={...completions};
    let nx=xp, nk=karma, ns={...streaks};
    if(done){
      delete nc[key]; nx=Math.max(0,xp-h.xp); nk=Math.max(0,karma-h.xp);
      ns[h.id]=Math.max(0,(ns[h.id]||1)-1);
      flash(`-${h.xp} XP  ${h.icon}`,"#ef4444");
    } else {
      nc[key]={ts:Date.now(),xp:h.xp}; nx=xp+h.xp; nk=karma+h.xp;
      ns[h.id]=(ns[h.id]||0)+1;
      const prevLv=getLevel(xp), newLv=getLevel(nx);
      if(newLv>prevLv){
        const st=STAGES[Math.min(newLv-1,10)];
        flash(`🌟 Evolved to ${st.title}! Level ${newLv}`,"#a855f7");
      } else { flash(`+${h.xp} XP  ${h.icon}  +${h.xp} Karma`,"#22c55e"); }
    }
    setCompletions(nc); setXp(nx); setKarma(nk); setStreaks(ns);
    save("completions",nc); save("xp",nx); save("karma",nk); save("streaks",ns);
  };

  const buyItem=(item)=>{
    if(karma<item.karma){flash("Not enough Karma Coins 🙏","#ef4444");return;}
    if(inventory.includes(item.id)){flash("Already owned","#f59e0b");return;}
    const ni=[...inventory,item.id], nk=karma-item.karma;
    setInventory(ni); setKarma(nk);
    save("inventory",ni); save("karma",nk);
    flash(`${item.sym} ${item.name} acquired!`,"#a855f7");
  };

  const toggleEquip=(id)=>{
    const ne=equipped.includes(id)?equipped.filter(x=>x!==id):[...equipped,id];
    setEquipped(ne); save("equipped",ne);
  };

  const addHabit=()=>{
    if(!newH.name.trim())return;
    const h={...newH,id:`h${Date.now()}`,xp:Number(newH.xp)||15};
    const u=[...habits,h]; setHabits(u); save("habits",u);
    setShowAdd(false); setNewH({name:"",freq:"daily",xp:15,icon:"⭐",color:"#6366f1"});
    flash("Habit added 🎯");
  };

  const deleteHabit=(id)=>{ const u=habits.filter(h=>h.id!==id); setHabits(u); save("habits",u); };

  if(!loaded) return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0a0715",color:"#a78bfa",gap:16}}>
      <div style={{fontSize:40}}>🕉️</div>
      <div style={{fontFamily:"serif",fontSize:18,color:"#c4b5fd"}}>Loading your path...</div>
    </div>
  );

  const lv=getLevel(xp);
  const stage=STAGES[Math.min(lv-1,10)];
  const libPct=liberationPct(lv,equipped);
  const dailyH=habits.filter(h=>h.freq==="daily");
  const dailyDone=dailyH.filter(h=>isDone("daily",h.id)).length;
  const dailyPct=dailyH.length>0?Math.round((dailyDone/dailyH.length)*100):0;
  const mood=getMood(dailyPct);

  const S={
    app:{fontFamily:"'DM Sans',sans-serif",background:"linear-gradient(175deg,#0a0715 0%,#110a25 55%,#081528 100%)",minHeight:"100vh",color:"#e2e8f0",maxWidth:480,margin:"0 auto",paddingBottom:88,position:"relative"},
    card:()=>({background:"rgba(255,255,255,0.045)",borderRadius:20,border:"1px solid rgba(255,255,255,0.075)",backdropFilter:"blur(10px)"}),
    input:{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.11)",borderRadius:12,padding:"10px 14px",color:"#e2e8f0",fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif"},
    sel:{width:"100%",background:"rgba(15,10,35,0.9)",border:"1px solid rgba(255,255,255,0.11)",borderRadius:12,padding:"10px 14px",color:"#e2e8f0",fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif"},
    btn:(bg,extra={})=>({background:bg,color:"#fff",border:"none",borderRadius:12,padding:"11px 20px",fontWeight:700,cursor:"pointer",fontFamily:"'Cinzel',serif",fontSize:12,letterSpacing:0.8,...extra}),
    nav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"rgba(8,5,20,0.97)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex",justifyContent:"space-around",padding:"10px 0 14px",zIndex:100},
  };

  const TodayView=()=>(
    <div style={{padding:"0 16px"}}>
      <div style={{...S.card(),padding:"18px",marginBottom:16,background:`linear-gradient(135deg,${mood.col}18,${mood.col}08)`,border:`1px solid ${mood.col}33`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:11,color:mood.col,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,fontFamily:"'Cinzel',serif"}}>Today's Mood</div>
          <div style={{fontSize:28,fontWeight:900,fontFamily:"'Cinzel',serif",color:mood.col,marginTop:2}}>{mood.emoji} {mood.label}</div>
          <div style={{fontSize:12,color:"#64748b",marginTop:3}}>{dailyDone}/{dailyH.length} daily habits complete</div>
        </div>
        <svg width={70} height={70}>
          <circle cx={35} cy={35} r={29} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={6}/>
          <circle cx={35} cy={35} r={29} fill="none" stroke={mood.col} strokeWidth={6}
            strokeDasharray={`${(dailyPct/100)*182.2} 182.2`} strokeLinecap="round"
            transform="rotate(-90 35 35)" style={{transition:"stroke-dasharray 0.7s cubic-bezier(.4,0,.2,1)"}}/>
          <text x={35} y={40} textAnchor="middle" fill="#e2e8f0" fontSize={15} fontWeight={800} fontFamily="'Cinzel',serif">{dailyPct}%</text>
        </svg>
      </div>
      {["daily","weekly","monthly"].map(freq=>{
        const group=habits.filter(h=>h.freq===freq);
        if(!group.length)return null;
        return(
          <div key={freq} style={{marginBottom:18}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:9}}>
              <span style={{fontSize:14}}>{FI[freq]}</span>
              <span style={{fontSize:11,fontWeight:700,color:FC[freq],textTransform:"uppercase",letterSpacing:1.2,fontFamily:"'Cinzel',serif"}}>{freq}</span>
            </div>
            {group.map(h=>{
              const done=isDone(h.freq,h.id);
              return(
                <div key={h.id} onClick={()=>toggleHabit(h)} style={{display:"flex",alignItems:"center",gap:13,marginBottom:9,background:done?`${h.color}18`:"rgba(255,255,255,0.04)",borderRadius:16,padding:"13px 15px",cursor:"pointer",border:`1.5px solid ${done?h.color+"55":"rgba(255,255,255,0.07)"}`,transition:"all 0.2s"}}>
                  <span style={{fontSize:21}}>{h.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14,color:done?"#94a3b8":"#e2e8f0",textDecoration:done?"line-through":"none"}}>{h.name}</div>
                    <div style={{fontSize:11,color:"#475569",marginTop:2,display:"flex",gap:8}}>
                      <span>+{h.xp} XP</span>
                      {(streaks[h.id]||0)>0&&<span style={{color:"#f97316"}}>🔥 {streaks[h.id]}</span>}
                    </div>
                  </div>
                  <div style={{width:26,height:26,borderRadius:"50%",background:done?`linear-gradient(135deg,${h.color},${h.color}bb)`:"transparent",border:`2px solid ${done?h.color:"#374151"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:done?`0 0 12px ${h.color}66`:"none",transition:"all 0.2s"}}>
                    {done&&<span style={{fontSize:13,color:"#fff"}}>✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      <button onClick={()=>setShowAdd(true)} style={{...S.btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),width:"100%",padding:"14px",boxShadow:"0 4px 24px rgba(99,102,241,0.35)",fontSize:13,marginBottom:8}}>
        + Add Habit
      </button>
    </div>
  );

  const SaintView=()=>{
    const prevXP=LV_XP[lv-1]??0;
    const nextXP=LV_XP[lv]??LV_XP[LV_XP.length-1];
    const lvPct=nextXP>prevXP?((xp-prevXP)/(nextXP-prevXP))*100:100;
    return(
      <div style={{padding:"0 16px"}}>
        <div style={{textAlign:"center",marginBottom:8}}>
          <div style={{fontSize:11,color:"#a78bfa",fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,fontFamily:"'Cinzel',serif"}}>Level {lv} — {stage.title}</div>
          <div style={{fontSize:12,color:"#64748b",marginTop:2,fontStyle:"italic"}}>{stage.desc}</div>
        </div>
        <div style={{position:"relative",height:280,margin:"0 auto",maxWidth:260,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",inset:0,borderRadius:"50%",background:`radial-gradient(ellipse at center, ${stage.glowR>0?"rgba(251,191,36,"+stage.auraOp*0.18+")":"transparent"} 0%, transparent 70%)`,animation:"pulse 3s ease-in-out infinite"}}/>
          <SaintSVG level={lv} equipped={equipped}/>
        </div>
        <div style={{...S.card(),padding:"16px 18px",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:12,fontWeight:700,color:"#fbbf24",fontFamily:"'Cinzel',serif",letterSpacing:0.8}}>✦ Liberation</div>
            <div style={{fontSize:18,fontWeight:900,color:"#fbbf24",fontFamily:"'Cinzel',serif"}}>{libPct}%</div>
          </div>
          <div style={{height:10,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${libPct}%`,background:"linear-gradient(90deg,#f59e0b,#fbbf24,#fef3c7)",borderRadius:99,boxShadow:"0 0 12px #fbbf2466",transition:"width 0.8s cubic-bezier(.4,0,.2,1)"}}/>
          </div>
          <div style={{fontSize:11,color:"#475569",marginTop:6}}>{libPct<100?`${100-libPct}% more to full liberation`:"🌟 Full Liberation Attained!"}</div>
        </div>
        <div style={{...S.card(),padding:"14px 18px",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:11,color:"#8b5cf6",fontWeight:700,fontFamily:"'Cinzel',serif"}}>⚡ Experience</span>
            <span style={{fontSize:11,color:"#64748b"}}>{xp} / {LV_XP[lv]??LV_XP[LV_XP.length-1]} XP</span>
          </div>
          <div style={{height:8,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${lvPct}%`,background:"linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa)",borderRadius:99,transition:"width 0.7s cubic-bezier(.4,0,.2,1)"}}/>
          </div>
        </div>
        <div style={{...S.card(),padding:"14px 18px",marginBottom:12}}>
          <div style={{fontSize:11,color:"#a78bfa",fontWeight:700,fontFamily:"'Cinzel',serif",letterSpacing:0.8,marginBottom:10}}>✦ Equipped</div>
          {equipped.length===0?(
            <div style={{textAlign:"center",color:"#374151",fontSize:13,padding:"10px 0"}}>No accessories. Visit the Shop.</div>
          ):(
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {equipped.map(id=>{
                const item=SHOP.find(x=>x.id===id);
                return item?(
                  <div key={id} onClick={()=>toggleEquip(id)} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(168,85,247,0.15)",borderRadius:10,padding:"6px 12px",border:"1px solid rgba(168,85,247,0.3)",cursor:"pointer"}}>
                    <span style={{fontSize:16}}>{item.sym}</span>
                    <span style={{fontSize:11,fontWeight:600}}>{item.name}</span>
                    <span style={{fontSize:10,color:"#ef4444",marginLeft:2}}>✕</span>
                  </div>
                ):null;
              })}
            </div>
          )}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div style={{...S.card(),padding:"14px",textAlign:"center"}}>
            <div style={{fontSize:22}}>🪙</div>
            <div style={{fontSize:22,fontWeight:900,color:"#fbbf24",fontFamily:"'Cinzel',serif"}}>{karma}</div>
            <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:0.5}}>Karma Coins</div>
          </div>
          <div style={{...S.card(),padding:"14px",textAlign:"center"}}>
            <div style={{fontSize:22}}>{lv<=3?"🌱":lv<=6?"⚡":lv<=9?"🔥":"👑"}</div>
            <div style={{fontSize:16,fontWeight:800,color:"#a78bfa",fontFamily:"'Cinzel',serif",lineHeight:1.2}}>{stage.title}</div>
            <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:0.5}}>Level {lv}</div>
          </div>
        </div>
        <div style={{...S.card(),padding:"16px 18px"}}>
          <div style={{fontSize:11,color:"#a78bfa",fontWeight:700,fontFamily:"'Cinzel',serif",letterSpacing:0.8,marginBottom:12}}>✦ Evolution Path</div>
          {STAGES.map((s,i)=>{
            const reached=lv>s.lv, current=lv===s.lv;
            return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,position:"relative"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:20}}>
                  <div style={{width:16,height:16,borderRadius:"50%",flexShrink:0,background:reached?"linear-gradient(135deg,#fbbf24,#f59e0b)":current?"linear-gradient(135deg,#a78bfa,#6366f1)":"rgba(255,255,255,0.07)",border:current?"2px solid #a78bfa":"2px solid transparent",boxShadow:current?"0 0 10px #a78bfa88":"none"}}/>
                  {i<STAGES.length-1&&<div style={{width:2,height:20,background:reached?"linear-gradient(#fbbf24,#f59e0b55)":"rgba(255,255,255,0.06)"}}/>}
                </div>
                <div style={{flex:1,paddingBottom:i<STAGES.length-1?12:0}}>
                  <span style={{fontSize:13,fontWeight:current?700:500,color:reached?"#fbbf24":current?"#e2e8f0":"#374151",fontFamily:current?"'Cinzel',serif":undefined}}>{s.title}</span>
                  {current&&<span style={{fontSize:10,color:"#a78bfa",marginLeft:6}}>← You are here</span>}
                </div>
                <span style={{fontSize:11,color:"#374151"}}>Lv{s.lv}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const ShopView=()=>(
    <div style={{padding:"0 16px"}}>
      <div style={{...S.card(),padding:"14px 18px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",background:"linear-gradient(135deg,rgba(251,191,36,0.15),rgba(245,158,11,0.08))"}}>
        <div>
          <div style={{fontSize:11,color:"#fbbf24",fontWeight:700,fontFamily:"'Cinzel',serif",letterSpacing:1}}>KARMA COINS</div>
          <div style={{fontSize:30,fontWeight:900,color:"#fbbf24",fontFamily:"'Cinzel',serif",lineHeight:1.1}}>{karma}</div>
          <div style={{fontSize:11,color:"#64748b"}}>Earned from completed habits</div>
        </div>
        <div style={{fontSize:42}}>🪙</div>
      </div>
      {SHOP.map(item=>{
        const owned=inventory.includes(item.id);
        const eq=equipped.includes(item.id);
        const afford=karma>=item.karma;
        return(
          <div key={item.id} style={{...S.card(),padding:"14px 16px",marginBottom:10,border:`1.5px solid ${eq?"rgba(168,85,247,0.4)":owned?"rgba(251,191,36,0.2)":"rgba(255,255,255,0.07)"}`,background:eq?"rgba(168,85,247,0.1)":owned?"rgba(251,191,36,0.05)":"rgba(255,255,255,0.04)"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:30,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,0.06)",borderRadius:12}}>{item.sym}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:"#e2e8f0"}}>{item.name}</div>
                <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{item.desc}</div>
                <div style={{fontSize:11,color:"#a78bfa",marginTop:3}}>+{item.lib}% liberation</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                {owned?(
                  <button onClick={()=>toggleEquip(item.id)} style={{...S.btn(eq?"linear-gradient(135deg,#7c3aed,#6d28d9)":"rgba(255,255,255,0.1)"),padding:"7px 14px",fontSize:11}}>
                    {eq?"Equipped ✓":"Equip"}
                  </button>
                ):(
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:afford?"#fbbf24":"#ef4444",fontFamily:"'Cinzel',serif",textAlign:"center"}}>{item.karma}🪙</div>
                    <button onClick={()=>buyItem(item)} disabled={!afford} style={{...S.btn(afford?"linear-gradient(135deg,#f59e0b,#d97706)":"rgba(255,255,255,0.05)"),padding:"7px 14px",fontSize:11,marginTop:4,opacity:afford?1:0.5,cursor:afford?"pointer":"not-allowed"}}>
                      {afford?"Buy":"Need coins"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const ReportsView=()=>{
    const days=repPeriod==="week"?7:30;
    const rdata=Array.from({length:days},(_,i)=>{
      const d=new Date(); d.setDate(d.getDate()-(days-1-i));
      const dk=d.toISOString().slice(0,10);
      const dh=habits.filter(h=>h.freq==="daily");
      const done=dh.filter(h=>!!completions[`daily:${h.id}:${dk}`]).length;
      const pct=dh.length>0?Math.round((done/dh.length)*100):0;
      const score=dh.reduce((a,h)=>a+(completions[`daily:${h.id}:${dk}`]?h.xp:0),0);
      const label=i===days-1?"Today":d.toLocaleDateString("en",{weekday:"short"});
      return{label,pct,score,done,total:dh.length};
    });
    const maxScore=Math.max(...rdata.map(r=>r.score),1);
    const totalXp=rdata.reduce((a,r)=>a+r.score,0);
    const avgPct=Math.round(rdata.reduce((a,r)=>a+r.pct,0)/rdata.length);
    const perfectDays=rdata.filter(r=>r.pct>=100).length;
    return(
      <div style={{padding:"0 16px"}}>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {["week","month"].map(p=>(
            <button key={p} onClick={()=>setRepPeriod(p)} style={{...S.btn(repPeriod===p?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(255,255,255,0.06)"),flex:1,padding:"10px"}}>
              {p==="week"?"This Week":"This Month"}
            </button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
          {[{l:"XP Earned",v:totalXp,ic:"⚡",c:"#a78bfa"},{l:"Avg Rate",v:`${avgPct}%`,ic:"📊",c:"#22c55e"},{l:"Perfect Days",v:perfectDays,ic:"🌟",c:"#fbbf24"}].map(({l,v,ic,c})=>(
            <div key={l} style={{...S.card(),textAlign:"center",padding:"14px 8px"}}>
              <div style={{fontSize:18}}>{ic}</div>
              <div style={{fontSize:20,fontWeight:900,color:c,fontFamily:"'Cinzel',serif"}}>{v}</div>
              <div style={{fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:0.4}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{...S.card(),padding:"16px 18px",marginBottom:14}}>
          <div style={{fontSize:11,color:"#a78bfa",fontWeight:700,fontFamily:"'Cinzel',serif",letterSpacing:0.8,marginBottom:14}}>✦ Daily XP Score</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:4,height:90}}>
            {rdata.map((r,i)=>{
              const h=maxScore>0?Math.max(6,(r.score/maxScore)*78):6;
              const isToday=i===rdata.length-1;
              const m=getMood(r.pct);
              return(
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  <div style={{width:"100%",height:h,borderRadius:"5px 5px 0 0",background:isToday?"linear-gradient(180deg,#a855f7,#6366f1)":m.col+"88",boxShadow:isToday?"0 0 10px #a855f766":"none",transition:"height 0.6s"}}/>
                  <span style={{fontSize:7,color:"#374151",textAlign:"center"}}>{r.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{...S.card(),padding:"16px 18px",marginBottom:14}}>
          <div style={{fontSize:11,color:"#a78bfa",fontWeight:700,fontFamily:"'Cinzel',serif",letterSpacing:0.8,marginBottom:12}}>✦ Habit Streaks</div>
          {habits.map(h=>{
            const st=streaks[h.id]||0;
            return(
              <div key={h.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <span style={{fontSize:18}}>{h.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600}}>{h.name}</div>
                  <div style={{height:5,background:"rgba(255,255,255,0.06)",borderRadius:99,marginTop:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.min(100,(st/30)*100)}%`,background:`linear-gradient(90deg,${h.color},${h.color}bb)`,borderRadius:99,transition:"width 0.6s"}}/>
                  </div>
                </div>
                <span style={{fontSize:13,fontWeight:800,color:st>0?"#f97316":"#374151",minWidth:30}}>{st}🔥</span>
              </div>
            );
          })}
        </div>
        <div style={{...S.card(),padding:"16px 18px"}}>
          <div style={{fontSize:11,color:"#a78bfa",fontWeight:700,fontFamily:"'Cinzel',serif",letterSpacing:0.8,marginBottom:12}}>✦ Day-by-Day</div>
          {[...rdata].reverse().slice(0,7).map((r,i)=>{
            const m=getMood(r.pct);
            return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <span style={{fontSize:18}}>{m.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600}}>{r.label}</div>
                  <div style={{height:5,background:"rgba(255,255,255,0.06)",borderRadius:99,marginTop:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${r.pct}%`,background:`linear-gradient(90deg,${m.col},${m.col}aa)`,borderRadius:99}}/>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:12,fontWeight:700,color:m.col}}>{r.pct}%</div>
                  <div style={{fontSize:10,color:"#374151"}}>+{r.score}XP</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const ICONS_LIST=["⭐","🧘","💪","📚","🥗","💧","🌙","🕉️","🌅","🏃","🎯","🧠","🙏","🌿","✨","🔱"];

  return(
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:#4b5563;border-radius:99px;}
        input::placeholder{color:#374151;}
        @keyframes pulse{0%,100%{opacity:0.6;transform:scale(1);}50%{opacity:1;transform:scale(1.04);}}
        @keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(10px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
        @keyframes shimmer{0%{background-position:-200% center;}100%{background-position:200% center;}}
      `}</style>

      <div style={{padding:"20px 18px 14px",background:"rgba(255,255,255,0.025)",borderBottom:"1px solid rgba(255,255,255,0.06)",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div>
            <div style={{fontSize:22,fontWeight:900,fontFamily:"'Cinzel',serif",background:"linear-gradient(90deg,#fbbf24,#a78bfa,#60a5fa)",backgroundSize:"200%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 4s linear infinite"}}>HabitQuest</div>
            <div style={{fontSize:11,color:"#475569"}}>{new Date().toLocaleDateString("en",{weekday:"long",month:"long",day:"numeric"})}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{background:"rgba(251,191,36,0.12)",border:"1px solid rgba(251,191,36,0.25)",borderRadius:10,padding:"5px 11px",display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:14}}>🪙</span>
              <span style={{fontSize:13,fontWeight:800,color:"#fbbf24",fontFamily:"'Cinzel',serif"}}>{karma}</span>
            </div>
            <div style={{background:"linear-gradient(135deg,rgba(99,102,241,0.25),rgba(168,85,247,0.25))",border:"1px solid rgba(168,85,247,0.3)",borderRadius:10,padding:"5px 11px"}}>
              <span style={{fontSize:13,fontWeight:800,color:"#a78bfa",fontFamily:"'Cinzel',serif"}}>Lv{lv}</span>
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"#fbbf24",fontWeight:700,fontFamily:"'Cinzel',serif",flexShrink:0}}>Liberation</span>
          <div style={{flex:1,height:5,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${libPct}%`,background:"linear-gradient(90deg,#f59e0b,#fbbf24)",borderRadius:99,transition:"width 0.8s"}}/>
          </div>
          <span style={{fontSize:10,color:"#fbbf24",fontWeight:700,flexShrink:0}}>{libPct}%</span>
        </div>
      </div>

      <div style={{paddingTop:16}}>
        {tab==="today"  &&<TodayView/>}
        {tab==="saint"  &&<SaintView/>}
        {tab==="shop"   &&<ShopView/>}
        {tab==="reports"&&<ReportsView/>}
      </div>

      <div style={S.nav}>
        {[{id:"today",label:"Today",ic:"🏠"},{id:"saint",label:"Saint",ic:"🕉️"},{id:"shop",label:"Shop",ic:"🛕"},{id:"reports",label:"Reports",ic:"📊"}].map(({id,label,ic})=>(
          <div key={id} onClick={()=>setTab(id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",padding:"4px 12px",color:tab===id?"#fbbf24":"#374151",transition:"color 0.2s"}}>
            <span style={{fontSize:22}}>{ic}</span>
            <span style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,fontFamily:"'Cinzel',serif"}}>{label}</span>
            {tab===id&&<div style={{width:4,height:4,borderRadius:"50%",background:"#fbbf24"}}/>}
          </div>
        ))}
      </div>

      {toast&&(
        <div style={{position:"fixed",bottom:100,left:"50%",zIndex:200,background:toast.col,color:"#fff",borderRadius:12,padding:"10px 22px",fontWeight:700,fontSize:13,whiteSpace:"nowrap",boxShadow:`0 4px 20px ${toast.col}88`,animation:"fadeUp 0.3s ease",fontFamily:"'Cinzel',serif"}}>
          {toast.msg}
        </div>
      )}

      {showAdd&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:300,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}} onClick={e=>{if(e.target===e.currentTarget)setShowAdd(false);}}>
          <div style={{background:"linear-gradient(180deg,#1a1035 0%,#0d1a2e 100%)",borderRadius:"24px 24px 0 0",padding:24,width:"100%",maxWidth:480,margin:"0 auto",border:"1px solid rgba(255,255,255,0.08)",borderBottom:"none"}}>
            <div style={{fontWeight:900,fontSize:18,fontFamily:"'Cinzel',serif",marginBottom:18,color:"#e2e8f0"}}>✦ New Habit</div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:10,color:"#64748b",fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",fontFamily:"'Cinzel',serif"}}>Name</label>
              <input style={{...S.input,marginTop:5}} value={newH.name} onChange={e=>setNewH({...newH,name:e.target.value})} placeholder="e.g. Evening prayer"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div>
                <label style={{fontSize:10,color:"#64748b",fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",fontFamily:"'Cinzel',serif"}}>Frequency</label>
                <select style={{...S.sel,marginTop:5}} value={newH.freq} onChange={e=>setNewH({...newH,freq:e.target.value})}>
                  <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:10,color:"#64748b",fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",fontFamily:"'Cinzel',serif"}}>XP Reward</label>
                <input style={{...S.input,marginTop:5}} type="number" value={newH.xp} min={5} max={100} onChange={e=>setNewH({...newH,xp:e.target.value})} placeholder="15"/>
              </div>
            </div>
            <div style={{marginBottom:18}}>
              <label style={{fontSize:10,color:"#64748b",fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",fontFamily:"'Cinzel',serif"}}>Icon</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:7}}>
                {ICONS_LIST.map(ic=>(
                  <button key={ic} onClick={()=>setNewH({...newH,icon:ic})} style={{width:38,height:38,fontSize:19,borderRadius:10,cursor:"pointer",background:newH.icon===ic?"rgba(168,85,247,0.35)":"rgba(255,255,255,0.05)",border:newH.icon===ic?"2px solid #a78bfa":"1.5px solid rgba(255,255,255,0.08)"}}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowAdd(false)} style={{...S.btn("rgba(255,255,255,0.07)"),flex:1}}>Cancel</button>
              <button onClick={addHabit} style={{...S.btn("linear-gradient(135deg,#6366f1,#8b5cf6)"),flex:2,boxShadow:"0 4px 20px rgba(99,102,241,0.35)"}}>Add Habit ✦</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
