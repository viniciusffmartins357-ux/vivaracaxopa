# Integração Life Anéis — Supabase + PinguPag + Vercel

Este código foi preparado para a loja Life Anéis. **O Pix começa bloqueado.** Ele só fica disponível após configurar o banco, verificar os dados do recebedor e definir PIX_LIVE_ENABLED=true.

## 1. Criar e integrar o banco de pedidos
1. Entre em https://supabase.com/dashboard e crie um projeto Supabase.
2. Vá em **SQL Editor → New query**. Abra `supabase/life_orders.sql` neste repositório, copie todo o conteúdo e clique em **Run**.
3. No Supabase, entre em **Project Settings / Connect / API Keys** e copie a **Project URL** e a chave **secret** (`sb_secret_...`). Use exclusivamente a chave de servidor, nunca uma chave pública.
4. Na Vercel, no projeto da loja, acesse **Settings → Environment Variables**, selecione Production e cadastre:
   - `SUPABASE_URL`: URL HTTPS do projeto (sem barra final).
   - `SUPABASE_SECRET_KEY`: chave secret do Supabase. **Nunca coloque essa chave no navegador ou GitHub.**
5. Salve as variáveis. Depois faça **Redeploy** do último deployment para que as funções recebam as novas variáveis.

## 2. Configurar PinguPag — sem divulgar chaves
Além das variáveis já cadastradas, configure na mesma página da Vercel:
- `PINGUPAG_API_KEY` — chave da API (Secret Key).
- `PINGUPAG_PRODUCT_HASH` — hash do produto.
- `PINGUPAG_API_BASE_URL` — origem HTTPS oficial da API informada na documentação PinguPag, **confirme o endereço diretamente com o suporte antes de enviar dados de clientes**. A documentação publicada usa um domínio diferente de pingupag.com.
- `PINGUPAG_SELLER_DOCUMENT` — CPF/CNPJ **do recebedor cadastrado na PinguPag**, somente números.
- `MERCHANT_LEGAL_NAME` — nome ou razão social **exatamente como consta no cadastro do recebedor**. O site exibe Life Anéis como nome da loja e a razão social no pagamento.
- `PUBLIC_STORE_URL` — domínio público HTTPS definitivo do site, por exemplo `https://vivaracaxopa.vercel.app` (sem barra final).
- `PINGUPAG_WEBHOOK_TOKEN` — segredo aleatório longo (mínimo 24 caracteres), gerado no seu gerenciador de senhas. Não compartilhe.
- `PIX_LIVE_ENABLED` — mantenha inicialmente `false`.

**Importante:** a aplicação chama `GET /gateway/v1/seller` no servidor e não cria cobrança se o nome e documento cadastrado na gateway diferirem dos configurados. O CPF do comprador não fica armazenado no banco da loja; é encaminhado à gateway apenas no momento de criar a cobrança.

## 3. Definir frete corretamente
A loja anuncia frete grátis a partir de **R$ 299,00**, calculado no servidor. Para pedidos abaixo disso, é necessário configurar um preço real de frete antes de cobrar o cliente:
- `SHIP_STANDARD_CENTS` — frete padrão em **centavos**. Por exemplo, um valor real de R$ 22,00 seria `2200`.
- `SHIP_EXPRESS_CENTS` — frete expresso em centavos, opcional.

Esses valores são fixos e devem refletir os preços que sua loja efetivamente consegue oferecer. Caso precise de preço por CEP/transportadora, substitua os valores fixos por uma cotação de frete real antes de ativar compras. A loja **não inventa preços ou prazos**: sem opção configurada, o pedido abaixo de R$ 299 não gera cobrança.

## 4. Webhook PinguPag
Depois de cadastrar as variáveis e publicar a função, no painel da PinguPag cadastre a URL:

`https://DOMINIO-DO-SEU-SITE/api/pingupag-webhook?token=SEU_SEGREDO`

Substitua o domínio pelo valor de `PUBLIC_STORE_URL` e `SEU_SEGREDO` pelo mesmo `PINGUPAG_WEBHOOK_TOKEN` configurado na Vercel. Não coloque o segredo em prints públicos ou conversas.

A função processa `POST` e confirma o pagamento consultando a PinguPag com a chave secreta, conferindo **referência e valor** no banco. **Não confia somente no conteúdo do webhook.**

## 5. Verificação e ativação
- Confira que `https://SEU-DOMINIO/api/checkout-config` retorna `enabled:false` enquanto `PIX_LIVE_ENABLED=false`. Isso é esperado.
- Verifique com a PinguPag se sua conta está ativa e se existe ambiente de testes para cobrar sem movimentar dinheiro. A documentação pública consultada não descreve um sandbox.
- Confirme os dados da empresa recebedora, os preços de frete, os produtos e as responsabilidades de entrega.
- Só após banco e webhook estarem configurados, em Vercel altere `PIX_LIVE_ENABLED` para `true` e faça Redeploy.
- Abra `/api/checkout-config` novamente. Se retornar `enabled:false`, verifique as credenciais, a tabela SQL, o nome/documento do vendedor e os Logs da Vercel.
- Faça um pedido de teste autorizado, confira o valor exato do Pix, a confirmação do webhook na tabela `public.life_orders` e a atualização do status no checkout.
- Nunca marque um pedido como pago manualmente sem verificar a transação no servidor.

## 6. Rastreio e notificações
A confirmação Pix atualiza o campo `status` do pedido na tabela `life_orders`. Para mostrar o rastreio após a postagem, o vendedor adiciona o código **real** da transportadora em `tracking_code` e muda `shipping_status` para `shipped` no painel do Supabase. O cliente utiliza seu token de acompanhamento na página `/rastreio`.

Notificação automática por e-mail/WhatsApp para o vendedor **não está implementada**. O webhook atualiza o banco e o checkout, não envia mensagens externas.

## Observações de segurança
- Não exponha `SUPABASE_SECRET_KEY`, `PINGUPAG_API_KEY` ou `PINGUPAG_WEBHOOK_TOKEN` no frontend.
- A tabela `life_orders` possui RLS habilitado e não permite acesso anônimo.
- O checkout não usa o valor ou frete informado pelo cliente para calcular a cobrança; tudo é recalculado no servidor.
- Não ative cobranças reais em nome de um terceiro: use a identificação e a conta recebedora corretas.
- **Ainda é necessário configurar medidas contra abuso/rate limit (por exemplo, Vercel Firewall) para produção com tráfego significativo.**
