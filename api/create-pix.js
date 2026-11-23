import { newReference,orderContent,validateCustomer,verifyMerchant,
  liveEnabled,pingu,publicHost,reply } from "../lib/life-payments.js";
export default async function handler(req,res){
  if(req.method!=="POST")return reply(res,405,{error:"method_not_allowed"});
  if(!liveEnabled())return reply(res,503,{error:"not_configured",message:"Pix ainda não está habilitado."});
  const origin=req.headers.origin;
  if(origin){try{if(new URL(origin).host!==req.headers.host)return reply(res,403,{error:"origin_denied"});}
    catch{return reply(res,403,{error:"origin_denied"});}}
  if(!String(req.headers["content-type"]||"").startsWith("application/json"))
    return reply(res,415,{error:"invalid_content_type"});
  try{
    const order=orderContent(req.body?.items,req.body?.shippingMethod);
    const person=validateCustomer(req.body?.customer,req.body?.address);
    await verifyMerchant();
    const orderCode=newReference();
    const itemList=order.items.map(i=>i.id+" T"+i.size+" x"+i.qty).join("; ");
    const description="Life Anéis | "+itemList;
    if(description.length>250)throw new Error("Pedido com muitos produtos: divida em duas compras");
    // O cadastro do cliente e o pedido ficam com a própria gateway.
    const transaction=await pingu("/gateway/v1/transaction",{
      amount:order.amountCents,description,reference:orderCode,
      productHash:process.env.PINGUPAG_PRODUCT_HASH,
      postback_url:publicHost()+"/api/pingupag-webhook?token="+encodeURIComponent(process.env.PINGUPAG_WEBHOOK_TOKEN),
      customer:person.customer,address:person.address
    });
    const code=String(transaction.qr_code||"");
    const qrImg=String(transaction.qr_code_base64||"");
    if(transaction.status!=="success" || !code.startsWith("000201") || code.length>4000 ||
      !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(qrImg) ||
      Number(transaction.amount)!==order.amountCents ||
      !transaction.transaction_id || String(transaction.id)!==orderCode)
      throw new Error("Resposta Pix inválida");
    return reply(res,201,{
      ok:true,reference:orderCode,accessToken:orderCode,
      orderCode,amountCents:order.amountCents,
      qrCode:code,qrCodeBase64:qrImg,expiresAt:transaction.expires_at||null,
      merchantName:"Life Anéis",legalName:process.env.MERCHANT_LEGAL_NAME
    });
  }catch(err){
    const expected=/inválido|inválida|indisponível|muitos produtos|acima do limite/.test(String(err.message||""));
    return reply(res,expected?400:502,{error:"pix_creation_failed",
      message:expected?String(err.message):"Não foi possível emitir o Pix. Verifique a conexão da PinguPag."});
  }
}
