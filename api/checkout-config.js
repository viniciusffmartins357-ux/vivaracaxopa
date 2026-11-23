import { liveEnabled,shippingRates,reply,verifyMerchant } from "../lib/life-payments.js";
export default async function handler(req,res){
  if(req.method!=="GET")return reply(res,405,{error:"method_not_allowed"});
  let enabled=false;
  if(liveEnabled()){
    try{await verifyMerchant();enabled=true;}catch{enabled=false;}
  }
  return reply(res,200,{
    enabled,merchantName:"Life Anéis",
    legalName:enabled?process.env.MERCHANT_LEGAL_NAME:"",
    shippingCents:shippingRates(),freeShippingFromCents:29900,
    trackingMode:"payment_reference"
  });
}
