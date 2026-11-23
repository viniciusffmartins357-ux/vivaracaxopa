import {gatewayConfigured,merchantConfigured,shippingRates,reply} from "../lib/life-payments.js";
// Diagnóstico sem consultar credenciais nem gerar Pix.
export default function handler(req,res){
  if(req.method!=="GET")return reply(res,405,{error:"method_not_allowed"});
  const shipping=shippingRates();
  return reply(res,200,{
    database:"not_required",
    paymentCredentialsConfigured:gatewayConfigured(),
    sellerIdentityConfigured:merchantConfigured(),
    storeUrlConfigured:Boolean(process.env.PUBLIC_STORE_URL),
    shippingConfigured:shipping.standard!==null||shipping.express!==null,
    livePaymentsEnabled:process.env.PIX_LIVE_ENABLED==="true",
    gatewayConnectionVerified:false,
    trackingMode:"order_payment_reference",
    note:"O código acompanha o status de pagamento na PinguPag; não é rastreio da transportadora."
  });
}
