import { ensureMemory } from "../lib/memory.js";
export default async function handler(req,res) {
  let provider="none", model=null, llm=false, memory=false, llm_error=null, memory_error=null, imageOk=false, imageError=null;
  const g=process.env.GROQ_API_KEY, o=process.env.OPENROUTER_API_KEY;
  if(g) {
    provider="Groq";
    model=process.env.GROQ_MODEL||"openai/gpt-oss-120b";
    try { const r=await fetch("https://api.groq.com/openai/v1/models",{headers:{Authorization:"Bearer "+g},signal:AbortSignal.timeout(8000)}); llm=r.ok; if(!r.ok) llm_error="Groq HTTP "+r.status; }
    catch(e){llm_error=e.message;}
  }
  if(!llm&&o) {
    provider="OpenRouter"; model=process.env.OPENROUTER_MODEL||"openrouter/free";
    try { const r=await fetch("https://openrouter.ai/api/v1/models",{headers:{Authorization:"Bearer "+o},signal:AbortSignal.timeout(8000)}); llm=r.ok; if(!r.ok) llm_error="OpenRouter HTTP "+r.status; }
    catch(e){llm_error=e.message;}
  }
  try { const db=await ensureMemory(); await db`SELECT 1 AS health_check`; memory=true; } catch(e) { memory_error=e.message; }
  const research=!!process.env.FIRECRAWL_API_KEY;
  if(process.env.CLOUDFLARE_API_TOKEN&&process.env.CLOUDFLARE_ACCOUNT_ID) {
    try {
      const u="https://api.cloudflare.com/client/v4/accounts/"+process.env.CLOUDFLARE_ACCOUNT_ID+"/ai/models/search?search=flux-1-schnell&per_page=1";
      const r=await fetch(u,{headers:{Authorization:"Bearer "+process.env.CLOUDFLARE_API_TOKEN},signal:AbortSignal.timeout(8000)});
      const d=await r.json().catch(()=>({}));
      imageOk=r.ok&&d.success!==false;
      if(!imageOk) imageError=(d.errors||[]).map(x=>x.message||x.code).join("; ")||"Cloudflare HTTP "+r.status;
    } catch(e) { imageError=e.message; }
  } else imageError="Faltan CLOUDFLARE_API_TOKEN o CLOUDFLARE_ACCOUNT_ID.";
  const status=llm&&memory?"operational":"degraded";
  return res.status(200).json({status,version:"3.7.4",llm_connected:llm,provider,model,llm_error,memory_connected:memory,memory_error,firecrawl_connected:research,research_configured:research,image_generation_configured:imageOk,image_generation_error:imageError});
}
