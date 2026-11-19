"use client";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
export function PasswordResetRequestForm(){
 const [email,setEmail]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setMessage("");
  try{const result=await authClient.requestPasswordReset({email:email.trim(),redirectTo:"/reset-password"});if(result.error)throw new Error(result.error.message);setMessage("If an account exists for that address, a password reset link will be sent.");}
  catch(error){setMessage(error instanceof Error?error.message:"Unable to request a reset link.");}
  finally{setBusy(false);}
 }
 return <form onSubmit={submit} className="mt-8 space-y-5">
  <label className="block text-sm text-zinc-300">Email address<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-white outline-none focus:border-lime-300"/></label>
  <button disabled={busy} className="w-full rounded-full bg-lime-300 px-6 py-3.5 font-semibold text-black disabled:opacity-50">{busy?"Sending...":"Send reset link"}</button>
  {message&&<p role="status" className="text-sm text-zinc-300">{message}</p>}
  <p className="text-center text-sm text-zinc-400"><Link href="/sign-in" className="text-lime-200">Back to sign in</Link></p>
 </form>;
}