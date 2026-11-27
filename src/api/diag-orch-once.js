import orchestrate from "./orchestrate.js";
export default async function handler(req,res) {
  if(req.method!=="GET" || req.query?.key!=="nexora-orch-check-2026-11-27-9d8c7b6a5e4f3a2b") return res.status(404).json({ok:false});
  const fakeRes={code:200,status(n){this.code=n;return this;},json(body){return res.status(this.code).json(body);}};
  return orchestrate({method:"POST",body:{task:"PRUEBA INTERNA DE COORDINACIÓN NEXORA. Analiza brevemente cómo validar una agencia de IA antes de aceptar clientes. Devuelve tres criterios y una recomendación. No realices acciones externas ni inventes datos."}},fakeRes);
}
