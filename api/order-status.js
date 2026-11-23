import {lookupPayment,validReference,reply} from "../lib/life-payments.js";
export default async function handler(req,res){
  if(req.method!=="POST")return reply(res,405,{error:"method_not_allowed"});
  const reference=String(req.body?.reference||"");
  const token=String(req.body?.accessToken||"");
  if(!validReference(reference)||token!==reference)return reply(res,400,{error:"invalid_reference"});
  try{
    const payment=await lookupPayment(reference);
    return reply(res,200,{ok:true,reference,status:payment.status,
      amountCents:payment.amountCents,paid:payment.status==="approved",
      trackingCode:null,shippingStatus:"not_available"});
  }catch{
    return reply(res,503,{error:"payment_lookup_unavailable"});
  }
}
