import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BarChart3, Check, ExternalLink, Plus, Share2, Trophy, Users, X } from 'lucide-react';

const WORDLE_URL = 'https://www.nytimes.com/games/wordle/index.html';
const SUPABASE_URL = 'https://chmnilzefoczyvckdwer.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_zAvichZ71-oyd9b30fxtxw_QEYtfDm1';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const scoreLabel = score => score === 'X' ? 'X/6' : `${score}/6`;
const scoreClass = score => score === 'X' ? 'score gray' : Number(score) <= 2 ? 'score green' : Number(score) <= 4 ? 'score yellow' : 'score gray';

export default function App() {
  const today = new Date().toISOString().slice(0,10);
  const [scores,setScores]=useState([]), [name,setName]=useState(''), [score,setScore]=useState(''), [date,setDate]=useState(today);
  const [showForm,setShowForm]=useState(false), [copied,setCopied]=useState(false), [loading,setLoading]=useState(true), [saving,setSaving]=useState(false), [error,setError]=useState('');

  async function loadScores(){
    const {data,error:e}=await supabase.from('scores').select('id,name,score,played_on,created_at').order('created_at',{ascending:true});
    if(e) setError(`Could not load the shared scoreboard: ${e.message}`);
    else { setScores((data||[]).map(r=>({id:r.id,name:r.name,score:r.score,date:r.played_on}))); setError(''); }
    setLoading(false);
  }
  useEffect(()=>{ loadScores(); const channel=supabase.channel('scores-live').on('postgres_changes',{event:'*',schema:'public',table:'scores'},loadScores).subscribe(); return()=>{supabase.removeChannel(channel)}; },[]);

  const ranked=useMemo(()=>scores.filter(s=>s.date===today).sort((a,b)=>(a.score==='X'?99:+a.score)-(b.score==='X'?99:+b.score)||a.name.localeCompare(b.name)),[scores,today]);
  const stats=useMemo(()=>{const solved=ranked.filter(s=>s.score!=='X');return{played:ranked.length,win:ranked.length?Math.round(solved.length/ranked.length*100):0,average:solved.length?(solved.reduce((n,s)=>n+Number(s.score),0)/solved.length).toFixed(1):'–'}},[ranked]);

  async function submit(e){e.preventDefault();if(!name.trim()||!score||saving)return;setSaving(true);setError('');const{error:e2}=await supabase.from('scores').insert({name:name.trim(),score:String(score),played_on:date});if(e2){setError(`Your score could not be saved: ${e2.message}`);setSaving(false);return;}await loadScores();setName('');setScore('');setDate(today);setShowForm(false);setSaving(false);}
  async function share(){const data={title:'Wordle Scoreboard',text:'Add your Wordle result to our shared leaderboard.',url:location.href};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(location.href);setCopied(true);setTimeout(()=>setCopied(false),1600)}}catch{}}

  return <div className="app">
    <header><div className="header-inner"><div className="mini-tiles"><i/><i/><i/></div><h1>Wordle Scores</h1><button className="icon-btn" onClick={share} aria-label="Share">{copied?<Check/>:<Share2/>}</button></div></header>
    <main>
      <section className="hero-card"><div className="hero"><div className="word-tiles">{'WORDLE'.split('').map((l,i)=><b key={i} className={i<3?'green':i===3?'yellow':'gray'}>{l}</b>)}</div><h2>How did everyone do?</h2><p>Play today’s puzzle, then add your result to the shared daily leaderboard.</p><a href={WORDLE_URL} target="_blank" rel="noreferrer">Play Wordle <ExternalLink size={17}/></a></div><div className="stats"><div><strong>{stats.played}</strong><span>Played</span></div><div><strong className="green-text">{stats.win}</strong><span>Win %</span></div><div><strong className="yellow-text">{stats.average}</strong><span>Avg guesses</span></div></div></section>
      {error&&!showForm&&<p className="error">{error}</p>}
      <section className="board"><div className="board-title"><div><small><BarChart3 size={15}/>Leaderboard</small><h3>Today’s scores</h3></div><span className="count"><Users size={15}/>{stats.played}</span></div><div className="list">{loading?<div className="empty">Loading shared scores…</div>:!ranked.length?<div className="empty"><Trophy/><b>No scores yet</b><span>Be the first player today.</span></div>:ranked.map((entry,index)=><div className="row" key={entry.id}><b className={index===0?'rank first':'rank'}>{index+1}</b><div><strong>{entry.name}</strong><span>{entry.date}</span></div><b className={scoreClass(entry.score)}>{scoreLabel(entry.score)}</b></div>)}</div></section>
    </main>
    <button className="add-button" onClick={()=>{setError('');setShowForm(true)}}><Plus/>Enter today’s score</button>
    {showForm&&<div className="overlay" onMouseDown={()=>setShowForm(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={()=>setShowForm(false)}><X/></button><small>Today’s Wordle</small><h2>Enter your score</h2><form onSubmit={submit}><label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" maxLength={30} required/></label><fieldset><legend>How many guesses?</legend><div className="choices">{[1,2,3,4,5,6,'X'].map(n=><button type="button" className={score===String(n)?'selected':''} key={n} onClick={()=>setScore(String(n))}>{n}</button>)}</div><p>X means the word wasn’t solved in six guesses.</p></fieldset><label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label>{error&&<p className="error">{error}</p>}<button className="save" disabled={!name.trim()||!score||saving}>{saving?'Saving…':'Save score'}</button></form></div></div>}
    {copied&&<div className="toast">Link copied</div>}
  </div>;
}
