(() => {
  "use strict";

  const PRICE = 37.86;
  const STORAGE = "aneis-life-cart-v3";
  const sizes = [14, 16, 18, 20, 22];
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
  let toastTimer;

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
    if(route()==="/carrinho" || route()==="/checkout"){
      return '<header class="checkout-brandbar"><a href="/" data-route="/" class="checkout-brand">VIVARA</a>'+
        '<a href="/" data-route="/" class="checkout-brand-signature">Life</a></header>';
    }
    return '<div class="shipping-bar">FRETE GRÁTIS EM COMPRAS A PARTIR DE R$ 299</div>'+
      '<header class="site-header"><div class="header-content">'+
      '<button type="button" id="menu-toggle" class="header-link" aria-label="Abrir menu da loja" aria-controls="menu-panel" aria-expanded="false">'+menuIcon+'</button>'+
      '<a data-route="/" href="/" class="logo" aria-label="Ir para a loja"><span>Life</span><small>VIVARA</small></a>'+
      '<div class="header-actions"><span class="account-symbol" title="Área de conta ainda não disponível">'+userIcon+'</span>'+
      '<a data-route="/carrinho" href="/carrinho" class="bag-link" aria-label="Abrir minha sacola">'+bagIcon+
      '<span class="bag-count">'+quantity()+'</span></a></div></div>'+
      '<nav id="menu-panel" class="menu-panel" hidden><a href="/" data-route="/">Ver coleção</a>'+
      '<a href="/carrinho" data-route="/carrinho">Minha sacola ('+quantity()+')</a></nav></header>';
  }
  function footer() {
    return '<footer class="site-footer"><strong>COLEÇÃO LIFE</strong><p>Vitrine independente • Compra online com pagamento a configurar</p><a data-route="/" href="/">Voltar à coleção</a></footer>';
  }
  function image(p,alt) {
    return '<img src="'+p.img+'" alt="'+(alt||p.name)+'" loading="lazy" decoding="async" />';
  }
  function selectSize(p,cls) {
    return '<label class="sr-only" for="size-'+cls+'-'+p.id+'">Tamanho do '+p.name+'</label>'+
      '<select id="size-'+cls+'-'+p.id+'" class="size-select" data-size-for="'+p.id+'">'+
      '<option value="">Tamanho: selecione</option>'+
      sizes.map(n=>'<option value="'+n+'">'+n+'</option>').join("")+'</select>';
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
      '<h1>ANÉIS LIFE</h1><p>8 produtos</p></div>'+
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
      '<p class="muted">Tamanho: '+item.size+'</p></div>'+
      '<button aria-label="Remover '+p.name+'" class="remove" data-remove="'+key+'">×</button></div>'+
      '<div class="cart-item-bottom"><div class="qty"><button aria-label="Diminuir quantidade" data-change-qty="'+key+'" data-delta="-1">−</button>'+
      '<span>'+item.qty+'</span><button aria-label="Aumentar quantidade" data-change-qty="'+key+'" data-delta="1">+</button></div>'+
      '<strong>'+money(PRICE*item.qty)+'</strong></div></div></article>';
  }
  function recommends() {
    const inCart=new Set(cart.map(i=>i.id));
    return products.filter(p=>!inCart.has(p.id)).slice(0,2);
  }
  function upsellCard(p) {
    return '<div class="upsell-card"><div class="upsell-image">'+image(p)+'</div><div class="upsell-body"><span class="mini-eyebrow">COMPLETE SUA COLEÇÃO</span>'+
      '<strong>'+p.name+'</strong><p>'+money(PRICE)+'</p>'+
      '<div class="upsell-controls">'+selectSize(p,"upsell")+
      '<button type="button" class="btn btn-outline" data-add="'+p.id+'">ADICIONAR</button></div></div></div>';
  }
  function upsellSection() {
    const picks=recommends();
    if(!picks.length)return '';
    return '<div class="upsell"><h3>Combine com mais um anel</h3><p>Adicione um modelo da coleção ao mesmo pedido.</p>'+
      picks.map(upsellCard).join("")+'</div>';
  }
  function summary(inCheckout=false) {
    const value=subtotal(), missing=Math.max(0,Math.round((299-value)*100)/100);
    return '<aside class="summary"><h3>RESUMO DO PEDIDO</h3>'+
      '<div class="summary-row"><span>Subtotal ('+quantity()+' '+(quantity()===1?'item':'itens')+')</span><strong>'+money(value)+'</strong></div>'+
      '<div class="summary-row"><span>Frete</span><span>'+(value>=299?'Grátis':'A calcular')+'</span></div>'+
      '<div class="summary-divider"></div>'+
      '<div class="summary-row total"><span>Total dos produtos</span><strong>'+money(value)+'</strong></div>'+
      (missing>0?'<p class="shipping-hint">Faltam '+money(missing)+' em produtos para atingir o frete grátis.</p>':'<p class="shipping-hint success">Seu pedido atingiu a faixa de frete grátis.</p>')+
      (!inCheckout?'<a data-route="/checkout" href="/checkout" class="btn btn-green">PROSSEGUIR PARA O CHECKOUT</a>':upsellSection())+
      '<div class="safe-note">O valor final da entrega será confirmado no checkout.</div></aside>';
  }
  function cartPage() {
    return header()+'<main class="page-container short-page"><div class="page-heading"><h1>MINHA SACOLA</h1>'+
      '<span>'+quantity()+' '+(quantity()===1?'item':'itens')+'</span></div>'+
      (!cart.length?'<section class="empty-cart"><h2>Sua sacola está vazia.</h2><p>Escolha um anel para começar.</p><a data-route="/" href="/" class="btn btn-coral">VER ANÉIS</a></section>':
      '<div class="checkout-layout"><section><div class="cart-list">'+cart.map(cartLine).join("")+'</div>'+
      '<a data-route="/" href="/" class="back-link">Continuar comprando</a>'+
      '<div class="cart-extra">'+upsellSection()+'</div></section>'+summary()+'</div>')+'</main>'+footer();
  }
  function steps() {
    return '<div class="steps"><span class="'+(checkoutStage===1?'current':'')+'">1. Dados</span>'+
      '<span class="'+(checkoutStage===2?'current':'')+'">2. Endereço</span>'+
      '<span class="'+(checkoutStage===3?'current':'')+'">3. Pagamento</span></div>';
  }
  function customerStage() {
    return '<form id="customer-form" class="form-card" autocomplete="off">'+
      '<h2><span class="step-dot">1</span> DADOS DO CLIENTE</h2>'+
      '<p class="form-notice">Demonstração: estes dados não são enviados nem armazenados.</p>'+
      '<label>Nome completo<input name="fullName" type="text" autocomplete="off" required minlength="3" maxlength="100" placeholder="Seu nome"/></label>'+
      '<label>E-mail<input name="email" type="email" autocomplete="off" required maxlength="120" placeholder="voce@exemplo.com"/></label>'+
      '<label>Telefone com DDD<input name="phone" type="tel" autocomplete="off" inputmode="tel" required minlength="10" maxlength="20" placeholder="(00) 00000-0000"/></label>'+
      '<button class="btn btn-green" type="submit">CONTINUAR</button></form>';
  }
  function addressStage() {
    return '<form id="address-form" class="form-card" autocomplete="off">'+
      '<h2><span class="step-dot">2</span> ENDEREÇO E FRETE</h2>'+
      '<p class="form-notice">Prévia do checkout. Ainda não há consulta de CEP nem cotação de transportadora.</p>'+
      '<div class="input-row"><label>CEP<input name="zip" required inputmode="numeric" pattern="[0-9]{5}-?[0-9]{3}" placeholder="00000-000"/></label>'+
      '<label>Número<input name="number" required maxlength="12" placeholder="Nº"/></label></div>'+
      '<label>Rua<input name="street" required maxlength="150" placeholder="Endereço"/></label>'+
      '<div class="input-row"><label>Bairro<input name="district" required maxlength="80" placeholder="Bairro"/></label>'+
      '<label>Cidade<input name="city" required maxlength="80" placeholder="Cidade"/></label></div>'+
      '<label>Estado<select name="state" required><option value="">Selecionar</option>'+
      ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(x=>'<option value="'+x+'">'+x+'</option>').join("")+'</select></label>'+
      '<fieldset class="delivery-preview"><legend>OPÇÕES DE FRETE</legend>'+
      (subtotal()>=299?'<label class="freight-choice"><input type="radio" name="freight" value="free" required checked><span><strong>Frete grátis</strong><small>Disponível para pedidos a partir de R$ 299. Prazo a confirmar.</small></span><b>Grátis</b></label>':'')+
      '<label class="freight-choice"><input type="radio" name="freight" value="standard" required><span><strong>Entrega padrão</strong><small>Custo e prazo dependem de cotação real.</small></span><b>A calcular</b></label>'+
      '<label class="freight-choice"><input type="radio" name="freight" value="express" required><span><strong>Entrega expressa</strong><small>Disponibilidade e prazo a confirmar.</small></span><b>A calcular</b></label>'+
      '<p class="freight-disclaimer">Estas opções demonstram o fluxo; não representam cotações nem serviços contratados.</p></fieldset>'+
      '<button type="submit" class="btn btn-green">CONTINUAR</button>'+
      '<button type="button" class="text-button" data-prev>Voltar aos dados</button></form>';
  }
  function paymentStage() {
    return '<section class="form-card payment-stage"><h2><span class="step-dot">3</span> PAGAMENTO</h2>'+
      '<div class="payment-info"><strong>Pedido preparado — pagamento ainda não habilitado</strong>'+
      '<p>Para aceitar pedidos de verdade, é necessário integrar um checkout hospedado por um provedor de pagamentos, com valores calculados no servidor e frete confirmado.</p>'+
      '<p>Não digite dados de cartão ou CPF nesta demonstração.</p></div>'+
      '<button type="button" class="btn btn-green" disabled>AGUARDANDO INTEGRAÇÃO DE PAGAMENTO</button>'+
      '<button type="button" class="text-button" data-prev>Voltar ao endereço</button></section>';
  }
  function checkoutPage() {
    if(!cart.length)return cartPage();
    return header()+'<main class="page-container short-page"><div class="page-heading"><h1>CHECKOUT</h1><span>'+quantity()+' itens na sacola</span></div>'+
      steps()+'<div class="checkout-layout"><div class="checkout-main">'+
      '<div class="checkout-products">'+cart.map(i=>'<div class="checkout-product">'+image(byId[i.id])+
        '<div><strong>'+byId[i.id].name+'</strong><small>Tamanho '+i.size+' · Quantidade '+i.qty+'</small></div><b>'+money(i.qty*PRICE)+'</b></div>').join("")+'</div>'+
      (checkoutStage===1?customerStage():checkoutStage===2?addressStage():paymentStage())+
      '<a href="/carrinho" data-route="/carrinho" class="back-link">Voltar à sacola</a></div>'+summary(true)+'</div></main>'+footer();
  }
  function render() {
    const path=route();
    const p=path.startsWith("/produto/")?byId[path.split("/")[2]]:null;
    let content=path==="/carrinho"?cartPage():path==="/checkout"?checkoutPage():p?productPage(p):catalogue();
    root.innerHTML=content+'<div role="status" class="toast" aria-live="polite"></div>';
    document.title=(path==="/carrinho"?"Minha sacola":path==="/checkout"?"Checkout":p?p.name:"Anéis e presentes")+" | Coleção Life";
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
        const onCatalog=route()==="/";
        render();
        toast("Anel adicionado à sacola.");
        if(!onCatalog && route().startsWith("/produto/"))navigate("/carrinho");
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
    if(ev.target.closest("[data-prev]")){checkoutStage=Math.max(1,checkoutStage-1);render();return;}
  });
  document.addEventListener("submit",ev=>{
    const form=ev.target;
    if(form.id!=="customer-form"&&form.id!=="address-form")return;
    ev.preventDefault();
    if(!form.reportValidity())return;
    if(form.id==="customer-form"){
      const d=new FormData(form);
      const ph=String(d.get("phone")||"").replace(/\D/g,"");
      if(ph.length<10||ph.length>11){toast("Digite um telefone válido com DDD.");return;}
      details={name:d.get("fullName"),email:d.get("email")};
      checkoutStage=2;
    }else{
      checkoutStage=3;
    }
    window.scrollTo({top:0,behavior:"instant"});render();
  });
  window.addEventListener("popstate",render);
  render();
})();