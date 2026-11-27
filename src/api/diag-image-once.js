import imageHandler from "./image.js";
export default async function handler(req,res) {
  if(req.method!=="GET" || req.query?.key!=="nexora-image-check-2026-11-27-7b6a5d4c3e2f1a9b") return res.status(404).json({ok:false});
  const fakeRes={code:200,body:null,status(n){this.code=n;return this;},json(body){this.body=body;return this;}};
  await imageHandler({method:"POST",body:{prompt:"A clean minimal abstract blue and silver geometric emblem for a fictional technology agency, centered, premium corporate visual, no text."}},fakeRes);
  const body=fakeRes.body||{};
  return res.status(fakeRes.code).json({ok:!!body.ok,image_received:typeof body.image==="string",image_characters:body.image?.length||0,error:body.error||null});
}
