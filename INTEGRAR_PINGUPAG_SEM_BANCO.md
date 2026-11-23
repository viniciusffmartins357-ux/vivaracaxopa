# Life Anéis | Pix + acompanhamento do pedido SEM BANCO

## O que foi alterado
O cliente recebe um **código de pedido** no mesmo momento em que a PinguPag gera o QR Code Pix.
O código é uma referência aleatória de 96 bits no formato `LA-...`, registrada no campo `reference` da transação.
A página `/rastreio` consulta o status diretamente na PinguPag por meio de `list_transactions&external_id`, usando a chave secreta **somente no servidor**.

**O código não é rastreio de transportadora.** Ele acompanha somente o **pagamento**:
- Pix criado: aguardando pagamento.
- Pix aprovado: pagamento confirmado pela PinguPag.
- Cancelado, expirado ou estornado: a consulta informa que não está aprovado.

O envio da encomenda e eventual código de transporte dependem de postagem real e precisam ser informados pela loja.

## O que a PinguPag registra
A criação da transação inclui `reference`, resumo dos itens e tamanhos no campo `description`, valor recalculado pelo servidor, cliente e endereço. Verifique no painel da gateway que essas informações estão disponíveis para separar, enviar e prestar suporte aos pedidos. Nenhum pedido é salvo em Supabase pela loja.

## Variáveis de ambiente (Vercel)
Cadastre em **Project Settings → Environment Variables → Production**:
- `PINGUPAG_API_KEY` — Secret Key da PinguPag.
- `PINGUPAG_PRODUCT_HASH` — hash do produto cadastrado.
- `PINGUPAG_API_BASE_URL` — origem HTTPS da API PinguPag. Confirme **diretamente com o suporte** antes de enviar dados pessoais; a documentação cita outro domínio.
- `PINGUPAG_WEBHOOK_TOKEN` — segredo aleatório de no mínimo 24 caracteres.
- `PINGUPAG_SELLER_DOCUMENT` — CPF/CNPJ do recebedor configurado na PinguPag, somente dígitos.
- `MERCHANT_LEGAL_NAME` — nome/razão social exatamente igual ao retornado por `GET /gateway/v1/seller`.
- `PUBLIC_STORE_URL` — URL HTTPS de produção da loja, sem barra final.
- `SHIP_STANDARD_CENTS` — valor real de frete padrão, em centavos.
- `SHIP_EXPRESS_CENTS` — opcional: frete expresso real, em centavos.
- `PIX_LIVE_ENABLED` — deixe `false` até validar pagamento, conta recebedora, frete e a API.

**Não precisa configurar** `SUPABASE_URL` ou `SUPABASE_SECRET_KEY`. O projeto não depende mais dessas variáveis. Se elas estiverem na Vercel e não forem utilizadas por outro projeto, remova-as para reduzir exposição de segredos.

## Webhook
URL já prevista na função de criação:
`https://SEU-DOMINIO/api/pingupag-webhook?token=SEU_SEGREDO`

Use o domínio da variável `PUBLIC_STORE_URL` e o mesmo valor de `PINGUPAG_WEBHOOK_TOKEN`. O webhook valida o token e **consulta a PinguPag**, sem confiar em uma notificação isolada. Não persiste pedidos, pois o status é consultado diretamente pela tela do cliente.

## Diagnóstico e validação
Acesse `/api/integration-check` para conferir se as variáveis estão presentes. O resultado `database: "not_required"` é esperado.
Abra `/api/checkout-config` para conferir se a conta recebedora está validada. O campo `enabled` será `false` enquanto `PIX_LIVE_ENABLED=false`.

Antes de habilitar cobranças reais, confirme a titularidade da conta e domínio da gateway, a disponibilidade dos itens, preços, frete e entrega. Valide com a PinguPag em ambiente de teste e confira um fluxo completo:
1. Criar o Pix para um pedido autorizado.
2. Conferir no portal da PinguPag a referência `LA-...` e os dados do pedido.
3. Conferir que a tela de acompanhamento mostra pagamento pendente antes da confirmação.
4. Após uma aprovação real, conferir que o mesmo código mostra o status atualizado.
5. Para envio físico, forneça **um rastreio real de transportadora** quando houver postagem. A API PinguPag não fornece isso.

Somente depois dos testes altere `PIX_LIVE_ENABLED=true` e faça redeploy.

**Segurança:** nunca compartilhe chaves de API ou o segredo do webhook em prints públicos. Configure proteção contra abuso/rate limiting para APIs de cobrança.
