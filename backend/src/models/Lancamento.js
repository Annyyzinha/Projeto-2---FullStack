import mongoose from 'mongoose';
import crypto from 'crypto';

const lancamentoSchema = new mongoose.Schema(
  {
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true
    },
    tipo: {
      type: String,
      required: true,
      enum: ['entrada', 'saida']
    },
    descricao: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    valorCentavos: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'O valor em centavos deve ser um número inteiro.'
      }
    },
    data: {
      type: String,
      required: true,
      index: true
    },
    categoriaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Categoria',
      required: true
    },
    fonteDestinoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FonteDestino',
      required: true
    },
    parcelaAtual: {
      type: Number,
      default: 1,
      min: 1
    },
    totalParcelas: {
      type: Number,
      default: 1,
      min: 1,
      max: 48
    },
    grupoParcelamento: {
      type: String,
      default: null,
      index: true
    }
  },
  {
    timestamps: { createdAt: 'criadoEm', updatedAt: false },
    toJSON: {
      transform(_, ret) {
        ret.id = ret._id.toString();
        ret.valor = Number((ret.valorCentavos / 100).toFixed(2));
        ret.categoriaId = ret.categoriaId?._id
          ? ret.categoriaId._id.toString()
          : ret.categoriaId?.toString();
        ret.fonteDestinoId = ret.fonteDestinoId?._id
          ? ret.fonteDestinoId._id.toString()
          : ret.fonteDestinoId?.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.usuarioId;
        delete ret.valorCentavos;
      }
    }
  }
);

lancamentoSchema.virtual('valor').get(function () {
  return Number((this.valorCentavos / 100).toFixed(2));
});

lancamentoSchema.index({ usuarioId: 1, data: -1 });

const LancamentoModel = mongoose.model('Lancamento', lancamentoSchema);

export const Lancamento = {
  Model: LancamentoModel,

  async criar({
    usuarioId,
    tipo,
    descricao,
    valor,
    data,
    categoriaId,
    fonteDestinoId,
    totalParcelas = 1
  }) {
    const nParcelas = Number(totalParcelas) || 1;
    const totalCentavos = Math.round(Number(valor) * 100);
    const baseCentavos = Math.floor(totalCentavos / nParcelas);
    const restoCentavos = totalCentavos - baseCentavos * nParcelas;
    const grupo = nParcelas > 1 ? crypto.randomUUID() : null;

    const documentos = [];
    for (let i = 1; i <= nParcelas; i++) {
      const centavosParcela = i === 1 ? baseCentavos + restoCentavos : baseCentavos;
      documentos.push({
        usuarioId,
        tipo,
        descricao: descricao.trim(),
        valorCentavos: centavosParcela,
        data,
        categoriaId,
        fonteDestinoId,
        parcelaAtual: i,
        totalParcelas: nParcelas,
        grupoParcelamento: grupo
      });
    }

    // Inserção única já é atômica no MongoDB; evita overhead de transação em lançamentos à vista
    if (documentos.length === 1) {
      const criado = await LancamentoModel.create(documentos[0]);
      return [criado.toJSON()];
    }

    // Parcelamentos (N > 1): gravação atômica em transação ACID (todas ou nenhuma)
    await LancamentoModel.createCollection().catch(() => {});

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const criados = await LancamentoModel.insertMany(documentos, { session });
      await session.commitTransaction();
      return criados.map((d) => d.toJSON());
    } catch (erro) {
      await session.abortTransaction();
      throw erro;
    } finally {
      session.endSession();
    }
  },

  async listar({ usuarioId, inicio, fim, tipo, categoriaId, fonteDestinoId, pagina = 1, limite = 20 }) {
    const filtro = { usuarioId };
    if (inicio || fim) {
      filtro.data = {};
      if (inicio) filtro.data.$gte = inicio;
      if (fim) filtro.data.$lte = fim;
    }
    if (tipo && ['entrada', 'saida'].includes(tipo)) filtro.tipo = tipo;
    if (categoriaId && mongoose.Types.ObjectId.isValid(categoriaId)) {
      filtro.categoriaId = categoriaId;
    }
    if (fonteDestinoId && mongoose.Types.ObjectId.isValid(fonteDestinoId)) {
      filtro.fonteDestinoId = fonteDestinoId;
    }

    const todosNoPeriodo = await LancamentoModel.find(filtro)
      .populate('categoriaId', 'nome tipo')
      .populate('fonteDestinoId', 'nome tipo')
      .sort({ data: -1, criadoEm: -1 });

    let totalEntradasCentavos = 0;
    let totalSaidasCentavos = 0;

    for (const item of todosNoPeriodo) {
      if (item.tipo === 'entrada') totalEntradasCentavos += item.valorCentavos;
      else totalSaidasCentavos += item.valorCentavos;
    }

    const pag = Math.max(1, Number(pagina) || 1);
    const lim = Math.max(1, Math.min(100, Number(limite) || 20));
    const inicioSlice = (pag - 1) * lim;
    const paginados = todosNoPeriodo.slice(inicioSlice, inicioSlice + lim).map((doc) => {
      const obj = doc.toJSON();
      obj.categoriaNome = doc.categoriaId?.nome || '';
      obj.fonteDestinoNome = doc.fonteDestinoId?.nome || '';
      return obj;
    });

    const totalEntradas = Number((totalEntradasCentavos / 100).toFixed(2));
    const totalSaidas = Number((totalSaidasCentavos / 100).toFixed(2));

    return {
      lancamentos: paginados,
      paginacao: {
        pagina: pag,
        limite: lim,
        totalRegistros: todosNoPeriodo.length,
        totalPaginas: Math.max(1, Math.ceil(todosNoPeriodo.length / lim))
      },
      resumo: {
        totalEntradas,
        totalSaidas,
        saldo: Number(((totalEntradasCentavos - totalSaidasCentavos) / 100).toFixed(2))
      }
    };
  },

  async buscarPorId(id, usuarioId) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await LancamentoModel.findOne({ _id: id, usuarioId });
    return doc ? doc.toJSON() : null;
  },

  async atualizar(id, usuarioId, { tipo, descricao, valor, data, categoriaId, fonteDestinoId }) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await LancamentoModel.findOneAndUpdate(
      { _id: id, usuarioId },
      {
        tipo,
        descricao: descricao.trim(),
        valorCentavos: Math.round(Number(valor) * 100),
        data,
        categoriaId,
        fonteDestinoId
      },
      { new: true, runValidators: true }
    );
    return doc ? doc.toJSON() : null;
  },

  async excluir(id, usuarioId, todasParcelas = false) {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const doc = await LancamentoModel.findOne({ _id: id, usuarioId });
    if (!doc) return false;

    if (todasParcelas && doc.grupoParcelamento) {
      await LancamentoModel.deleteMany({
        usuarioId,
        grupoParcelamento: doc.grupoParcelamento
      });
    } else {
      await LancamentoModel.deleteOne({ _id: id, usuarioId });
    }
    return true;
  }
};