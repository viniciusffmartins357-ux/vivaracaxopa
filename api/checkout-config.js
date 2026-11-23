import { liveEnabled,shippingRates,reply } from "../lib/life-payments.js";
export default function handler(req,res) {
  if(req.method!=="GET")return reply(res,405,{error:"method_not_allowed"});
  return reply(res,200,{
    enabled:liveEnabled(),
    merchantName:"Life Anéis",
    legalName:liveEnabled()?process.env.MERCHANT_LEGAL_NAME:"",
    shippingCents:shippingRates(),
    freeShippingFromCents:29900
  });
}
