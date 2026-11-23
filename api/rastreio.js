import {lookupPayment,validReference,reply} from "../lib/life-payments.js";
export default async function handler(req,res){
  if(req.method!=="POST")return reply(res,405,{error:"method_not_allowed"});
  const orderCode=String(req.body?.token||"").trim().toUpperCase();
  if(!validReference(orderCode))return reply(res,400,{error:"invalid_order_code"});
  try{
    const payment=await lookupPayment(orderCode);
    return reply(res,200,{ok:true,orderCode,
      paymentStatus:payment.status,shippingStatus:"not_available",trackingCode:null,
      message:payment.status==="approved"?"Pagamento confirmado. Código de transporte ainda não atribuído.":"Pagamento não confirmado."});
  }catch{
    return reply(res,503,{error:"payment_lookup_unavailable"});
  }
}
