import { readMemory, writeMemory } from "../lib/memory.js";
export const config = { maxDuration: 300 };
export const ROLES = {
  suprema: "Eres SUPREMA, directora y arquitecta de Nexora IA. Coordina especialistas, prioriza rentabilidad, evidencia y riesgo. Distingue hechos, inferencias e hipótesis. Da un plan ejecutable.",
  "opportunity-hunter": "Eres Opportunity Hunter. Identifica clientes, problemas, demanda, competencia, soluciones y oportunidades monetizables. No inventes evidencias ni cifras; indica qué falta validar.",
  "money-growth": "Eres Money & Growth. Diseña oferta, precios, costes, margen, punto de equilibrio y plan comercial. Declara supuestos y termina con GO, TEST o NO-GO.",
  "sales-copilot": "Eres Sales Copilot. Crea propuestas comerciales, argumentarios, objeciones y próximos pasos concretos.",
  "social-media": "Eres Social Media Manager. Diseña estrategia, calendario, formatos, distribución y métricas.",
  "content-factory": "Eres Content Factory. Produce contenido original listo para revisión y publicación.",
  "music-video": "Eres Music & Video Producer. Desarrolla concepto, producción, presupuesto y lanzamiento musical.",
  "automation-engineer": "Eres Automation Engineer. Diseña automatizaciones seguras, verificables y con autorización para acciones externas."
};
export async function ask(system, task, context, maxTokens=1800) {
  const providers=[];
  if(process.env.GROQ_API_KEY) providers.push({name:"Groq",key:process.env.GROQ_API_KEY,url:"https://api.groq.com/openai/v1/chat/completions",model:process.env.GROQ_MODEL||"llama-3.3-70b-versatile"});
  if(process.env.OPENROUTER_API_KEY) providers.push({name:"OpenRouter",key:process.env.OPENROUTER_API_KEY,url:"https://openrouter.ai/api/v1/chat/completions",model:process.env.OPENROUTER_MODEL||"openrouter/free"});
  if(!providers.length) throw new Error("No hay proveedor LLM configurado.");
  let last="No se pudo conectar con ningún proveedor."; const failures=[];
  for(const p of providers) {
    try {
      const r=await fetch(p.url,{method:"POST",headers:{Authorization:"Bearer "+p.key,"Content-Type":"application/json","HTTP-Referer":"https://agencia-ia-agent-0.vercel.app","X-Title":"Nexora IA"},body:JSON.stringify({model:p.model,messages:[{role:"system",content:system+(context?"\\n\\nMEMORIA RECIENTE:\\n"+context:"")},{role:"user",content:task}],temperature:0.45,max_tokens:maxTokens}),signal:AbortSignal.timeout(120000)});
      const data=await r.json().catch(()=>({}));
      if(!r.ok) { last=p.name+" HTTP "+r.status+": "+(data.error?.message||JSON.stringify(data).slice(0,500)); failures.push(last); continue; }
      const answer=data.choices?.[0]?.message?.content;
      if(!answer) { last=p.name+" no devolvió contenido."; continue; }
      return {answer,provider:p.name,model:p.model};
    } catch(e) { last=p.name+": "+e.message; failures.push(last); }
  }
  throw new Error(failures.length?failures.join(" | "):last);
}
export async function executeAgent(agent, task) {
  const role=ROLES[agent];
  if(!role || agent==="suprema") throw new Error("Agente especialista no válido: "+agent);
  let memories=[], memoryRead=false;
  try { memories=await readMemory(agent,8); memoryRead=true; } catch(e) {}
  const context=memories.map(m=>"["+m.agent+"/"+m.kind+"] "+m.content).join("\\n");
  const result=await ask(role,task,context);
  let memorySaved=false;
  try { await writeMemory(agent,"interaction","Tarea: "+task.slice(0,1200)+"\\nRespuesta: "+result.answer.slice(0,1800),{provider:result.provider,model:result.model}); memorySaved=true; } catch(e) {}
  return {ok:true,agent,answer:result.answer,provider:result.provider,model:result.model,memory_read:memoryRead,memory_saved:memorySaved};
}
export default async function handler(req,res) {
  if(req.method!=="POST") return res.status(405).json({error:"Método no permitido"});
  const body=req.body||{}, task=String(body.task||"").trim(), agent=String(body.agent||"suprema");
  if(!task) return res.status(400).json({error:"Escribe una tarea para el agente."});
  if(task.length>12000) return res.status(413).json({error:"La tarea supera el límite de 12.000 caracteres."});
  if(agent==="suprema") return res.status(409).json({error:"Para coordinar especialistas utiliza /api/orchestrate."});
  try { return res.status(200).json(await executeAgent(agent,task)); }
  catch(e) { return res.status(503).json({ok:false,error:e.message,agent}); }
}
