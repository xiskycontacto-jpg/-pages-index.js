export const config = { maxDuration: 180 };
export default async function handler(req,res) {
  if(req.method!=="POST") return res.status(405).json({error:"Método no permitido"});
  const prompt=String(req.body?.prompt||"").trim();
  if(!prompt) return res.status(400).json({error:"Escribe una descripción de imagen."});
  if(prompt.length>1800) return res.status(413).json({error:"El prompt supera 1.800 caracteres."});
  const token=process.env.CLOUDFLARE_API_TOKEN;
  const account=process.env.CLOUDFLARE_ACCOUNT_ID;
  if(!token||!account) return res.status(503).json({error:"Faltan CLOUDFLARE_API_TOKEN y/o CLOUDFLARE_ACCOUNT_ID en Vercel."});
  try {
    const url="https://api.cloudflare.com/client/v4/accounts/"+account+"/ai/run/@cf/black-forest-labs/flux-1-schnell";
    const r=await fetch(url,{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({prompt,steps:4}),signal:AbortSignal.timeout(150000)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok||data.success===false) { const detail=(data.errors||[]).map(x=>x.message||x.code).join("; ")||"HTTP "+r.status; const auth=(r.status===401||r.status===403)?"Token Cloudflare rechazado. CLOUDFLARE_API_TOKEN debe ser un API Token válido con permisos Workers AI Read o Workers AI Write y CLOUDFLARE_ACCOUNT_ID debe pertenecer a esa cuenta. ":""; return res.status(502).json({error:auth+"Cloudflare AI: "+detail}); }
    const image=data.result?.image;
    if(typeof image!=="string") return res.status(502).json({error:"Cloudflare no devolvió una imagen válida."});
    return res.status(200).json({ok:true,image:"data:image/png;base64,"+image});
  } catch(e) { return res.status(502).json({error:e.message}); }
}
