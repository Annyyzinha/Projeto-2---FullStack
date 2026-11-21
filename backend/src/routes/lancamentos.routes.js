import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { Lancamento } from '../models/Lancamento.js';
import { Categoria } from '../models/Categoria.js';
import { FonteDestino } from '../models/FonteDestino.js';
import { calcularFatura } from '../config/utils.js';

const router = Router();
router.use(autenticar);

function dataRealValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [ano, mes, dia] = valor.split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    d.getUTCFullYear() === ano &&
    d.getUTCMonth() === mes - 1 &&
    d.getUTCDate() === dia
  );
}

async function validarLancamento(body = {}, usuarioId, exigirParcelas = true) {
  const { tipo, descricao, valor, data, categoriaId, fonteDestinoId, totalParcelas } = body || {};
  const campos = {};

  if (!['entrada', 'saida'].includes(tipo)) {
    campos.tipo = 'O tipo deve ser entrada ou saida.';
  }
  if (typeof descricao !== 'string' || !descricao.trim()) {
    campos.descricao = 'A descrição é obrigatória.';
  } else if (descricao.trim().length > 120) {
    campos.descricao = 'A descrição deve ter no máximo 120 caracteres.';
  }

  const numValor = Number(valor);
  const totalCentavos = Math.round(numValor * 100);
  if (!Number.isFinite(numValor) || totalCentavos < 1) {
    campos.valor = 'O valor deve ser de pelo menos R$ 0,01.';
  }
  if (!dataRealValida(data)) {
    campos.data = 'Informe uma data válida no formato AAAA-MM-DD.';
  }

  const categoria =
    typeof categoriaId === 'string'
      ? await Categoria.buscarPorId(categoriaId, usuarioId)
      : null;
  if (!categoria) {
    campos.categoriaId = 'Categoria não encontrada para este usuário.';
  } else if (tipo && categoria.tipo !== tipo) {
    campos.categoriaId = `A categoria informada é de ${categoria.tipo}, mas o lançamento é de ${tipo}.`;
  }

  const fonte =
    typeof fonteDestinoId === 'string'
      ? await FonteDestino.buscarPorId(fonteDestinoId, usuarioId)
      : null;
  if (!fonte) {
    campos.fonteDestinoId = 'Fonte/Destino não encontrada para este usuário.';
  }

  if (exigirParcelas && totalParcelas !== undefined) {
    const nParcelas = Number(totalParcelas);
    if (!Number.isInteger(nParcelas) || nParcelas < 1 || nParcelas > 48) {
      campos.totalParcelas = 'O número de parcelas deve ser um inteiro entre 1 e 48.';
    } else if (nParcelas > 1 && (tipo !== 'saida' || (fonte && fonte.tipo !== 'cartao_credito'))) {
      campos.totalParcelas = 'Apenas saídas no cartão de crédito podem ser parceladas.';
    } else if (!campos.valor && totalCentavos < nParcelas) {
      campos.totalParcelas =
        'O valor total é insuficiente para essa quantidade de parcelas (mínimo de R$ 0,01 por parcela).';
    }
  }

  return { campos, categoria, fonte };
}

