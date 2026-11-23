import { orderByReference,secureWebhookToken,refreshPayment,reply } from "../lib/life-payments.js";
export default async function handler(req,res) {
  if(req.method!=="POST")return reply(res,405,{error:"method_not_allowed"});
  if(!secureWebhookToken(req.query?.token))return reply(res,401,{error:"unauthorized"});
  const reference=String(req.body?.external_id||req.body?.store_reference||"");
  if(!/^[0-9a-f-]{36}$/i.test(reference))return reply(res,400,{error:"invalid_reference"});
  try {
    const order=await orderByReference(reference);
    if(!order)return reply(res,404,{error:"order_not_found"});
    // O conteúdo do webhook não aprova pagamentos: confirmamos pela API autenticada.
    const checked=await refreshPayment(order);
    return reply(res,200,{ok:true,status:checked.status});
  }catch{
    // 503 permite que a gateway tente notificar novamente.
    return reply(res,503,{error:"retry_later"});
  }
}
