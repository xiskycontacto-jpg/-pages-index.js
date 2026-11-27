import { ask, executeAgent, ROLES } from "./run.js";
import { readMemory, writeMemory } from "../lib/memory.js";
export const config = { maxDuration: 300 };
const SPECIALISTS = Object.keys(ROLES).filter(x=>x!=="suprema");
function parsePlan(raw) {
  const cleaned=String(raw||"").replace(/```(?:json)?/gi,"").replace(/```/g,"").trim();
  const start=cleaned.indexOf("{");
  if(start<0) throw new Error("SUPREMA no devolvió un plan JSON válido.");
  let depth=0, quoted=false, escaped=false, end=-1;
  for(let i=start;i<cleaned.length;i++) {
    const ch=cleaned[i];
    if(quoted) { if(escaped) escaped=false; else if(ch==="\\") escaped=true; else if(ch==='"') quoted=false; continue; }
    if(ch==='"') quoted=true;
    else if(ch==="{") depth++;
    else if(ch==="}" && --depth===0) { end=i+1; break; }
  }
  if(end<0) throw new Error("El plan JSON de SUPREMA está incompleto.");
  let parsed;
  try { parsed=JSON.parse(cleaned.slice(start,end)); } catch { throw new Error("SUPREMA devolvió un JSON de plan inválido."); }
  if(!Array.isArray(parsed.agents)) throw new Error("El plan no contiene una lista de agentes.");
  const chosen=[...new Set(parsed.agents)].filter(x=>SPECIALISTS.includes(x)).slice(0,3);
  if(!chosen.length) throw new Error("SUPREMA no seleccionó ningún especialista válido.");
  return {agents:chosen,reason:String(parsed.reason||"Especialistas seleccionados según la tarea.")};
}
export default async function handler(req,res) {
  if(req.method!=="POST") return res.status(405).json({ok:false,error:"Método no permitido"});
  const task=String(req.body?.task||"").trim();
  if(!task) return res.status(400).json({ok:false,error:"Escribe una tarea para SUPREMA."});
  if(task.length>10000) return res.status(413).json({ok:false,error:"La tarea supera el límite de 10.000 caracteres."});
  let supremaMemory=[], memoryRead=false;
  try { supremaMemory=await readMemory("suprema",8); memoryRead=true; } catch(e) {}
  const memoryContext=supremaMemory.map(m=>"["+m.kind+"] "+m.content).join("\n").slice(0,1200);
  try {
    const planner=await ask(ROLES.suprema+" Eres también la directora de un equipo multiagente. Debes delegar trabajo real a especialistas.",
      'Analiza la misión y elige de 1 a 3 especialistas que aporten trabajo sustancial. Devuelve ÚNICAMENTE JSON válido con esta forma: {"agents":["opportunity-hunter","money-growth"],"reason":"motivo breve"}. IDs permitidos: '+SPECIALISTS.join(", ")+'. No incluyas suprema. Misión: '+task,
      memoryContext,500);
    const plan=parsePlan(planner.answer);
    const settled=await Promise.allSettled(plan.agents.map(async agent=>{
      const delegated="MISIÓN DELEGADA POR SUPREMA. Objetivo principal: "+task+"\nTu responsabilidad: aporta tu análisis especializado, concreto y accionable. No repitas el trabajo de otros agentes. Separa hechos, hipótesis y validaciones pendientes.";
      return await executeAgent(agent,delegated);
    }));
    const results=settled.map((item,i)=>item.status==="fulfilled"?item.value:{ok:false,agent:plan.agents[i],error:item.reason?.message||"Error desconocido"});
    const successful=results.filter(r=>r.ok);
    if(!successful.length) throw new Error("Todos los especialistas fallaron: "+results.map(r=>r.agent+": "+r.error).join(" | "));
    const failures=results.filter(r=>!r.ok).map(r=>r.agent+": "+r.error).join("\n");
    const synthesisInput=successful.map(r=>"ESPECIALISTA "+r.agent+" ("+r.provider+"/"+r.model+"):\n"+String(r.answer||"").slice(0,2200)).join("\n\n---\n\n");
    const final=await ask(ROLES.suprema+" Eres la directora de la agencia y sintetizas exclusivamente el trabajo delegado que recibes. No describas el estado de NEXORA, su infraestructura, activos, clientes, herramientas o historial salvo que esos datos estén explícitamente en la misión o en los resultados. No inventes limitaciones ni afirmes que no hay activos externos. No presentes briefs como si fueran trabajo ejecutado. Señala contradicciones, riesgos, supuestos y validaciones pendientes. Distingue claramente hechos aportados por especialistas de hipótesis.",
      "MISIÓN ORIGINAL:\n"+task+"\n\nPLAN DE DELEGACIÓN:\n"+plan.reason+"\n\nRESULTADOS REALES DE LOS ESPECIALISTAS (solo estos trabajos se han ejecutado):\n"+synthesisInput+(failures?"\n\nESPECIALISTAS QUE FALLARON:\n"+failures:"")+"\n\nRedacta una síntesis ejecutiva que responda a la misión original. Usa únicamente información respaldada por la misión o los resultados recibidos. No añadas un diagnóstico genérico de la agencia. Si faltan datos, identifícalos como pendientes de validar.",
      memoryContext,900);
    let memorySaved=false;
    try { await writeMemory("suprema","orchestration","Misión: "+task.slice(0,1000)+"\nAgentes: "+plan.agents.join(", ")+"\nSíntesis: "+final.answer.slice(0,1500),{delegated:plan.agents,provider:final.provider}); memorySaved=true; } catch(e) {}
    return res.status(200).json({ok:true,agent:"suprema",answer:final.answer,provider:final.provider,model:final.model,delegation:{reason:plan.reason,agents:results.map(r=>({agent:r.agent,ok:r.ok,provider:r.provider,model:r.model,error:r.error,memory_read:r.memory_read,memory_saved:r.memory_saved,answer:r.answer}))},memory_read:memoryRead,memory_saved:memorySaved});
  } catch(e) { return res.status(503).json({ok:false,error:e.message,agent:"suprema",memory_read:memoryRead}); }
}
