import { db,dbConfigured,gatewayConfigured,merchantConfigured,shippingRates,reply } from "../lib/life-payments.js";

// Diagnóstico somente de configurações e acesso ao banco.
// Não chama a PinguPag, não mostra credenciais e nunca gera cobranças.
export default async function handler(req,res) {
  if(req.method!=="GET")return reply(res,405,{error:"method_not_allowed"});
  let dbStatus="not_configured";
  if(dbConfigured()){
    try{
      await db("GET","?select=id&limit=1");
      dbStatus="connected";
    }catch{dbStatus="connection_failed";}
  }
  const rates=shippingRates();
  return reply(res,200,{
    database:dbStatus,
    paymentCredentialsConfigured:gatewayConfigured(),
    sellerIdentityConfigured:merchantConfigured(),
    storeUrlConfigured:Boolean(process.env.PUBLIC_STORE_URL),
    shippingConfigured:rates.standard!==null || rates.express!==null,
    livePaymentsEnabled:process.env.PIX_LIVE_ENABLED==="true",
    gatewayConnectionVerified:false,
    note:"O diagnóstico não chama a PinguPag e não gera Pix. Valide o domínio da API e teste o provedor antes de habilitar cobranças."
  });
}
