import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { FonteDestino } from '../models/FonteDestino.js';

const router = Router();
router.use(autenticar);

function validarFonte(body = {}) {
  const { nome, tipo, diaFechamento, diaVencimento, limite } = body || {};
  const campos = {};

  if (typeof nome !== 'string' || !nome.trim()) {
    campos.nome = 'O nome é obrigatório.';
  } else if (nome.trim().length > 60) {
    campos.nome = 'O nome deve ter no máximo 60 caracteres.';
  }

  if (typeof tipo !== 'string' || !['renda', 'conta', 'cartao_credito'].includes(tipo)) {
    campos.tipo = 'Tipo inválido (use renda, conta ou cartao_credito).';
  }

  if (tipo === 'cartao_credito') {
    const df = Number(diaFechamento);
    const dv = Number(diaVencimento);
    const lim = Number(limite);

    if (!Number.isInteger(df) || df < 1 || df > 31) {
      campos.diaFechamento = 'Informe o dia de fechamento entre 1 e 31.';
    }
    if (!Number.isInteger(dv) || dv < 1 || dv > 31) {
      campos.diaVencimento = 'Informe o dia de vencimento entre 1 e 31.';
    }
    if (!Number.isFinite(lim) || Math.round(lim * 100) < 1) {
      campos.limite = 'Informe um limite de pelo menos R$ 0,01.';
    }
  }

  return campos;
}

router.get('/', async (req, res, next) => {
  try {
    const lista = await FonteDestino.listarPorUsuario(req.usuarioId);
    return res.status(200).json(lista);
  } catch (err) {
    return next(err);
  }
});

router.post('/', async (req, res, next) => {
  const body = req.body || {};
  const campos = validarFonte(body);
  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }

  try {
    const { nome, tipo, diaFechamento, diaVencimento, limite, reserva } = body;
    const nova = await FonteDestino.criar({
      usuarioId: req.usuarioId,
      nome,
      tipo,
      diaFechamento,
      diaVencimento,
      limite,
      reserva
    });
    return res.status(201).json(nova);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        erro: 'Fonte/Destino já existe.',
        campos: { nome: 'Você já possui uma fonte/destino com este nome.' }
      });
    }
    return next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  const body = req.body || {};
  const campos = validarFonte(body);
  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }

  try {
    const existente = await FonteDestino.buscarPorId(req.params.id, req.usuarioId);
    if (!existente) {
      return res.status(404).json({ erro: 'Fonte/Destino não encontrada.', campos: {} });
    }

    const { nome, tipo, diaFechamento, diaVencimento, limite, reserva } = body;
    const atualizada = await FonteDestino.atualizar(req.params.id, req.usuarioId, {
      nome,
      tipo,
      diaFechamento,
      diaVencimento,
      limite,
      reserva
    });
    return res.status(200).json(atualizada);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        erro: 'Fonte/Destino já existe.',
        campos: { nome: 'Você já possui uma fonte/destino com este nome.' }
      });
    }
    return next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existente = await FonteDestino.buscarPorId(req.params.id, req.usuarioId);
    if (!existente) {
      return res.status(404).json({ erro: 'Fonte/Destino não encontrada.', campos: {} });
    }

    const emUso = await FonteDestino.temLancamentos(req.params.id, req.usuarioId);
    if (emUso) {
      return res.status(409).json({
        erro: 'Não é possível excluir pois existem lançamentos vinculados.',
        campos: {}
      });
    }

    await FonteDestino.excluir(req.params.id, req.usuarioId);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;