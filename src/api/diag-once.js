import run from "./run.js";

export default async function handler(req, res) {
  if (req.method !== "GET" || req.query?.key !== "nexora-one-shot-7f3c91a84e2d6b5c") {
    return res.status(404).json({ ok: false });
  }
  const task = "PRUEBA REAL DE FUNCIONAMIENTO. Responde exactamente empezando por SUPREMA OPERATIVA y confirma en una frase que has recibido y procesado esta misión. No afirmes acciones externas.";
  const fakeRes = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { return res.status(this.statusCode).json(body); }
  };
  return run({ method: "POST", body: { agent: "suprema", task } }, fakeRes);
}
