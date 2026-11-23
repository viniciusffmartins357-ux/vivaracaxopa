(() => {
  "use strict";

  const PRICE = 37.86;
  const STORAGE = "aneis-life-cart-v3";
  const sizes = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const products = [
    {id:"enigma-infinito-duplo",name:"Anel Life Enigma Infinito Duplo em Prata 925",old:610,img:"/ring-1-Cz3ws0ux-white-v2.svg"},
    {id:"forms-coracao",name:"Anel Life Forms Coração em Prata 925 com Pedras Incolores",old:550,img:"/ring-2-B16VW5nY-white-v2.svg"},
    {id:"cupido-coracao",name:"Anel Life Cupido Coração em Prata 925",old:450,img:"/ring-3-Qiw7MHPM-white-v2.svg"},
    {id:"trancado",name:"Anel Life Trançado em Prata 925",old:399,img:"/ring-4-DdmGjkv3-white-v2.svg"},
    {id:"astro-gota",name:"Anel Life Astro Gota em Prata 925 com Pedras Incolores",old:690,img:"/ring-5-DHVd5Ous-white-v2.svg"},
    {id:"coracao",name:"Anel Life Coração em Prata 925",old:499,img:"/ring-6-BaUxRwUJ-white-v2.svg"},
    {id:"love-iii-coracao",name:"Anel Life Love III Coração em Prata 925",old:527,img:"/ring-7-BcHnBBxQ-white-v2.svg"},
    {id:"coroa",name:"Anel Life Coroa em Prata 925",old:550,img:"/ring-8-C18XpEOy-white-v2.svg"}
  ];
  const byId = Object.fromEntries(products.map(p => [p.id,p]));
  const money = amount => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(amount);
  const root = document.getElementById("app");
  let cart = readCart();
  let checkoutStage = 1;
  let details = {};
  let activePayment = null;
  let paymentCheckTimer = null;
  let checkoutConfig = {enabled:false,merchantName:"Life Anéis",legalName:"",shippingCents:{standard:null,express:null}};
  let toastTimer;
  let checkoutOfferIds = null;
  const selectedUpsells = new Map();

  function readCart() {
    try {
      const entries = JSON.parse(localStorage.getItem(STORAGE) || "[]");
      if (!Array.isArray(entries)) return [];
      return entries.filter(i => i && byId[i.id] && sizes.includes(Number(i.size)))
        .map(i => ({id:i.id,size:Number(i.size),qty:Math.min(15,Math.max(1,Math.trunc(Number(i.qty)||1)))}));
    } catch { return []; }
  }
  function saveCart() {
    try { localStorage.setItem(STORAGE, JSON.stringify(cart)); } catch {}
  }
  function quantity() { return cart.reduce((sum,i)=>sum+i.qty,0); }
  function subtotal() { return Math.round(quantity()*PRICE*100)/100; }
  function route() { return decodeURIComponent(location.pathname).replace(/\/+$/,"") || "/"; }
  function navigate(to) {
    if (route() !== to) history.pushState({},"",to);
    window.scrollTo({top:0,behavior:"instant"});
    render();
  }
  function toast(message) {
    const el = document.querySelector(".toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>el.classList.remove("visible"),3000);
  }
  function addItem(id,size,qty=1) {
    const p=byId[id], chosen=Number(size);
    if (!p || !sizes.includes(chosen)) { toast("Selecione o tamanho do anel."); return false; }
    const existing=cart.find(i=>i.id===id&&i.size===chosen);
    if (existing) existing.qty=Math.min(15,existing.qty+qty);
    else cart.push({id,size:chosen,qty:Math.min(15,qty)});
    saveCart();
    return true;
  }
  const bagIcon = '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h16l-1 13H5L4 8Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></svg>';
  const userIcon='<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-1.5a7 7 0 0 1 14 0V21"/></svg>';
  const menuIcon='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  function header() {
    if(route()==="/checkout"){
      return '<header class="checkout-brandbar"><a href="/" data-route="/" class="checkout-brand">FINALIZAR PEDIDO</a>'+
        '<span class="checkout-brand-signature checkout-signature-logo" aria-label="Life Anéis"><span class="checkout-signature-script">Life</span><small class="checkout-signature-sub">ANÉIS</small></span></header>';
    }
    if(route()==="/carrinho"){
      return '<header class="checkout-brandbar"><a href="/" data-route="/" class="checkout-brand">LIFE ANÉIS</a>'+
        '<a href="/" data-route="/" class="checkout-brand-signature">Life</a></header>';
    }
    return '<div class="shipping-bar">FRETE GRÁTIS EM COMPRAS A PARTIR DE R$ 299</div>'+
      '<header class="site-header"><div class="header-content">'+
      '<button type="button" id="menu-toggle" class="header-link" aria-label="Abrir menu da loja" aria-controls="menu-panel" aria-expanded="false">'+menuIcon+'</button>'+
      '<a data-route="/" href="/" class="logo" aria-label="Ir para a loja"><span>Life</span><small>ANÉIS</small></a>'+
      '<div class="header-actions"><span class="account-symbol" title="Área de conta ainda não disponível">'+userIcon+'</span>'+
      '<a data-route="/carrinho" href="/carrinho" class="bag-link" aria-label="Abrir minha sacola">'+bagIcon+
      '<span class="bag-count">'+quantity()+'</span></a></div></div>'+
      '<nav id="menu-panel" class="menu-panel" hidden><a href="/" data-route="/">Ver coleção</a>'+
      '<a href="/carrinho" data-route="/carrinho">Minha sacola ('+quantity()+')</a></nav></header>';
  }
  function footer() {
    return '<footer class="site-footer"><strong>LIFE ANÉIS</strong><p>Vitrine independente • Compra online com pagamento a configurar</p>'+
      '<a data-route="/" href="/">Voltar à coleção</a> · <a data-route="/rastreio" href="/rastreio">Acompanhar pedido</a></footer>';
  }
  function image(p,alt) {
    return '<img src="'+p.img+'" alt="'+(alt||p.name)+'" loading="lazy" decoding="async" />';
  }
  function selectSize(p,cls,chosenSize=null,locked=false) {
    return '<label class="sr-only" for="size-'+cls+'-'+p.id+'">Tamanho do '+p.name+'</label>'+
      '<select id="size-'+cls+'-'+p.id+'" class="size-select" data-size-for="'+p.id+'"'+(locked?' disabled':'')+'>'+
      '<option value=""'+(chosenSize==null?' selected':'')+'>Tamanho: selecione</option>'+
      sizes.map(n=>'<option value="'+n+'"'+(Number(chosenSize)===n?' selected':'')+'>'+n+'</option>').join("")+'</select>';
  }
  function productCard(p) {
    return '<article class="product-card">'+
      '<a href="/produto/'+p.id+'" data-route="/produto/'+p.id+'" class="product-image">'+image(p)+'</a>'+
      '<div class="product-content"><a href="/produto/'+p.id+'" data-route="/produto/'+p.id+'" class="product-name">'+p.name+'</a>'+
      '<div class="price-area"><span class="old-price" aria-label="Preço de referência">'+money(p.old)+'</span><strong>'+money(PRICE)+'</strong></div>'+
      '<div class="product-picker">'+selectSize(p,"catalog")+
      '<button type="button" class="btn btn-coral" data-add="'+p.id+'">ADICIONAR À SACOLA</button></div></div></article>';
  }
  function catalogue() {
    return header()+'<main class="catalog-container"><div class="catalog-heading">'+
      '<h1>LIFE ANÉIS</h1><p>8 produtos</p></div>'+
      '<div class="product-grid">'+products.map(productCard).join("")+'</div></main>'+footer();
  }
  function productPage(p) {
    const related=products.filter(x=>x.id!==p.id).slice(0,3);
    return header()+'<main class="page-container"><a data-route="/" href="/" class="back-link">‹ Voltar à coleção</a>'+
      '<div class="product-detail"><div class="detail-photo">'+image(p)+'</div>'+
      '<section class="detail-info"><span class="eyebrow">COLEÇÃO DE ANÉIS</span><h1>'+p.name+'</h1>'+
      '<div class="price-area"><span class="old-price" aria-label="Preço de referência">'+money(p.old)+'</span><strong>'+money(PRICE)+'</strong></div>'+
      '<p class="detail-copy">Escolha o tamanho ideal para adicionar à sua sacola. Confira os detalhes do material e da entrega antes de finalizar a compra.</p>'+
      '<label class="field-title">Tamanho</label><div class="detail-picker">'+selectSize(p,"detail")+
      '<button type="button" class="btn btn-coral" data-add="'+p.id+'">ADICIONAR À SACOLA</button></div>'+
      '<p class="detail-note">Frete grátis em compras a partir de '+money(299)+'.</p></section></div>'+
      '<section class="related-section"><h2>Você também pode gostar</h2><div class="product-grid related">'+related.map(productCard).join("")+'</div></section></main>'+footer();
  }
  function cartLine(item) {
    const p=byId[item.id],key=p.id+"|"+item.size;
    return '<article class="cart-item"><a href="/produto/'+p.id+'" data-route="/produto/'+p.id+'" class="cart-image">'+image(p)+'</a>'+
      '<div class="cart-item-body"><div class="cart-item-top"><div><a class="cart-item-title" href="/produto/'+p.id+'" data-route="/produto/'+p.id+'">'+p.name+'</a>'+
      '<p class="muted"><span class="size-chip">Tamanho: '+item.size+'</span></p></div>'+
      '<button type="button" aria-label="Remover '+p.name+'" class="remove" data-remove="'+key+'">×</button></div>'+
      '<div class="cart-item-bottom"><div class="item-meta"><span class="muted">Qtd:</span><div class="qty"><button type="button" aria-label="Diminuir quantidade" data-change-qty="'+key+'" data-delta="-1">−</button>'+
      '<span>'+item.qty+'</span><button type="button" aria-label="Aumentar quantidade" data-change-qty="'+key+'" data-delta="1">+</button></div></div>'+
      '<div class="item-prices"><del>'+money(p.old*item.qty)+'</del><strong>'+money(PRICE*item.qty)+'</strong></div></div></div></article>';
  }
  function recommends() {
    // Mantém as duas sugestões fixas durante o checkout, inclusive depois de adicionadas.
    if (checkoutOfferIds===null) {
      const alreadyInCart=new Set(cart.map(i=>i.id));
      checkoutOfferIds=products.filter(p=>!alreadyInCart.has(p.id)).slice(0,2).map(p=>p.id);
    }
    return checkoutOfferIds.map(id=>byId[id]).filter(Boolean);
  }
  function upsellChosenSize(id) {
    const size=selectedUpsells.get(id);
    if (!size)return null;
    return cart.some(item=>item.id===id && item.size===size)?size:null;
  }
  function upsellCard(p) {
    const chosen=upsellChosenSize(p.id);
    return '<div class="upsell-card upsell-inline'+(chosen?' is-added':'')+'">'+
      '<div class="upsell-image">'+image(p)+'</div>'+
      '<div class="upsell-body">'+
      '<div class="upsell-label"><strong>'+p.name+'</strong><span class="upsell-price">+'+money(PRICE)+'</span></div>'+
      '<p class="upsell-desc">Adicione este anel ao seu pedido.</p>'+
      '<div class="upsell-controls">'+selectSize(p,"upsell",chosen,Boolean(chosen))+'</div>'+
      '<label class="upsell-toggle"><input type="checkbox" data-upsell-check="'+p.id+'"'+(chosen?' checked':'')+'>'+
      '<span>'+(chosen?'Adicionado ao pedido (desmarque para remover)':'Adicionar ao meu pedido')+'</span></label>'+
      '</div></div>';
  }
  function upsellSection() {
    const picks=recommends();
    if(!picks.length)return '';
    return '<section class="upsell" aria-label="Ofertas adicionais"><h3>COMPLETE SEU PEDIDO</h3>'+
      '<p>Escolha um tamanho e marque a oferta desejada. O valor é somado somente quando você adiciona.</p>'+
      picks.map(upsellCard).join("")+'</section>';
  }
  function summary(inCheckout=false) {
    const value=subtotal();
    const rates=checkoutConfig.shippingCents||{};
    const selected=details.shippingMethod;
    const configured=selected==="free" && value>=299 ? 0 :
      (["standard","express"].includes(selected) && Number.isInteger(rates[selected])?rates[selected]:null);
    const shippingValue=activePayment?activePayment.amountCents-Math.round(value*100):configured;
    const shippingLabel=shippingValue===null
      ? (value>=299?"Grátis disponível":inCheckout?"Selecione o frete":"Calculado no checkout")
      : shippingValue===0?"Grátis":money(shippingValue/100);
    const total=activePayment?activePayment.amountCents/100:value+(shippingValue===null?0:shippingValue/100);
    return '<aside class="summary"><h3>RESUMO DO PEDIDO</h3>'+
      '<div class="summary-row"><span>Subtotal ('+quantity()+' '+(quantity()===1?'item':'itens')+')</span><strong>'+money(value)+'</strong></div>'+
      '<div class="summary-row"><span>Frete</span><span>'+shippingLabel+'</span></div>'+
      (inCheckout && !activePayment?upsellSection():'')+
      '<div class="summary-divider"></div>'+
      '<div class="summary-row total"><span>'+(shippingValue===null?'Total dos produtos':'Total do pedido')+'</span><strong>'+money(total)+'</strong></div>'+
      (!inCheckout?'<a data-route="/checkout" href="/checkout" class="btn btn-green">PROSSEGUIR PARA O PAGAMENTO</a>':'')+
      '<div class="safe-note">'+(inCheckout?
        (checkoutConfig.enabled?'Confira o valor total antes de gerar o Pix.':'Pix indisponível até concluir a configuração segura.'):
        'Frete e pagamento serão confirmados nas próximas etapas.')+'</div></aside>';
  }
  function cartPage() {
    return header()+'<main class="page-container short-page checkout-flow"><div class="page-heading"><h1>MINHA SACOLA</h1>'+
      '<span>'+quantity()+' '+(quantity()===1?'item':'itens')+'</span></div>'+
      (!cart.length?'<section class="empty-cart"><h2>Sua sacola está vazia.</h2><p>Escolha um anel para começar.</p><a data-route="/" href="/" class="btn btn-coral">VER ANÉIS</a></section>':
      '<div class="checkout-layout"><section><div class="cart-list">'+cart.map(cartLine).join("")+'</div>'+
      '<a data-route="/" href="/" class="back-link">Continuar comprando</a></section>'+summary()+'</div>')+'</main>'+footer();
  }
  function steps() {
    return '<div class="checkout-status"><span class="'+(checkoutStage>=1?'current':'')+'">1. Dados do cliente</span>'+
      '<span class="'+(checkoutStage>=2?'current':'')+'">2. Endereço e frete</span>'+
      '<span class="'+(checkoutStage>=3?'current':'')+'">3. Pagamento</span></div>';
  }
  function completedCard(step,title,description){
    return '<section class="form-card completed-stage"><h2><span class="step-dot">'+step+'</span> '+title+
      '<button type="button" class="edit-step" data-edit-stage="'+step+'">Editar</button></h2>'+
      '<p>'+description+'</p></section>';
  }
  function customerStage() {
    if(checkoutStage>1)return completedCard(1,"DADOS DO CLIENTE","Dados preenchidos · você pode editar antes do pagamento.");
    return '<form id="customer-form" class="form-card" autocomplete="off">'+
      '<h2><span class="step-dot">1</span> DADOS DO CLIENTE</h2>'+
      (checkoutConfig.enabled?'<p class="checkout-availability">Pagamento seguro via Pix · '+escapeHtml(checkoutConfig.legalName)+'.</p>':
       '<p class="checkout-availability" role="status">Prévia do checkout · Pix indisponível. Não informe dados reais.</p>')+
      '<label>Nome completo<input name="fullName" type="text" autocomplete="off" required minlength="3" maxlength="100" placeholder="Nome e sobrenome"/></label>'+
      '<label>CPF<input name="cpf" type="text" inputmode="numeric" autocomplete="off" required minlength="14" maxlength="14" pattern="[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2}" placeholder="000.000.000-00" aria-describedby="cpf-info"/></label>'+
      '<small id="cpf-info" class="sr-only">CPF apenas para testar a máscara. Não use um CPF real.</small>'+
      '<label>Telefone com DDD<input name="phone" type="tel" autocomplete="off" inputmode="tel" required minlength="10" maxlength="20" placeholder="(00) 00000-0000"/></label>'+
      '<label>E-mail<input name="email" type="email" autocomplete="off" required maxlength="120" placeholder="seu@email.com"/></label>'+
      '<button class="btn btn-green" type="submit">CONTINUAR</button></form>';
  }
  function addressStage() {
    if(checkoutStage<2)return "";
    if(checkoutStage>2)return completedCard(2,"ENDEREÇO E FRETE","Endereço e entrega selecionados · você pode editar.");
    const rates=checkoutConfig.shippingCents||{};
    const cost=id=>typeof rates[id]==="number" && Number.isInteger(rates[id]) && rates[id]>0?rates[id]:null;
    const delivery=(id,name,description)=>{
      const c=cost(id);
      if(checkoutConfig.enabled && c===null)return "";
      return '<label class="freight-choice"><input type="radio" name="freight" value="'+id+'" required>'+
        '<span><strong>'+name+'</strong><small>'+description+'</small></span><b>'+(c===null?'A calcular':money(c/100))+'</b></label>';
    };
    const free=(subtotal()*100>=29900);
    return '<form id="address-form" class="form-card" autocomplete="off">'+
      '<h2><span class="step-dot">2</span> ENDEREÇO E FRETE</h2>'+
      '<p class="shipping-intro">'+(checkoutConfig.enabled?'Confira o endereço e selecione uma das opções de entrega.':'Informe o endereço para visualizar as opções de entrega.')+'</p>'+
      '<div class="input-row postcode-row"><label>CEP<input name="zip" required inputmode="numeric" pattern="[0-9]{5}-?[0-9]{3}" placeholder="00000-000"/></label>'+
      '<label>Número<input name="number" required maxlength="12" placeholder="Nº"/></label></div>'+
      '<label>Rua<input name="street" required maxlength="150" placeholder="Endereço"/></label>'+
      '<div class="input-row"><label>Bairro<input name="district" required maxlength="80" placeholder="Bairro"/></label>'+
      '<label>Cidade<input name="city" required maxlength="80" placeholder="Cidade"/></label></div>'+
      '<label>Estado<select name="state" required><option value="">Selecione</option>'+
      ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(x=>'<option value="'+x+'">'+x+'</option>').join("")+'</select></label>'+
      '<fieldset class="delivery-preview"><legend>OPÇÕES DE FRETE</legend>'+
      (free?'<label class="freight-choice"><input type="radio" name="freight" value="free" required checked><span><strong>Frete grátis</strong><small>Compra a partir de R$ 299,00</small></span><b>Grátis</b></label>':'')+
      delivery("standard","Entrega padrão","Prazo informado no envio")+
      delivery("express","Entrega expressa","Sujeito à disponibilidade")+
      (checkoutConfig.enabled && !free && cost("standard")===null && cost("express")===null?'<p>Entrega não configurada para este pedido. Não é possível gerar o Pix.</p>':'')+
      '<p class="freight-disclaimer">A entrega deve ter valor e prazo confirmados pela loja antes da cobrança.</p></fieldset>'+
      '<button type="submit" class="btn btn-green">CONTINUAR</button>'+
      '<button type="button" class="text-button" data-prev>Voltar aos dados</button></form>';
  }
  function escapeHtml(value) {
    return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function paymentStage() {
    if(checkoutStage<3)return "";
    let content;
    if(activePayment){
      const img=/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(activePayment.qrCodeBase64||"")?activePayment.qrCodeBase64:"";
      content='<div class="pix-result"><h3>'+ (activePayment.status==="approved"?"Pagamento confirmado!":"Pague com Pix") +'</h3>'+
        '<p>Total da cobrança: <strong>'+money(activePayment.amountCents/100)+'</strong></p>'+
        (activePayment.status==="approved"?'<p class="pix-approved">Pagamento aprovado e confirmado pela PinguPag.</p>':
        (img?'<img class="pix-qr" src="'+img+'" alt="QR Code Pix do pedido" width="230" height="230"/>':'')+
        '<label for="pix-copy-value">Pix Copia e Cola</label><textarea id="pix-copy-value" rows="3" readonly></textarea>'+
        '<button type="button" id="pix-copy-button" class="btn btn-green">COPIAR CÓDIGO PIX</button>'+
        '<p id="pix-status" role="status">Aguardando confirmação do pagamento…</p>')+
        '<p class="tracking-prompt">Código de acompanhamento (guarde para consultar seu pedido):</p>'+
        '<code class="tracking-secret">'+escapeHtml(activePayment.accessToken)+'</code>'+
        '</div>';
    }else if(checkoutConfig.enabled){
      content='<div class="payment-info"><strong>Pagamento via Pix</strong>'+
        '<p>Beneficiário cadastrado: '+escapeHtml(checkoutConfig.legalName)+'. O valor inclui os anéis e o frete selecionado.</p></div>'+
        '<button type="button" id="pix-generate-button" class="btn btn-green">GERAR QR CODE PIX</button>'+
        '<p id="pix-error" role="alert"></p>';
    }else{
      content='<div class="payment-info"><strong>Pix indisponível no momento</strong>'+
        '<p>Estamos finalizando a conexão da loja com o sistema de pagamentos. Nenhuma cobrança será gerada nesta prévia.</p></div>'+
        '<button type="button" class="btn btn-green" disabled>GERAR PIX — INDISPONÍVEL</button>';
    }
    return '<section class="form-card payment-stage"><h2><span class="step-dot">3</span> PAGAMENTO</h2>'+
      content+'<a href="/rastreio" data-route="/rastreio" class="tracking-link">Acompanhar pedido</a>'+
      (!activePayment?'<button type="button" class="text-button" data-prev>Voltar ao endereço</button>':'')+'</section>';
  }
  function checkoutPage() {
    if(!cart.length)return cartPage();
    return header()+'<main class="page-container short-page checkout-flow checkout-from-zip"><div class="page-heading"><h1>CHECKOUT</h1><span>'+quantity()+' itens na sacola</span></div>'+
      '<div class="checkout-layout"><div class="checkout-main">'+
      '<div class="checkout-products">'+cart.map(i=>'<article class="checkout-product">'+image(byId[i.id])+
        '<div><strong>'+byId[i.id].name+'</strong><small>Tamanho: '+i.size+' · Qtd: '+i.qty+'</small></div><b>'+money(i.qty*PRICE)+'</b></article>').join("")+'</div>'+
      customerStage()+addressStage()+paymentStage()+
      '<a href="/carrinho" data-route="/carrinho" class="back-link">Voltar à sacola</a></div>'+summary(true)+'</div></main>'+footer();
  }
  function trackingPage() {
    return '<header class="tracking-topbar"><a href="/" data-route="/">← Voltar à loja</a><strong>ACOMPANHAMENTO DO PEDIDO</strong><span></span></header>'+
      '<main class="tracking-container">'+
      '<div class="tracking-heading"><span class="eyebrow">INFORMAÇÕES DO PEDIDO</span><h1>Acompanhe sua entrega</h1>'+
      '<p>O pagamento confirmado e a postagem são etapas diferentes. O código de rastreio só fica disponível quando uma transportadora atribui um código real ao envio.</p></div>'+
      '<section class="tracking-progress" aria-label="Etapas do pedido">'+
      '<div><span class="tracking-number">1</span><strong>Pagamento confirmado</strong><p>Confirmado pelo provedor de pagamentos, nunca apenas pelo navegador.</p></div>'+
      '<div><span class="tracking-number">2</span><strong>Pedido preparado</strong><p>O vendedor separa os produtos e providencia a postagem.</p></div>'+
      '<div><span class="tracking-number">3</span><strong>Rastreamento disponível</strong><p>O código verdadeiro da transportadora é liberado quando existir.</p></div></section>'+
      '<section class="tracking-lookup"><h2>Consultar acompanhamento</h2>'+
      '<p>Para consultar um pedido, utilize a referência privada fornecida pela loja. Não informe CPF, telefone ou dados bancários.</p>'+
      '<form id="tracking-form" autocomplete="off"><label for="tracking-token">Referência privada do pedido</label>'+
      '<div class="tracking-form-row"><input id="tracking-token" name="token" type="text" maxlength="128" minlength="12" required autocapitalize="off" spellcheck="false" placeholder="Sua referência de acompanhamento"/>'+
      '<button class="btn btn-green" type="submit">CONSULTAR</button></div></form>'+
      '<div id="tracking-result" class="tracking-result" role="status" aria-live="polite">A consulta será ativada quando o sistema de pedidos e o serviço de envio estiverem integrados. Nenhum código fictício será gerado.</div>'+
      '</section>'+
      '<p class="tracking-disclaimer">Esta página não confirma pagamentos por conta própria e não representa um serviço oficial de transportadora.</p>'+
      '</main>'+footer();
  }
  function render() {
    const path=route();
    const p=path.startsWith("/produto/")?byId[path.split("/")[2]]:null;
    let content=path==="/rastreio"?trackingPage():path==="/carrinho"?cartPage():path==="/checkout"?checkoutPage():p?productPage(p):catalogue();
    root.innerHTML=content+'<div role="status" class="toast" aria-live="polite"></div>';
    document.title=(path==="/rastreio"?"Acompanhar pedido":path==="/carrinho"?"Minha sacola":path==="/checkout"?"Checkout":p?p.name:"Anéis e presentes")+" | Life Anéis";
    if(activePayment && path==="/checkout"){
      const text=document.getElementById("pix-copy-value");
      if(text)text.value=activePayment.qrCode;
    }
  }
  document.addEventListener("click",ev=>{
    const menuBtn=ev.target.closest("#menu-toggle");
    if(menuBtn){
      const panel=document.getElementById("menu-panel");
      if(panel){panel.hidden=!panel.hidden;menuBtn.setAttribute("aria-expanded",String(!panel.hidden));}
      return;
    }
    const a=ev.target.closest("a[data-route]");
    if(a && ev.button===0 && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !ev.shiftKey){
      ev.preventDefault();
      navigate(a.dataset.route);
      return;
    }
    const add=ev.target.closest("[data-add]");
    if(add){
      const parent=add.closest(".product-card,.detail-info,.upsell-card");
      const selected=parent && parent.querySelector("select[data-size-for]");
      if(addItem(add.dataset.add,selected && selected.value)){
        navigate("/carrinho");
        toast("Anel adicionado à sacola.");
      }
      return;
    }
    const remove=ev.target.closest("[data-remove]");
    if(remove){
      const [id,size]=remove.dataset.remove.split("|");
      cart=cart.filter(i=>!(i.id===id&&String(i.size)===size));
      saveCart();render();return;
    }
    const qty=ev.target.closest("[data-change-qty]");
    if(qty){
      const [id,size]=qty.dataset.changeQty.split("|");
      const item=cart.find(i=>i.id===id&&String(i.size)===size);
      if(item){item.qty=Math.max(1,Math.min(15,item.qty+Number(qty.dataset.delta)));saveCart();render();}
      return;
    }
    const edit=ev.target.closest("[data-edit-stage]");
    if(edit){checkoutStage=Number(edit.dataset.editStage);render();return;}
    if(ev.target.closest("[data-prev]")){checkoutStage=Math.max(1,checkoutStage-1);render();return;}
  });
  document.addEventListener("change",ev=>{
    const input=ev.target.closest("[data-upsell-check]");
    if(!input)return;
    const id=input.dataset.upsellCheck;
    if(input.checked){
      const selected=input.closest(".upsell-card")?.querySelector("select[data-size-for]");
      if(!selected?.value){
        input.checked=false;
        toast("Selecione primeiro o tamanho do anel.");
        selected?.focus();
        return;
      }
      if(addItem(id,selected.value)){
        selectedUpsells.set(id,Number(selected.value));
        if(checkoutStage>=3){checkoutStage=2;details.shippingMethod=null;}
        render();
        toast("Oferta adicionada. O total foi atualizado.");
      } else input.checked=false;
      return;
    }
    const size=selectedUpsells.get(id);
    if(size){
      const item=cart.find(i=>i.id===id&&i.size===size);
      if(item){
        if(item.qty>1)item.qty-=1;
        else cart=cart.filter(i=>i!==item);
        saveCart();
      }
    }
    selectedUpsells.delete(id);
    if(checkoutStage>=3){checkoutStage=2;details.shippingMethod=null;}
    render();
    toast("Oferta removida. O total foi atualizado.");
  });
  document.addEventListener("submit",async ev=>{
    const form=ev.target;
    if(form.id!=="tracking-form")return;
    ev.preventDefault();
    const token=String(new FormData(form).get("token")||"").trim();
    const result=document.getElementById("tracking-result");
    if(!result)return;
    if(!/^[a-zA-Z0-9_-]{12,128}$/.test(token)){
      result.textContent="Use uma referência válida, sem espaços ou informações pessoais.";
      return;
    }
    result.textContent="Consultando o acompanhamento…";
    try {
      const response=await fetch("/api/rastreio",{
        method:"POST",cache:"no-store",
        headers:{"Content-Type":"application/json","Accept":"application/json"},
        body:JSON.stringify({token}),credentials:"same-origin"
      });
      const data=await response.json();
      if(!response.ok || !data || data.ok!==true){
        result.textContent="A consulta de pedidos ainda não está conectada ao sistema de pagamentos e entregas.";
        return;
      }
      if(data.paymentStatus!=="approved"){
        result.textContent="O pagamento ainda não foi confirmado pelo provedor.";
        return;
      }
      if(data.shippingStatus==="shipped" && typeof data.trackingCode==="string" && data.trackingCode){
        result.textContent="Pagamento confirmado. Código de rastreio: "+data.trackingCode;
      }else{
        result.textContent="Pagamento confirmado. Pedido em preparação: o código de rastreio será exibido após a postagem real.";
      }
    }catch{
      result.textContent="Não foi possível consultar o acompanhamento no momento.";
    }
  });
  document.addEventListener("input",ev=>{
    const cpf=ev.target.closest('input[name="cpf"]');
    if(!cpf)return;
    const digits=cpf.value.replace(/\D/g,"").slice(0,11);
    const a=digits.slice(0,3),b=digits.slice(3,6),c=digits.slice(6,9),d=digits.slice(9);
    cpf.value=a+(digits.length>3?"."+b:"")+(digits.length>6?"."+c:"")+(digits.length>9?"-"+d:"");
  });
  document.addEventListener("submit",ev=>{
    const form=ev.target;
    if(form.id!=="customer-form"&&form.id!=="address-form")return;
    ev.preventDefault();
    if(!form.reportValidity())return;
    if(form.id==="customer-form"){
      const ph=String(form.elements.phone?.value||"").replace(/\D/g,"");
      if(ph.length<10||ph.length>11){toast("Digite um telefone válido com DDD.");return;}
      details.customer={
        name:form.elements.fullName.value.trim(),
        document:form.elements.cpf.value.replace(/\D/g,""),
        phone:ph,email:form.elements.email.value.trim()
      };
      checkoutStage=2;
    }else{
      const shippingMethod=form.querySelector('input[name="freight"]:checked')?.value;
      if(!shippingMethod){toast("Selecione o frete antes de continuar.");return;}
      details.address={
        zipcode:form.elements.zip.value,number:form.elements.number.value,
        street:form.elements.street.value.trim(),neighborhood:form.elements.district.value.trim(),
        city:form.elements.city.value.trim(),state:form.elements.state.value
      };
      details.shippingMethod=shippingMethod;
      checkoutStage=3;
    }
    render();
    document.querySelector(checkoutStage===2?"#address-form":".payment-stage")?.scrollIntoView({block:"start",behavior:"smooth"});
  });
  async function pollPayment() {
    if(!activePayment || route()!=="/checkout" || checkoutStage!==3)return;
    if(activePayment.status==="approved" || ["failed","refunded","chargeback"].includes(activePayment.status))return;
    try{
      const response=await fetch("/api/order-status",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({reference:activePayment.reference,accessToken:activePayment.accessToken}),
        cache:"no-store"
      });
      if(!response.ok)return;
      const result=await response.json();
      if(!result.ok)return;
      activePayment.status=result.status;
      const statusEl=document.getElementById("pix-status");
      if(statusEl)statusEl.textContent=result.status==="approved"?"Pagamento confirmado!":"Aguardando confirmação da PinguPag…";
      if(["approved","failed","refunded","chargeback"].includes(result.status)){
        if(paymentCheckTimer){clearInterval(paymentCheckTimer);paymentCheckTimer=null;}
        render();
      }
    }catch{}
  }
  document.addEventListener("click",async ev=>{
    if(ev.target.closest("#pix-copy-button")){
      if(!activePayment?.qrCode)return;
      try{await navigator.clipboard.writeText(activePayment.qrCode);toast("Pix Copia e Cola copiado.");}
      catch{toast("Selecione o código Pix para copiar.");}
      return;
    }
    const btn=ev.target.closest("#pix-generate-button");
    if(!btn)return;
    if(!checkoutConfig.enabled||!details.customer||!details.address||!details.shippingMethod){
      toast("Revise os dados e o frete.");return;
    }
    btn.disabled=true;btn.textContent="GERANDO COBRANÇA...";
    const errorBox=document.getElementById("pix-error");
    if(errorBox)errorBox.textContent="";
    try {
      const response=await fetch("/api/create-pix",{
        method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",
        body:JSON.stringify({items:cart,customer:details.customer,address:details.address,shippingMethod:details.shippingMethod})
      });
      const result=await response.json();
      if(!response.ok || !result.ok)throw new Error(result.message||"Não foi possível emitir o Pix.");
      activePayment={...result,status:"pending"};
      // Não mantenha CPF, endereço ou telefone no armazenamento do navegador.
      details={};render();
      const text=document.getElementById("pix-copy-value");
      if(text)text.value=activePayment.qrCode;
      if(paymentCheckTimer)clearInterval(paymentCheckTimer);
      paymentCheckTimer=setInterval(pollPayment,8000);
    }catch(err) {
      if(errorBox)errorBox.textContent=String(err.message||"Falha ao emitir Pix");
      btn.disabled=false;btn.textContent="GERAR QR CODE PIX";
    }
  });
  fetch("/api/checkout-config",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(config=>{
    if(!config)return;
    checkoutConfig=config;
    if(route()==="/checkout" && checkoutStage===1)render();
  }).catch(()=>{});
  window.addEventListener("popstate",render);
  render();
})();