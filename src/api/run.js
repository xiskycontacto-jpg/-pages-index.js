import { readMemory, writeMemory } from "../lib/memory.js";
export const config = { maxDuration: 300 };

const ROLES = {
  suprema: "Eres SUPREMA, directora y arquitecta de Nexora IA. Coordina especialistas, prioriza rentabilidad, evidencia y riesgo. Distingue hechos, inferencias e hipótesis. Da un plan ejecutable.",
  "opportunity-hunter": "Eres Opportunity Hunter. Investiga clientes, problemas, demanda, competencia y oportunidades monetizables. Usa las fuentes web aportadas; no inventes evidencias ni cifras. Distingue hechos, inferencias e hipótesis.",
  "money-growth": "Eres Money & Growth. Diseña oferta, precios, costes, margen, punto de equilibrio y plan comercial. Declara supuestos y termina con GO, TEST o NO-GO.",
  "sales-copilot": "Eres Sales Copilot. Crea propuestas comerciales, argumentarios, objeciones y próximos pasos concretos.",
  "social-media": "Eres Social Media Manager. Diseña estrategia, calendario, formatos, distribución y métricas.",
  "content-factory": "Eres Content Factory. Produce contenido original listo para revisión y publicación.",
  "music-video": "Eres Music & Video Producer. Desarrolla concepto, producción, presupuesto y lanzamiento musical.",
  "automation-engineer": "Eres Automation Engineer. Diseña automatizaciones seguras, verificables y con autorización para acciones externas."
};

async function ask(system, task, context) {
  const providers = [];
  if (process.env.GROQ_API_KEY) providers.push({name:"Groq",key:process.env.GROQ_API_KEY,url:"https://api.groq.com/openai/v1/chat/completions",model:process.env.GROQ_MODEL||"llama-3.3-70b-versatile"});
  if (process.env.OPENROUTER_API_KEY) providers.push({name:"OpenRouter",key:process.env.OPENROUTER_API_KEY,url:"https://openrouter.ai/api/v1/chat/completions",model:process.env.OPENROUTER_MODEL||"openrouter/free"});
  if (!providers.length) throw new Error("No hay proveedor LLM configurado. Añade GROQ_API_KEY u OPENROUTER_API_KEY en Vercel.");
  let last = "No se pudo conectar con ningún proveedor.";
  for (const p of providers) {
    try {
      const r = await fetch(p.url,{method:"POST",headers:{Authorization:"Bearer "+p.key,"Content-Type":"application/json","HTTP-Referer":"https://agencia-ia-agent-0.vercel.app","X-Title":"Nexora IA"},body:JSON.stringify({model:p.model,messages:[{role:"system",content:system+(context?"\n\nMEMORIA RECIENTE:\n"+context:"")},{role:"user",content:task}],temperature:0.55,max_tokens:1800}),signal:AbortSignal.timeout(120000)});
      const data = await r.json().catch(()=>({}));
      if (!r.ok) { last=p.name+" HTTP "+r.status+": "+(data.error?.message||"error del proveedor"); continue; }
      const answer = data.choices?.[0]?.message?.content;
      if (!answer) { last=p.name+" no devolvió contenido."; continue; }
      return {answer,provider:p.name,model:p.model};
    } catch(e) { last=p.name+": "+e.message; }
  }
  throw new Error(last);
}

