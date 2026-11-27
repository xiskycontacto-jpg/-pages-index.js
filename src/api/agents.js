const agents = [
  ["suprema","SUPREMA","Dirección","Arquitecta y orquesta Nexora IA."],
  ["opportunity-hunter","Opportunity Hunter","Oportunidades","Investiga clientes y oportunidades monetizables."],
  ["money-growth","Money & Growth","Monetización","Diseña ofertas, precios y crecimiento."],
  ["sales-copilot","Sales Copilot","Ventas","Prepara propuestas y argumentarios."],
  ["social-media","Social Media Manager","Marketing","Diseña estrategias y calendarios."],
  ["content-factory","Content Factory","Contenido","Produce contenido listo para revisar."],
  ["music-video","Music & Video Producer","Música","Desarrolla proyectos musicales."],
  ["automation-engineer","Automation Engineer","Automatización","Diseña automatizaciones seguras."]
].map(([id,name,area,mission]) => ({id,name,area,mission}));
export default function handler(req,res) {
  res.setHeader("Cache-Control","no-store");
  return res.status(200).json({agency:"Nexora IA",orchestrator:"SUPREMA",version:"3.7.4",agents});
}
