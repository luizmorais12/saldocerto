# 🚀 GUIA DE CONFIGURAÇÃO KIWIFY & SALDOCERTO

Este guia explica exatamente como conectar o produto da **Kiwify** com o **SaldoCerto** para que:
1. O cliente compre na Kiwify por **R$ 19,90/mês**.
2. Seja redirecionado automaticamente para ativar sua conta na página de pós-venda.
3. Ninguém consiga se cadastrar ou acessar o sistema sem ter pago.

---

## 1. Configurar a Página de Redirecionamento (Página de Obrigado)

Assim que o cliente paga no PIX ou Cartão, a Kiwify redireciona a tela dele direto para ativar a conta no SaldoCerto.

1. Acesse o seu painel da **Kiwify** (https://dashboard.kiwify.com.br).
2. Clique no menu **Produtos** e selecione o seu produto **SaldoCerto**.
3. Na aba **Configurações** (ou aba **Links / Checkout**):
   * Localize o campo **"URL da Página de Obrigado personalizada"** ou **"URL de entrega do produto"**.
   * Cole a URL da página de ativação do seu site:
     ```text
     https://salldocerto.netlify.app/obrigado.html
     ```
     *(Substitua `https://seusite.com.br` pelo domínio onde seu site estiver hospedado, ou use a URL temporária se estiver publicando no Vercel/Netlify/Host)*
4. Clique em **Salvar alterações**.

> **O que acontece agora:** Assim que o cliente pagar, a Kiwify redireciona para a página `obrigado.html` já preenchendo o nome e e-mail do comprador, pedindo apenas para ele criar a senha de acesso!

---

## 2. Como Funciona a Proteção contra Acessos Gratuitos (Paywall)

Implementamos uma barreira dupla no código:

1. **Bloqueio em `cadastro.html`:**
   * Se alguém tentar entrar em `cadastro.html` sem ter comprado, a página exibe um banner avisando que o acesso é exclusivo para assinantes.
   * Ao tentar registrar um e-mail não autorizado, o sistema bloqueia e oferece o botão para assinar por R$ 19,90 na Kiwify.
2. **Bloqueio no Dashboard e Ferramentas (`requireAuth` e `requireSubscription`):**
   * Se qualquer usuário logar sem uma assinatura ativa, uma tela de bloqueio (Paywall Modal) aparece no meio da tela com o link para a Kiwify, impedindo o uso das ferramentas.
3. **Página `obrigado.html`:**
   * O cliente que comprou na Kiwify tem sua conta ativada automaticamente com status `active` e entra direto no sistema.

---

## 3. (Opcional) Configurar Webhook Automático na Kiwify

Para cancelamentos automáticos (caso o cliente cancele a mensalidade na Kiwify e o acesso dele seja revogado instantaneamente):

1. Na Kiwify, vá em **Apps** > **Webhooks**.
2. Clique em **Criar Webhook**.
3. Nome: `SaldoCerto Ativação`
4. URL do Webhook:
   ```text
   https://ersospbpdwniuoppvunq.supabase.co/functions/v1/kiwify-webhook
   ```
5. Selecione os eventos:
   * **Compra aprovada** (order_approved)
   * **Assinatura cancelada** (subscription_canceled)
   * **Assinatura atrasada** (subscription_past_due)
   * **Reembolso** (order_refunded)
6. Clique em **Salvar Webhook**.

---

## 4. Como Testar uma Compra

1. No painel da Kiwify, na aba **Links**, copie o link de checkout:
   `https://pay.kiwify.com.br/uKfAHEc`
2. Você pode gerar um PIX de teste ou colocar um cupom de 100% de desconto na Kiwify para testar sem custo.
3. Ao concluir, verifique se a Kiwify te redireciona para `/obrigado.html`.
4. Digite uma senha e entre no Dashboard!