router.get('/faturas/previsao', async (req, res, next) => {
  try {
    const meses = Math.min(24, Math.max(3, Number(req.query.meses) || 3));
    const fontes = await FonteDestino.listarPorUsuario(req.usuarioId);
    const cartoes = fontes.filter((f) => f.tipo === 'cartao_credito');

    const saidasCartao = await Lancamento.Model.find({
      usuarioId: req.usuarioId,
      tipo: 'saida',
      fonteDestinoId: { $in: cartoes.map((c) => c.id) }
    }).sort({ data: 1, parcelaAtual: 1 });

    const hojeISO = new Date().toISOString().slice(0, 10);

    const resultado = cartoes.map((cartao) => {
      const comprasDoCartao = saidasCartao.filter(
        (l) => l.fonteDestinoId.toString() === cartao.id
      );

      const mapaFaturas = {};

      for (let k = 1; k <= meses + 1; k++) {
        const infoBase = calcularFatura(hojeISO, cartao, k);
        mapaFaturas[infoBase.referencia] = {
          referencia: infoBase.referencia,
          fechamento: infoBase.fechamento,
          vencimento: infoBase.vencimento,
          totalCentavos: 0,
          lancamentos: []
        };
      }

      let limiteUtilizadoCentavos = 0;

      for (const compra of comprasDoCartao) {
        const valorCentavos =
          compra.valorCentavos ?? Math.round(Number(compra.valor) * 100);
        const infoFatura = calcularFatura(compra.data, cartao, compra.parcelaAtual);

        if (infoFatura.vencimento >= hojeISO) {
          limiteUtilizadoCentavos += valorCentavos;
        }

        if (!mapaFaturas[infoFatura.referencia]) {
          mapaFaturas[infoFatura.referencia] = {
            referencia: infoFatura.referencia,
            fechamento: infoFatura.fechamento,
            vencimento: infoFatura.vencimento,
            totalCentavos: 0,
            lancamentos: []
          };
        }

        mapaFaturas[infoFatura.referencia].totalCentavos += valorCentavos;
        mapaFaturas[infoFatura.referencia].lancamentos.push({
          id: compra._id.toString(),
          descricao: compra.descricao,
          dataCompra: compra.data,
          valor: Number((valorCentavos / 100).toFixed(2)),
          parcelaAtual: compra.parcelaAtual,
          totalParcelas: compra.totalParcelas,
          indicacaoParcela: `${compra.descricao} — ${compra.parcelaAtual}/${compra.totalParcelas}`
        });
      }

      const faturasOrdenadas = Object.values(mapaFaturas)
        .filter((f) => f.vencimento >= hojeISO)
        .sort((a, b) => a.referencia.localeCompare(b.referencia))
        .slice(0, meses + 1)
        .map((f) => ({
          referencia: f.referencia,
          fechamento: f.fechamento,
          vencimento: f.vencimento,
          total: Number((f.totalCentavos / 100).toFixed(2)),
          lancamentos: f.lancamentos
        }));

      const limiteTotalCentavos = Math.round(Number(cartao.limite) * 100);
      const limiteUtilizado = Number((limiteUtilizadoCentavos / 100).toFixed(2));
      const limiteDisponivel = Number(
        ((limiteTotalCentavos - limiteUtilizadoCentavos) / 100).toFixed(2)
      );

      return {
        cartao: {
          id: cartao.id,
          nome: cartao.nome,
          diaFechamento: cartao.diaFechamento,
          diaVencimento: cartao.diaVencimento,
          limite: cartao.limite,
          limiteUtilizado,
          limiteDisponivel
        },
        faturas: faturasOrdenadas
      };
    });

    return res.status(200).json(resultado);
  } catch (err) {
    return next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    let { inicio, fim, tipo, categoriaId, fonteDestinoId, pagina } = req.query;
    const campos = {};

    if (!inicio && !fim) {
      const hoje = new Date();
      const ano = hoje.getUTCFullYear();
      const mes = String(hoje.getUTCMonth() + 1).padStart(2, '0');
      const ultimoDia = new Date(Date.UTC(ano, hoje.getUTCMonth() + 1, 0)).getUTCDate();
      inicio = `${ano}-${mes}-01`;
      fim = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`;
    } else {
      if (inicio && !dataRealValida(inicio)) {
        campos.inicio = 'Data inicial inválida. Use AAAA-MM-DD.';
      }
      if (fim && !dataRealValida(fim)) {
        campos.fim = 'Data final inválida. Use AAAA-MM-DD.';
      }
      if (inicio && fim && !campos.inicio && !campos.fim && inicio > fim) {
        campos.fim = 'A data final não pode ser anterior à data inicial.';
      }
    }

    if (tipo !== undefined && tipo !== '' && !['entrada', 'saida'].includes(tipo)) {
      campos.tipo = 'Filtro de tipo inválido (use entrada ou saida).';
    }

    if (Object.keys(campos).length > 0) {
      return res.status(400).json({ erro: 'Parâmetros de filtro inválidos.', campos });
    }

    const resultado = await Lancamento.listar({
      usuarioId: req.usuarioId,
      inicio: typeof inicio === 'string' ? inicio : undefined,
      fim: typeof fim === 'string' ? fim : undefined,
      tipo: typeof tipo === 'string' ? tipo : undefined,
      categoriaId: typeof categoriaId === 'string' ? categoriaId : undefined,
      fonteDestinoId: typeof fonteDestinoId === 'string' ? fonteDestinoId : undefined,
      pagina
    });

    return res.status(200).json({ periodo: { inicio, fim }, ...resultado });
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await Lancamento.buscarPorId(req.params.id, req.usuarioId);
    if (!item) {
      return res.status(404).json({ erro: 'Lançamento não encontrado.', campos: {} });
    }
    return res.status(200).json(item);
  } catch (err) {
    return next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    const { campos, fonte } = await validarLancamento(body, req.usuarioId, true);
    if (Object.keys(campos).length > 0) {
      return res.status(400).json({ erro: 'Dados inválidos.', campos });
    }

    const totalParcelas =
      body.tipo === 'saida' && fonte.tipo === 'cartao_credito' && body.totalParcelas
        ? Number(body.totalParcelas)
        : 1;

    const criados = await Lancamento.criar({
      usuarioId: req.usuarioId,
      tipo: body.tipo,
      descricao: body.descricao,
      valor: body.valor,
      data: body.data,
      categoriaId: body.categoriaId,
      fonteDestinoId: body.fonteDestinoId,
      totalParcelas
    });

    return res.status(201).json(criados.length === 1 ? criados[0] : { parcelas: criados });
  } catch (err) {
    return next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existente = await Lancamento.buscarPorId(req.params.id, req.usuarioId);
    if (!existente) {
      return res.status(404).json({ erro: 'Lançamento não encontrado.', campos: {} });
    }

    const body = req.body || {};
    const { campos } = await validarLancamento(body, req.usuarioId, false);
    if (Object.keys(campos).length > 0) {
      return res.status(400).json({ erro: 'Dados inválidos.', campos });
    }

    const atualizado = await Lancamento.atualizar(req.params.id, req.usuarioId, {
      tipo: body.tipo,
      descricao: body.descricao,
      valor: body.valor,
      data: body.data,
      categoriaId: body.categoriaId,
      fonteDestinoId: body.fonteDestinoId
    });
    return res.status(200).json(atualizado);
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const todasParcelas = req.query.todasParcelas === 'true';
    const excluido = await Lancamento.excluir(req.params.id, req.usuarioId, todasParcelas);
    if (!excluido) {
      return res.status(404).json({ erro: 'Lançamento não encontrado.', campos: {} });
    }
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;