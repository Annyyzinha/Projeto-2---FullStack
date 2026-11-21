import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { Categoria } from '../models/Categoria.js';

const router = Router();
router.use(autenticar);

router.get('/', async (req, res, next) => {
  try {
    const categorias = await Categoria.listarPorUsuario(req.usuarioId);
    return res.status(200).json(categorias);
  } catch (err) {
    return next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { nome, tipo } = req.body || {};
  const campos = {};

  if (typeof nome !== 'string' || !nome.trim()) {
    campos.nome = 'O nome da categoria é obrigatório.';
  } else if (nome.trim().length > 60) {
    campos.nome = 'O nome da categoria deve ter no máximo 60 caracteres.';
  }

  if (typeof tipo !== 'string' || !['entrada', 'saida'].includes(tipo)) {
    campos.tipo = 'O tipo deve ser entrada ou saida.';
  }

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }

  try {
    const nova = await Categoria.criar({ usuarioId: req.usuarioId, nome, tipo });
    return res.status(201).json(nova);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        erro: 'Categoria duplicada.',
        campos: { nome: 'Você já possui uma categoria com este nome e tipo.' }
      });
    }
    return next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  const { nome, tipo } = req.body || {};
  const campos = {};

  if (typeof nome !== 'string' || !nome.trim()) {
    campos.nome = 'O nome da categoria é obrigatório.';
  } else if (nome.trim().length > 60) {
    campos.nome = 'O nome da categoria deve ter no máximo 60 caracteres.';
  }

  if (typeof tipo !== 'string' || !['entrada', 'saida'].includes(tipo)) {
    campos.tipo = 'O tipo deve ser entrada ou saida.';
  }

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }

  try {
    const existente = await Categoria.buscarPorId(req.params.id, req.usuarioId);
    if (!existente) {
      return res.status(404).json({ erro: 'Categoria não encontrada.', campos: {} });
    }

    if (existente.tipo !== tipo && (await Categoria.temLancamentos(req.params.id, req.usuarioId))) {
      return res.status(409).json({
        erro: 'Não é possível alterar o tipo de uma categoria que já possui lançamentos.',
        campos: { tipo: 'Esta categoria já está vinculada a lançamentos.' }
      });
    }

    const atualizada = await Categoria.atualizar(req.params.id, req.usuarioId, { nome, tipo });
    return res.status(200).json(atualizada);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        erro: 'Categoria duplicada.',
        campos: { nome: 'Você já possui uma categoria com este nome e tipo.' }
      });
    }
    return next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const categoria = await Categoria.buscarPorId(req.params.id, req.usuarioId);
    if (!categoria) {
      return res.status(404).json({ erro: 'Categoria não encontrada.', campos: {} });
    }

    const emUso = await Categoria.temLancamentos(req.params.id, req.usuarioId);
    if (emUso) {
      return res.status(409).json({
        erro: 'Não é possível excluir uma categoria que possui lançamentos associados.',
        campos: {}
      });
    }

    await Categoria.excluir(req.params.id, req.usuarioId);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;