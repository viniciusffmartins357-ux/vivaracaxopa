import {lookupPayment,validReference,secureWebhookToken,reply} from "../lib/life-payments.js";
export default async function handler(req,res){
  if(req.method!=="POST")return reply(res,405,{error:"method_not_allowed"});
  if(!secureWebhookToken(req.query?.token))return reply(res,401,{error:"unauthorized"});
  const orderCode=String(req.body?.external_id||req.body?.store_reference||"");
  if(!validReference(orderCode))return reply(res,200,{ok:true,ignored:true});
  try{
    // Sem banco: não grava estados. Confere a transação com a gateway;
    // checkout e acompanhamento consultam diretamente o estado mais recente.
    const payment=await lookupPayment(orderCode);
    return reply(res,200,{ok:true,status:payment.status});
  }catch{
    return reply(res,503,{error:"retry_later"});
  }
}
