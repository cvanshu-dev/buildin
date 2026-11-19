"use client";
import {useEffect,useState} from "react";
export function VerificationQueue(){
 const [items,S]=useState<any[]>([]),[msg,M]=useState("");
 async function load(){const r=await fetch("/api/verification");const d=await r.json();if(!r.ok){M(d.error||"Unable to load.");return;}S(d.requests||[]);}
 useEffect(()=>{void load();},[]);
 async function decide(id:string,decision:string){const r=await fetch("/api/verification",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,decision})});const d=await r.json();M(r.ok?"Review saved.":d.error||"Review failed.");if(r.ok)await load();}
 return <div className="mt-8 space-y-4">{msg&&<p className="text-sm text-zinc-300">{msg}</p>}{items.length===0?<p className="rounded-xl border border-white/10 p-5 text-sm text-zinc-400">No verification requests.</p>:items.map(x=><article key={x.id} className="rounded-2xl border border-white/10 p-5"><div className="flex justify-between"><div><h2 className="font-semibold">{x.applicant.name}</h2><p className="text-sm text-zinc-400">{x.applicant.email} · {x.applicant.role}</p></div><span className="text-xs text-zinc-400">{x.status}</span></div>{x.note&&<p className="mt-3 text-sm">{x.note}</p>}{x.status==="PENDING"&&<div className="mt-4 flex gap-2"><button onClick={()=>decide(x.id,"APPROVED")} className="rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black">Approve</button><button onClick={()=>decide(x.id,"REJECTED")} className="rounded-full border border-red-400/40 px-4 py-2 text-sm text-red-300">Reject</button></div>}</article>)}</div>;
}