async function researchWeb(task) {
  if (!process.env.FIRECRAWL_API_KEY) return {sources:[],context:"Investigación web no disponible: falta FIRECRAWL_API_KEY."};
  try {
    const r=await fetch("https://api.firecrawl.dev/v2/search",{method:"POST",headers:{Authorization:"Bearer "+process.env.FIRECRAWL_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({query:task+" Spain market customers competitors pricing",limit:6,sources:[{type:"web"}],country:"ES",location:"Spain",scrapeOptions:{formats:[{type:"markdown"}],onlyMainContent:true,maxAge:0,timeout:30000}}),signal:AbortSignal.timeout(45000)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error("Firecrawl HTTP "+r.status);
    const rows=data.data?.web||data.web||data.data||[];
    const sources=(Array.isArray(rows)?rows:[]).slice(0,6).map(x=>({title:x.title||"Fuente web",url:x.url||"",description:x.description||x.snippet||x.markdown?.slice(0,900)||""})).filter(x=>x.url);
    const context=sources.length?sources.map((s,i)=>"["+ (i+1)+"] "+s.title+"\nURL: "+s.url+"\n"+s.description).join("\n\n"):"La búsqueda web no devolvió resultados útiles.";
    return {sources,context};
  } catch(e) {
    return {sources:[],context:"La búsqueda web falló: "+e.message+". No presentes afirmaciones de mercado como verificadas."};
  }
}

async function getContext(agent) {
  try { return (await readMemory(agent,8)).map(m=>"["+m.agent+"/"+m.kind+"] "+m.content).join("\n"); }
  catch { return ""; }
}

async function save(agent, task, answer, provider, model) {
  try {
    await writeMemory(agent,"interaction","Tarea: "+task.slice(0,1000)+"\nRespuesta: "+answer.slice(0,1600),{provider,model});
    return true;
  } catch { return false; }
}

async function runOrchestration(task) {
  const research=await researchWeb(task);
  const pipeline = [
    {agent:"opportunity-hunter",label:"Opportunity Hunter",instruction:"Investiga y define la oportunidad. Usa los resultados web, enlaza las fuentes relevantes y separa evidencia comprobable, hipótesis y datos pendientes."},
    {agent:"money-growth",label:"Money & Growth",instruction:"Evalúa la oportunidad anterior: cliente, oferta, precio, costes, margen, captación, riesgos y prueba mínima. No inventes datos."},
    {agent:"sales-copilot",label:"Sales Copilot",instruction:"Convierte la oportunidad y su evaluación económica en una propuesta comercial inicial, mensaje de contacto y siguiente paso medible."}
  ];
  const stages = [];
  let previous = "";
  for (const step of pipeline) {
    const context = await getContext(step.agent);
    const result = await ask(ROLES[step.agent],step.instruction+"\n\nMISIÓN ORIGINAL:\n"+task+"\n\nFUENTES WEB RECIENTES:\n"+research.context+"\n\nRESULTADO DEL ESPECIALISTA ANTERIOR:\n"+(previous||"Primera fase: analiza la misión original."),context);
    stages.push({agent:step.agent,name:step.label,answer:result.answer,provider:result.provider,model:result.model});
    await save(step.agent,task,result.answer,result.provider,result.model);
    previous = result.answer;
  }
  const summary = stages.map(s=>"## "+s.name+"\n"+s.answer).join("\n\n");
  const final = await ask(ROLES.suprema,"Integra el trabajo real de los tres especialistas. No repitas sin criterio. Entrega: decisión, oportunidad concreta, evidencia frente a hipótesis, modelo económico con supuestos, propuesta comercial, plan de 48 horas, riesgos y criterio para continuar o parar. Incluye las fuentes web aportadas y advierte si no bastan para validar la demanda.\n\nMISIÓN:\n"+task+"\n\nFUENTES WEB:\n"+research.context+"\n\nINFORMES DE LOS ESPECIALISTAS:\n"+summary,await getContext("suprema"));
  const memorySaved = await save("suprema",task,final.answer,final.provider,final.model);
  return {ok:true,agent:"suprema",answer:final.answer,provider:final.provider,model:final.model,memory_saved:memorySaved,orchestrated:true,stages,research_sources:research.sources};
}

export default async function handler(req,res) {
  if (req.method!=="POST") return res.status(405).json({error:"Método no permitido"});
  const body=req.body||{};
  const task=String(body.task||"").trim();
  const agent=String(body.agent||"suprema");
  if (!task) return res.status(400).json({error:"Escribe una tarea para el agente."});
  if (task.length>12000) return res.status(413).json({error:"La tarea supera el límite de 12.000 caracteres."});
  try {
    if (agent==="suprema") return res.status(200).json(await runOrchestration(task));
    const selected=ROLES[agent]?agent:"suprema";
    const result=await ask(ROLES[selected],task,await getContext(selected));
    const memorySaved=await save(selected,task,result.answer,result.provider,result.model);
    return res.status(200).json({ok:true,agent:selected,answer:result.answer,provider:result.provider,model:result.model,memory_saved:memorySaved,orchestrated:false});
  } catch(e) {
    return res.status(503).json({ok:false,error:e.message,agent});
  }
}
