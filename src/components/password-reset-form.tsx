"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
export function PasswordResetForm(){
 const params=useSearchParams();const token=params.get("token");const router=useRouter();
 const [password,setPassword]=useState("");const [confirm,setConfirm]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setMessage("");
  if(!token){setMessage("This reset link is missing or invalid. Request a new one.");return;}
  if(password!==confirm){setMessage("The passwords do not match.");return;}
  setBusy(true);
  try{const result=await authClient.resetPassword({newPassword:password,token});if(result.error)throw new Error(result.error.message);setMessage("Your password has been updated. Redirecting to sign in.");setTimeout(()=>router.replace("/sign-in"),1200);}
  catch(error){setMessage(error instanceof Error?error.message:"Unable to reset password.");}
  finally{setBusy(false);}
 }
 return <form onSubmit={submit} className="mt-8 space-y-5">
  <label className="block text-sm text-zinc-300">New password<input type="password" required minLength={10} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-white outline-none focus:border-lime-300"/></label>
  <label className="block text-sm text-zinc-300">Confirm password<input type="password" required minLength={10} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-white outline-none focus:border-lime-300"/></label>
  <button disabled={busy||!token} className="w-full rounded-full bg-lime-300 px-6 py-3.5 font-semibold text-black disabled:opacity-50">{busy?"Updating...":"Update password"}</button>
  {message&&<p role="status" className="text-sm text-zinc-300">{message}</p>}
 </form>;
}