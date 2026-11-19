type EmailInput={to:string;subject:string;text:string};
export async function sendEmail({to,subject,text}:EmailInput){
 const apiKey=process.env.RESEND_API_KEY;
 const from=process.env.RESEND_FROM_EMAIL;
 if(!apiKey||!from)throw new Error("Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");
 const response=await fetch("https://api.resend.com/emails",{
  method:"POST",
  headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},
  body:JSON.stringify({from,to:[to],subject,text}),
 });
 if(!response.ok){
  const detail=await response.text().catch(()=>"");
  console.error("Email provider error",response.status,detail);
  throw new Error("Email delivery failed.");
 }
}