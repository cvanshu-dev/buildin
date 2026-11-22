"use client";
import { useState } from "react";
export function ContactForm(){
 const [status,setStatus]=useState("");
 const [busy,setBusy]=useState(false);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setStatus("");
  const form=event.currentTarget;const values=Object.fromEntries(new FormData(form).entries());
  try{const response=await fetch("/api/contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)});const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to send your message.");form.reset();setStatus("Thanks. Your message has been sent.");}
  catch(error){setStatus(error instanceof Error?error.message:"Unable to send your message.");}
  finally{setBusy(false);}
 }
 const input="mt-2 w-full rounded-xl border border-slate-200 bg-zinc-900 px-4 py-3 text-slate-900 outline-none focus:border-lime-300";
 return <form onSubmit={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-7">
  <label className="block text-sm text-slate-700">Your name<input name="name" required maxLength={100} className={input}/></label>
  <label className="block text-sm text-slate-700">Email<input name="email" type="email" required maxLength={254} className={input}/></label>
  <label className="block text-sm text-slate-700">I&apos;m contacting about<select name="topic" className={input}><option>Managed campaign</option><option>Brand account</option><option>Creator account</option><option>General enquiry</option></select></label>
  <label className="block text-sm text-slate-700">Message<textarea name="message" required minLength={10} maxLength={4000} rows={5} className={input}/></label>
  <button disabled={busy} className="w-full rounded-full bg-blue-600 px-6 py-3.5 font-semibold text-white disabled:opacity-50">{busy?"Sending...":"Send enquiry"}</button>
  {status&&<p role="status" className="text-sm text-slate-700">{status}</p>}
 </form>;
}