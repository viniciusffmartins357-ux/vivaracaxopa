import { orderByAccessToken,refreshPayment,reply } from "../lib/life-payments.js";
export default async function handler(req,res) {
  if(req.method!=="POST")return reply(res,405,{error:"method_not_allowed"});
  const token=String(req.body?.token||"");
  if(!/^[0-9a-f]{48}$/i.test(token))return reply(res,400,{error:"invalid_token"});
  try{
    let order=await orderByAccessToken(token);
    if(!order)return reply(res,404,{error:"order_not_found"});
    if(order.status==="pending" || order.status==="processing")
      try{order=await refreshPayment(order);}catch{}
    return reply(res,200,{
      ok:true,paymentStatus:order.status,shippingStatus:order.shipping_status||"preparing",
      trackingCode:order.status==="approved" && ["shipped","delivered"].includes(order.shipping_status) ? order.tracking_code||null : null
    });
  }catch{
    return reply(res,503,{error:"temporarily_unavailable"});
  }
}
