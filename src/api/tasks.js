import { listTaskRuns } from "../lib/memory.js";

export default async function handler(req,res) {
  if(req.method!=="GET") return res.status(405).json({ok:false,error:"Método no permitido"});
  try {
    const runs=await listTaskRuns(req.query?.limit);
    return res.status(200).json({ok:true,runs});
  } catch(e) {
    return res.status(503).json({ok:false,error:e.message,runs:[]});
  }
}
