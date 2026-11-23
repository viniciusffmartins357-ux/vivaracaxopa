import { orderByReference,hashToken,refreshPayment,reply } from "../lib/life-payments.js";
export default async function handler(req,res) {
  if(req.method!=="POST")return reply(res,405,{error:"method_not_allowed"});
  const reference=String(req.body?.reference||"");
  const token=String(req.body?.accessToken||"");
  if(!/^[0-9a-f-]{36}$/i.test(reference)||!/^[0-9a-f]{48}$/i.test(token))
    return reply(res,400,{error:"invalid_reference"});
  try{
    let order=await orderByReference(reference);
    if(!order || order.access_hash!==hashToken(token))return reply(res,404,{error:"order_not_found"});
    try{order=await refreshPayment(order);}catch{}
    return reply(res,200,{ok:true,reference,status:order.status,amountCents:order.amount_cents,
      paid:order.status==="approved",shippingStatus:order.shipping_status||"preparing",
      trackingCode:order.status==="approved"&&order.shipping_status==="shipped"?order.tracking_code:null});
  }catch{
    return reply(res,503,{error:"temporarily_unavailable"});
  }
}
