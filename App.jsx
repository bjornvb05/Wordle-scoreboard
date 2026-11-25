import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BarChart3, CalendarDays, Check, ExternalLink, Plus, Share2, Trophy, Users, X } from 'lucide-react';

const WORDLE_URL = 'https://www.nytimes.com/games/wordle/index.html';
const SUPABASE_URL = 'https://chmnilzefoczyvckdwer.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_zAvichZ71-oyd9b30fxtxw_QEYtfDm1';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function localDate(d = new Date()) {
  const copy = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 10);
}
function periodStart(period, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') { const isoDay = d.getDay() || 7; d.setDate(d.getDate() - isoDay + 1); }
  if (period === 'month') d.setDate(1);
  return localDate(d);
}
function scoreClass(v) { return v === 'X' ? 'score gray' : Number(v) <= 2 ? 'score green' : Number(v) <= 4 ? 'score yellow' : 'score gray'; }

export default function App() {
  const today = localDate();
  const [scores,setScores]=useState([]), [name,setName]=useState(''), [score,setScore]=useState(''), [date,setDate]=useState(today);
  const [period,setPeriod]=useState('day'), [showForm,setShowForm]=useState(false), [copied,setCopied]=useState(false);
  const [loading,setLoading]=useState(true), [saving,setSaving]=useState(false), [error,setError]=useState('');

  async function loadScores(){
    const {data,error:e}=await supabase.from('scores').select('id,name,score,played_on,created_at').order('created_at',{ascending:true});
    if(e) setError(`Could not load the shared scoreboard: ${e.message}`);
    else { setScores((data||[]).map(r=>({id:r.id,name:r.name,score:r.score,date:r.played_on}))); setError(''); }
    setLoading(false);
  }
  useEffect(()=>{
    loadScores();
    const channel=supabase.channel('scores-live').on('postgres_changes',{event:'*',schema:'public',table:'scores'},()=>loadScores()).subscribe();
    return()=>{supabase.removeChannel(channel)};
  },[]);

  const filtered=useMemo(()=>{
    const start=periodStart(period);
    return scores.filter(s=>period==='day' ? s.date===today : s.date>=start && s.date<=today);
  },[scores,period,today]);

  const leaderboard=useMemo(()=>{
    const map=new Map();
    filtered.forEach(entry=>{
      const key=entry.name.trim().toLocaleLowerCase();
      if(!map.has(key)) map.set(key,{name:entry.name.trim(),played:0,solved:0,total:0});
      const p=map.get(key); p.played++;
      if(entry.score!=='X'){p.solved++;p.total+=Number(entry.score);}
    });
    return [...map.values()].map(p=>({...p,average:p.solved?p.total/p.solved:99,winRate:p.played?Math.round(p.solved/p.played*100):0}))
      .sort((a,b)=>b.solved-a.solved || a.average-b.average || b.winRate-a.winRate || a.name.localeCompare(b.name));
  },[filtered]);

  const stats=useMemo(()=>{
    const solved=filtered.filter(s=>s.score!=='X');
    return {results:filtered.length,players:leaderboard.length,average:solved.length?(solved.reduce((n,s)=>n+Number(s.score),0)/solved.length).toFixed(1):'–'};
  },[filtered,leaderboard]);

  async function submit(e){
    e.preventDefault(); if(!name.trim()||!score||saving)return; setSaving(true);setError('');
    const {error:e2}=await supabase.from('scores').insert({name:name.trim(),score:String(score),played_on:date});
    if(e2){setError(`Your score could not be saved: ${e2.message}`);setSaving(false);return;}
    await loadScores(); setName('');setScore('');setDate(today);setShowForm(false);setSaving(false);
  }
  async function share(){
    const data={title:'Wordle Scoreboard',text:'Join our daily, weekly and monthly Wordle leaderboard.',url:location.href};
    try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(location.href);setCopied(true);setTimeout(()=>setCopied(false),1600)}}catch{}
  }
  const title=period==='day'?"Today’s scores":period==='week'?'This week':'This month';

  return <div className="app">
    <header><div className="header-inner"><div className="mini-tiles"><i/><i/><i/></div><h1>Wordle Scores</h1><button className="icon-btn" onClick={share} aria-label="Share">{copied?<Check/>:<Share2/>}</button></div></header>
    <main>
      <section className="hero-card"><div className="hero"><div className="word-tiles">{'WORDLE'.split('').map((l,i)=><b key={i} className={i<3?'green':i===3?'yellow':'gray'}>{l}</b>)}</div><h2>How did everyone do?</h2><p>Play today’s puzzle, then compete on daily, weekly and monthly leaderboards.</p><a href={WORDLE_URL} target="_blank" rel="noreferrer">Play Wordle <ExternalLink size={17}/></a></div><div className="stats"><div><strong>{stats.results}</strong><span>Results</span></div><div><strong className="green-text">{stats.players}</strong><span>Players</span></div><div><strong className="yellow-text">{stats.average}</strong><span>Avg guesses</span></div></div></section>

      <nav className="period-tabs" aria-label="Leaderboard period">{[['day','Daily'],['week','Weekly'],['month','Monthly']].map(([v,l])=><button key={v} className={period===v?'active':''} onClick={()=>setPeriod(v)}>{l}</button>)}</nav>
      {error&&!showForm&&<p className="error">{error}</p>}

      <section className="board"><div className="board-title"><div><small><BarChart3 size={15}/>Leaderboard</small><h3>{title}</h3></div><span className="count"><Users size={15}/>{stats.players}</span></div><div className="list">
        {loading?<div className="empty">Loading shared scores…</div>:!leaderboard.length?<div className="empty"><Trophy/><b>No scores yet</b><span>Be the first player in this period.</span></div>:leaderboard.map((p,index)=><div className="row" key={p.name.toLowerCase()}><b className={index===0?'rank first':'rank'}>{index+1}</b><div><strong>{p.name}</strong><span>{p.solved} solved · {p.played} played · {p.winRate}% wins</span></div><b className={p.average===99?'score gray':scoreClass(Math.round(p.average))}>{p.average===99?'X/6':p.average.toFixed(1)}</b></div>)}
      </div>{period!=='day'&&<p className="ranking-note"><CalendarDays size={14}/> Ranked by solved games, then lowest average guesses.</p>}</section>
    </main>
    <button className="add-button" onClick={()=>{setError('');setShowForm(true)}}><Plus/>Enter today’s score</button>
    {showForm&&<div className="overlay" onMouseDown={()=>setShowForm(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={()=>setShowForm(false)}><X/></button><small>Today’s Wordle</small><h2>Enter your score</h2><form onSubmit={submit}><label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" maxLength={30} required/></label><fieldset><legend>How many guesses?</legend><div className="choices">{[1,2,3,4,5,6,'X'].map(n=><button type="button" className={score===String(n)?'selected':''} key={n} onClick={()=>setScore(String(n))}>{n}</button>)}</div><p>X means the word wasn’t solved in six guesses.</p></fieldset><label>Date<input type="date" value={date} max={today} onChange={e=>setDate(e.target.value)} required/></label>{error&&<p className="error">{error}</p>}<button className="save" disabled={!name.trim()||!score||saving}>{saving?'Saving…':'Save score'}</button></form></div></div>}
    {copied&&<div className="toast">Link copied</div>}
  </div>;
}
