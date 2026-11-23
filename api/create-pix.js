import { db,hashToken,newAccessToken,newReference,orderContent,validateCustomer,verifyMerchant,
  liveEnabled,pingu,publicHost,updateOrder,reply } from "../lib/life-payments.js";
export default async function handler(req,res) {
  if(req.method!=="POST")return reply(res,405,{error:"method_not_allowed"});
  if(!liveEnabled())return reply(res,503,{error:"not_configured",message:"Pix ainda não está habilitado."});
  const origin=req.headers.origin;
  if(origin && new URL(origin).host!==req.headers.host)return reply(res,403,{error:"origin_denied"});
  if(!String(req.headers["content-type"]||"").startsWith("application/json"))return reply(res,415,{error:"invalid_content_type"});
  let order;
  try{
    const content=orderContent(req.body?.items,req.body?.shippingMethod);
    const person=validateCustomer(req.body?.customer,req.body?.address);
    await verifyMerchant();
    const reference=newReference();
    const accessToken=newAccessToken();
    // CPF só é repassado à PinguPag; não é salvo no banco, nos logs ou no navegador.
    const record={
      reference,access_hash:hashToken(accessToken),status:"creating",
      amount_cents:content.amountCents,shipping_cents:content.shippingCents,shipping_method:content.shippingMethod,
      items:content.items,customer_name:person.customer.name,
      customer_email:person.customer.email,customer_phone:person.customer.phone,address:person.address
    };
    const created=await db("POST","",record,"return=representation");
    if(!Array.isArray(created)||!created[0])throw new Error("Pedido não foi salvo");
    order=created[0];
    const transaction=await pingu("/gateway/v1/transaction",{
      amount:content.amountCents,
      description:"Life Anéis - "+content.count+" item(ns)",
      reference,
      productHash:process.env.PINGUPAG_PRODUCT_HASH,
      postback_url:publicHost()+"/api/pingupag-webhook?token="+encodeURIComponent(process.env.PINGUPAG_WEBHOOK_TOKEN),
      customer:person.customer,address:person.address
    });
    const code=String(transaction.qr_code||"");
    const img=String(transaction.qr_code_base64||"");
    if(transaction.status!=="success" || !code.startsWith("000201") || code.length>4000 ||
      !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(img) ||
      Number(transaction.amount)!==content.amountCents || !transaction.transaction_id)
      throw new Error("Resposta Pix inválida");
    await updateOrder(reference,{
      status:"pending",gateway_transaction_id:String(transaction.transaction_id),
      pix_code:code,pix_qr_image:img,expires_at:String(transaction.expires_at||"")
    });
    return reply(res,201,{
      ok:true,reference,accessToken,amountCents:content.amountCents,
      qrCode:code,qrCodeBase64:img,expiresAt:transaction.expires_at||null,
      merchantName:"Life Anéis",legalName:process.env.MERCHANT_LEGAL_NAME
    });
  }catch(err){
    if(order)try{await updateOrder(order.reference,{status:"failed"});}catch{}
    // Nunca retorne dados do cliente ou chaves em mensagens de erro.
    const expected=/inválido|inválida|indisponível|acima do limite/.test(String(err.message||""));
    return reply(res,expected?400:502,{error:"pix_creation_failed",message:expected?err.message:"Não foi possível criar o Pix. Confira as configurações da loja."});
  }
}
