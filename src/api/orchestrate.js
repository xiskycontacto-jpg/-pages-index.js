import { ask, executeAgent, ROLES } from "./run.js";
import { readMemory, writeMemory } from "../lib/memory.js";
export const config = { maxDuration: 300 };
const SPECIALISTS = Object.keys(ROLES).filter(x=>x!=="suprema");
function parsePlan(raw) {
  const cleaned=raw.replace(/```(?:json)?/gi,"").replace(/```/g,"").trim();
  const match=cleaned.match(/\{[\s\S]*\}/);
  if(!match) throw new Error("SUPREMA no devolvió un plan JSON válido.");
  const parsed=JSON.parse(match[0]);
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
  const memoryContext=supremaMemory.map(m=>"["+m.kind+"] "+m.content).join("\n");
  try {
    const planner=await ask(ROLES.suprema+" Eres también la directora de un equipo multiagente. Debes delegar trabajo real a especialistas.", 
      'Analiza la misión y elige de 1 a 3 especialistas que aporten trabajo sustancial. Devuelve ÚNICAMENTE JSON válido con esta forma: {"agents":["opportunity-hunter","money-growth"],"reason":"motivo breve"}. IDs permitidos: '+SPECIALISTS.join(", ")+'. No incluyas suprema. Misión: '+task,
      memoryContext,500);
    const plan=parsePlan(planner.answer);
    const results=await Promise.all(plan.agents.map(async agent=>{
      const delegated="MISIÓN DELEGADA POR SUPREMA. Objetivo principal: "+task+"\nTu responsabilidad: aporta tu análisis especializado, concreto y accionable. No repitas el trabajo de otros agentes. Separa hechos, hipótesis y validaciones pendientes.";
      return await executeAgent(agent,delegated);
    }));
    const synthesisInput=results.map(r=>"ESPECIALISTA "+r.agent+" ("+r.provider+"/"+r.model+"):\n"+r.answer).join("\n\n---\n\n");
    const final=await ask(ROLES.suprema+" Integra resultados de especialistas. Señala contradicciones, riesgos, decisión recomendada y próximos pasos. No afirmes acciones que no se hayan ejecutado.", 
      "MISIÓN ORIGINAL:\n"+task+"\n\nPLAN DE DELEGACIÓN:\n"+plan.reason+"\n\nRESULTADOS REALES DE LOS ESPECIALISTAS:\n"+synthesisInput+"\n\nEntrega una respuesta única, ejecutiva y accionable.",
      memoryContext,1800);
    let memorySaved=false;
    try { await writeMemory("suprema","orchestration","Misión: "+task.slice(0,1000)+"\nAgentes: "+plan.agents.join(", ")+"\nSíntesis: "+final.answer.slice(0,1500),{delegated:plan.agents,provider:final.provider}); memorySaved=true; } catch(e) {}
    return res.status(200).json({ok:true,agent:"suprema",answer:final.answer,provider:final.provider,model:final.model,delegation:{reason:plan.reason,agents:results.map(r=>({agent:r.agent,ok:r.ok,provider:r.provider,model:r.model,memory_read:r.memory_read,memory_saved:r.memory_saved,answer:r.answer}))},memory_read:memoryRead,memory_saved:memorySaved});
  } catch(e) { return res.status(503).json({ok:false,error:e.message,agent:"suprema",memory_read:memoryRead}); }
}
