// Backend Life Anéis: valores e credenciais nunca vêm do navegador.
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

export const UNIT_PRICE_CENTS = 3786;
const CATALOG = Object.fromEntries([
  ["enigma-infinito-duplo","Anel Enigma Infinito Duplo"],
  ["forms-coracao","Anel Forms Coração"],
  ["cupido-coracao","Anel Cupido Coração"],
  ["trancado","Anel Trançado"],
  ["astro-gota","Anel Astro Gota"],
  ["coracao","Anel Coração"],
  ["love-iii-coracao","Anel Love III Coração"],
  ["coroa","Anel Coroa"]
]);
const STATUS = new Set(["creating","pending","processing","under_review","approved","failed","refunded","chargeback"]);
const UF = new Set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "));
export const digits = v => String(v??"").replace(/\D/g,"");
export const hashToken = s => createHash("sha256").update(s).digest("hex");
export const newAccessToken = () => randomBytes(24).toString("hex");
export const newReference = () => randomUUID();
export const publicHost = () => {
  const v = process.env.PUBLIC_STORE_URL || "";
  if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?\/?$/i.test(v)) throw new Error("PUBLIC_STORE_URL inválida");
  return v.replace(/\/$/,"");
};
export function merchantConfigured() {
  return Boolean(process.env.MERCHANT_LEGAL_NAME?.trim() && /^\d{11}$|^\d{14}$/.test(digits(process.env.PINGUPAG_SELLER_DOCUMENT)));
}
export function gatewayConfigured() {
  return Boolean(process.env.PINGUPAG_API_KEY && process.env.PINGUPAG_PRODUCT_HASH && process.env.PINGUPAG_API_BASE_URL && process.env.PINGUPAG_WEBHOOK_TOKEN);
}
export function dbConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}
export function liveEnabled() {
  return process.env.PIX_LIVE_ENABLED === "true" && merchantConfigured() && gatewayConfigured() && dbConfigured() && Boolean(process.env.PUBLIC_STORE_URL);
}
export function shippingRates() {
  const parse = key => {
    const v=process.env[key];
    if(v==null || !/^\d{1,7}$/.test(v)) return null;
    const n=Number(v);
    return Number.isSafeInteger(n) && n>0 ? n : null;
  };
  return {standard:parse("SHIP_STANDARD_CENTS"),express:parse("SHIP_EXPRESS_CENTS")};
}
export function orderContent(items,shippingMethod) {
  if(!Array.isArray(items) || items.length<1 || items.length>30) throw new Error("Sacola inválida");
  const normalized=items.map(i=>{
    if(!i || typeof i.id!=="string" || !Object.hasOwn(CATALOG,i.id)) throw new Error("Produto inválido");
    const size=Number(i.size),qty=Number(i.qty);
    if(!Number.isInteger(size)||size<11||size>20||!Number.isInteger(qty)||qty<1||qty>15) throw new Error("Tamanho ou quantidade inválidos");
    return {id:i.id,name:CATALOG[i.id],size,qty,unitPriceCents:UNIT_PRICE_CENTS};
  });
  const count=normalized.reduce((sum,i)=>sum+i.qty,0);
  if(count>60) throw new Error("Quantidade acima do limite");
  const subtotal=UNIT_PRICE_CENTS*count;
  const rates=shippingRates();
  let shipping;
  if(shippingMethod==="free" && subtotal>=29900)shipping=0;
  else if(shippingMethod==="standard" && rates.standard!=null)shipping=rates.standard;
  else if(shippingMethod==="express" && rates.express!=null)shipping=rates.express;
  else throw new Error("Frete indisponível. Confira as opções antes de pagar");
  return {items:normalized,count,shippingCents:shipping,amountCents:subtotal+shipping,shippingMethod};
}
export function validateCustomer(customer,address) {
  const name=String(customer?.name||"").trim().slice(0,100);
  const email=String(customer?.email||"").trim().toLowerCase().slice(0,120);
  const phone=digits(customer?.phone);
  const document=digits(customer?.document);
  if(name.length<3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{10,11}$/.test(phone) || !/^\d{11}$/.test(document)) throw new Error("Dados do cliente inválidos");
  // Verificação do dígito do CPF; não armazenamos o documento em nosso banco.
  if(/^(\d)\1{10}$/.test(document))throw new Error("CPF inválido");
  const check = length => {
    let sum=0;for(let i=0;i<length;i++)sum+=Number(document[i])*(length+1-i);
    const d=(sum*10)%11;return d===10?0:d;
  };
  if(check(9)!==Number(document[9]) || check(10)!==Number(document[10])) throw new Error("CPF inválido");
  const a={
    street:String(address?.street||"").trim().slice(0,150),
    number:String(address?.number||"").trim().slice(0,15),
    neighborhood:String(address?.neighborhood||"").trim().slice(0,80),
    city:String(address?.city||"").trim().slice(0,80),
    state:String(address?.state||"").trim().toUpperCase(),
    zipcode:digits(address?.zipcode)
  };
  if(!a.street || !a.number || !a.neighborhood || !a.city || !UF.has(a.state) || !/^\d{8}$/.test(a.zipcode)) throw new Error("Endereço de entrega inválido");
  return {customer:{name,email,phone,document},address:a};
}
function supabaseBase() {
  const url=process.env.SUPABASE_URL||"";
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) throw new Error("SUPABASE_URL inválida");
  if(!process.env.SUPABASE_SECRET_KEY)throw new Error("Banco indisponível");
  return url;
}
export async function db(method,query="",body,prefer="") {
  const url=supabaseBase()+"/rest/v1/life_orders"+query;
  const key=process.env.SUPABASE_SECRET_KEY;
  const response=await fetch(url,{
    method,
    headers:{"apikey":key,"Content-Type":"application/json","Accept":"application/json",...(prefer?{"Prefer":prefer}:{})},
    body:body==null?undefined:JSON.stringify(body),
    signal:AbortSignal.timeout(10000),
    cache:"no-store"
  });
  if(!response.ok)throw new Error("Falha ao acessar pedidos no banco ("+response.status+")");
  const text=await response.text();
  return text?JSON.parse(text):null;
}
export async function orderByReference(ref) {
  const rows=await db("GET","?select=*&reference=eq."+encodeURIComponent(ref)+"&limit=1");
  return Array.isArray(rows)?rows[0]||null:null;
}
export async function orderByAccessToken(token) {
  const hash=hashToken(token);
  const rows=await db("GET","?select=*&access_hash=eq."+hash+"&limit=1");
  return Array.isArray(rows)?rows[0]||null:null;
}
export async function updateOrder(ref,patch) {
  const rows=await db("PATCH","?reference=eq."+encodeURIComponent(ref),{...patch,updated_at:new Date().toISOString()},"return=representation");
  return rows?.[0]||null;
}
function gatewayBase() {
  const raw=process.env.PINGUPAG_API_BASE_URL||"";
  const u=new URL(raw);
  if(u.protocol!=="https:" || u.username || u.password || u.search || u.hash || !u.hostname || u.pathname!=="/")throw new Error("PINGUPAG_API_BASE_URL inválida");
  if(/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname))throw new Error("Gateway inválido");
  return u.origin;
}
export async function pingu(path,body) {
  const method=body==null?"GET":"POST";
  const response=await fetch(gatewayBase()+path,{
    method,
    headers:{"X-API-Key":process.env.PINGUPAG_API_KEY||"","Content-Type":"application/json","Accept":"application/json"},
    body:body==null?undefined:JSON.stringify(body),
    signal:AbortSignal.timeout(12000),cache:"no-store"
  });
  const text=await response.text();
  let obj;try{obj=JSON.parse(text)}catch{obj={}};
  if(!response.ok)throw new Error("Gateway indisponível ("+response.status+")");
  return obj;
}
export async function verifyMerchant() {
  const seller=await pingu("/gateway/v1/seller");
  const document=digits(seller?.document);
  if(!document || document!==digits(process.env.PINGUPAG_SELLER_DOCUMENT))throw new Error("Beneficiário do Pix não corresponde ao vendedor configurado");
  const clean=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]/g,"").toLowerCase();
  const configured=clean(process.env.MERCHANT_LEGAL_NAME);
  if(!configured || ![seller?.company_name,seller?.name].some(name=>clean(name)===configured))
    throw new Error("Nome do beneficiário não corresponde ao cadastro da PinguPag");
  return seller;
}
export async function verifyTransaction(order) {
  let entries;
  if(order.gateway_transaction_id){
    const item=await pingu("/gateway/v1/query?action=get_transaction&id="+encodeURIComponent(order.gateway_transaction_id));
    entries=[item];
  } else {
    entries=await pingu("/gateway/v1/query?action=list_transactions&external_id="+encodeURIComponent(order.reference));
  }
  const found=(Array.isArray(entries)?entries:[entries]).find(t =>
    String(t?.external_id)===order.reference && Number(t?.amount)===order.amount_cents &&
    STATUS.has(String(t?.status||"").toLowerCase())
  );
  if(!found)throw new Error("Transação não corresponde ao pedido");
  return {id:String(found.id),status:String(found.status).toLowerCase()};
}
export async function refreshPayment(order) {
  if(!order || !order.gateway_transaction_id)return order;
  const verified=await verifyTransaction(order);
  if(verified.status===order.status)return order;
  if(["refunded","chargeback"].includes(order.status) && !["refunded","chargeback"].includes(verified.status))return order;
  if(order.status==="approved" && ["creating","pending","processing","under_review","failed"].includes(verified.status))return order;
  return updateOrder(order.reference,{status:verified.status,...(verified.status==="approved"?{paid_at:order.paid_at||new Date().toISOString()}:{})});
}
export function secureWebhookToken(input) {
  const expect=process.env.PINGUPAG_WEBHOOK_TOKEN||"";
  const x=String(input||"");
  const a=Buffer.from(x),b=Buffer.from(expect);
  return expect.length>=24 && a.length===b.length && timingSafeEqual(a,b);
}
export function reply(res,code,data) {
  res.setHeader("Cache-Control","no-store, private, max-age=0");
  res.setHeader("X-Content-Type-Options","nosniff");
  return res.status(code).json(data);
}
