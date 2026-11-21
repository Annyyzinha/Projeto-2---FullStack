export function tratarErros(err, req, res, next) {
  console.error('Erro na API:', err);
  if (res.headersSent) return next(err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      erro: 'JSON inválido no corpo da requisição.',
      campos: {}
    });
  }

  const status = err.status || 500;
  return res.status(status).json({
    erro: status >= 500 ? 'Erro interno no servidor.' : err.message,
    campos: err.campos || {}
  });
}