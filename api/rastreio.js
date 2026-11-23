// Endpoint de acompanhamento sem dados fictícios.
// Esta rota só poderá devolver dados de pedidos depois da integração com
// uma base privada de pedidos, webhook verificado do gateway e transportadora.
// Nunca confie no status informado pelo navegador para liberar rastreio.
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, private, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }
  // Falta configurar um repositório de pedidos e o provedor de entregas.
  // Não retorne "approved" ou códigos de rastreio sem verificação do servidor.
  return res.status(503).json({ ok: false, error: "tracking_not_configured" });
}
