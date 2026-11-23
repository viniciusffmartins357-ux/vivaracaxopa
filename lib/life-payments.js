// Life Anéis: pedido rastreável pelo identificador guardado na PinguPag.
// Nenhum banco externo ou rastreamento fictício de transportadora.
import { randomBytes, timingSafeEqual } from "node:crypto";

export const UNIT_PRICE_CENTS=3786;
const CATALOG=Object.fromEntries([
  ["enigma-infinito-duplo","Anel Enigma Infinito Duplo"],
  ["forms-coracao","Anel Forms Coração"],
  ["cupido-coracao","Anel Cupido Coração"],
  ["trancado","Anel Trançado"],
  ["astro-gota","Anel Astro Gota"],
  ["coracao","Anel Coração"],
  ["love-iii-coracao","Anel Love III Coração"],
  ["coroa","Anel Coroa"]
]);
const STATES=new Set(["pending","approved","processing","under_review","failed","refunded","chargeback"]);
const UF=new Set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "));
export const digits=v=>String(v??"").replace(/\D/g,"");
export const newReference=()=>"LA-"+randomBytes(12).toString("hex").toUpperCase();
export const validReference=value=>/^LA-[A-F0-9]{24}$/.test(String(value??""));
export const publicHost=()=>{
  const raw=process.env.PUBLIC_STORE_URL||"";
  if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?\/?$/i.test(raw))throw new Error("URL da loja inválida");
  return raw.replace(/\/$/,"");
};
export function merchantConfigured(){
  return Boolean(process.env.MERCHANT_LEGAL_NAME?.trim() &&
    /^(?:\d{11}|\d{14})$/.test(digits(process.env.PINGUPAG_SELLER_DOCUMENT)));
}
export function gatewayConfigured(){
  return Boolean(process.env.PINGUPAG_API_KEY && process.env.PINGUPAG_PRODUCT_HASH &&
    process.env.PINGUPAG_API_BASE_URL && process.env.PINGUPAG_WEBHOOK_TOKEN);
}
export function liveEnabled(){
  return process.env.PIX_LIVE_ENABLED==="true" && merchantConfigured() &&
    gatewayConfigured() && Boolean(process.env.PUBLIC_STORE_URL);
}
export function shippingRates(){
  const parse=key=>{
    const v=process.env[key];
    if(v==null||!/^\d{1,7}$/.test(v))return null;
    const n=Number(v);
    return Number.isSafeInteger(n) && n>0?n:null;
  };
  return {standard:parse("SHIP_STANDARD_CENTS"),express:parse("SHIP_EXPRESS_CENTS")};
}
export function orderContent(items,shippingMethod){
  if(!Array.isArray(items)||!items.length||items.length>30)throw new Error("Sacola inválida");
  const normalized=items.map(i=>{
    if(!i||typeof i.id!=="string"||!Object.hasOwn(CATALOG,i.id))throw new Error("Produto inválido");
    const size=Number(i.size),qty=Number(i.qty);
    if(!Number.isInteger(size)||size<11||size>20||!Number.isInteger(qty)||qty<1||qty>15)
      throw new Error("Tamanho ou quantidade inválidos");
    return {id:i.id,name:CATALOG[i.id],size,qty,unitPriceCents:UNIT_PRICE_CENTS};
  });
  const count=normalized.reduce((sum,i)=>sum+i.qty,0);
  if(count>60)throw new Error("Quantidade acima do limite");
  const subtotal=UNIT_PRICE_CENTS*count;
  const rates=shippingRates();
  let shipping;
  if(shippingMethod==="free" && subtotal>=29900)shipping=0;
  else if(shippingMethod==="standard" && rates.standard!==null)shipping=rates.standard;
  else if(shippingMethod==="express" && rates.express!==null)shipping=rates.express;
  else throw new Error("Frete indisponível. Confira as opções antes de pagar");
  return {items:normalized,count,shippingCents:shipping,amountCents:subtotal+shipping,shippingMethod};
}
export function validateCustomer(customer,address){
  const name=String(customer?.name||"").trim().slice(0,100);
  const email=String(customer?.email||"").trim().toLowerCase().slice(0,120);
  const phone=digits(customer?.phone);
  const document=digits(customer?.document);
  if(name.length<3||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||
    !/^\d{10,11}$/.test(phone)||!/^\d{11}$/.test(document))throw new Error("Dados do cliente inválidos");
  if(/^(\d)\1{10}$/.test(document))throw new Error("CPF inválido");
  const check=length=>{
    let sum=0;for(let i=0;i<length;i++)sum+=Number(document[i])*(length+1-i);
    const n=(sum*10)%11;return n===10?0:n;
  };
  if(check(9)!==Number(document[9])||check(10)!==Number(document[10]))throw new Error("CPF inválido");
  const a={
    street:String(address?.street||"").trim().slice(0,150),
    number:String(address?.number||"").trim().slice(0,15),
    neighborhood:String(address?.neighborhood||"").trim().slice(0,80),
    city:String(address?.city||"").trim().slice(0,80),
    state:String(address?.state||"").trim().toUpperCase(),
    zipcode:digits(address?.zipcode)
  };
  if(!a.street||!a.number||!a.neighborhood||!a.city||!UF.has(a.state)||!/^\d{8}$/.test(a.zipcode))
    throw new Error("Endereço de entrega inválido");
  return {customer:{name,email,phone,document},address:a};
}
function gatewayBase(){
  const u=new URL(process.env.PINGUPAG_API_BASE_URL||"");
  if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash||
    !u.hostname||u.pathname!=="/")throw new Error("PINGUPAG_API_BASE_URL inválida");
  if(/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname))
    throw new Error("Endereço da gateway inválido");
  return u.origin;
}
export async function pingu(path,body){
  const response=await fetch(gatewayBase()+path,{
    method:body==null?"GET":"POST",
    headers:{"X-API-Key":process.env.PINGUPAG_API_KEY||"","Content-Type":"application/json","Accept":"application/json"},
    body:body==null?undefined:JSON.stringify(body),
    signal:AbortSignal.timeout(12000),cache:"no-store"
  });
  const raw=await response.text();
  let result;try{result=JSON.parse(raw)}catch{result={}};
  if(!response.ok)throw new Error("Gateway indisponível ("+response.status+")");
  return result;
}
export async function verifyMerchant(){
  const seller=await pingu("/gateway/v1/seller");
  const expected=digits(process.env.PINGUPAG_SELLER_DOCUMENT);
  if(!expected||digits(seller?.document)!==expected)throw new Error("Beneficiário Pix diferente do vendedor cadastrado");
  const clean=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-zA-Z0-9]/g,"").toLowerCase();
  const name=clean(process.env.MERCHANT_LEGAL_NAME);
  if(!name||![seller?.company_name,seller?.name].some(v=>clean(v)===name))
    throw new Error("Nome do recebedor não corresponde à PinguPag");
  return seller;
}
export async function lookupPayment(orderCode){
  if(!validReference(orderCode))throw new Error("Referência inválida");
  const entries=await pingu("/gateway/v1/query?action=list_transactions&external_id="+encodeURIComponent(orderCode));
  if(!Array.isArray(entries))throw new Error("Resposta de consulta inválida");
  const items=entries.filter(t=>String(t?.external_id)===orderCode &&
    Number.isInteger(Number(t?.amount)) && Number(t.amount)>0 &&
    STATES.has(String(t?.status||"").toLowerCase()));
  if(items.length!==1)throw new Error("Pedido não encontrado ou consulta ambígua");
  const t=items[0];
  return {
    orderCode,status:String(t.status).toLowerCase(),amountCents:Number(t.amount)
  };
}
export function secureWebhookToken(input){
  const secret=process.env.PINGUPAG_WEBHOOK_TOKEN||"";
  const a=Buffer.from(String(input||"")),b=Buffer.from(secret);
  return secret.length>=24 && a.length===b.length && timingSafeEqual(a,b);
}
export function reply(res,code,data){
  res.setHeader("Cache-Control","no-store, private, max-age=0");
  res.setHeader("X-Content-Type-Options","nosniff");
  return res.status(code).json(data);
}
