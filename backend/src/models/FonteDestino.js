import mongoose from 'mongoose';

const fonteDestinoSchema = new mongoose.Schema(
  {
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true
    },
    nome: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60
    },
    tipo: {
      type: String,
      required: true,
      enum: ['renda', 'conta', 'cartao_credito']
    },
    diaFechamento: {
      type: Number,
      min: 1,
      max: 31,
      default: null
    },
    diaVencimento: {
      type: Number,
      min: 1,
      max: 31,
      default: null
    },
  
    limiteCentavos: {
      type: Number,
      default: null,
      validate: {
        validator: (v) => v === null || (Number.isInteger(v) && v > 0),
        message: 'O limite em centavos deve ser um inteiro positivo.'
      }
    },
    reserva: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: false,
    toJSON: {
      transform(_, ret) {
        ret.id = ret._id.toString();
        ret.limite =
          ret.limiteCentavos !== null && ret.limiteCentavos !== undefined
            ? Number((ret.limiteCentavos / 100).toFixed(2))
            : null;
        delete ret._id;
        delete ret.__v;
        delete ret.usuarioId;
        delete ret.limiteCentavos;
      }
    }
  }
);

fonteDestinoSchema.virtual('limite').get(function () {
  return this.limiteCentavos !== null && this.limiteCentavos !== undefined
    ? Number((this.limiteCentavos / 100).toFixed(2))
    : null;
});

fonteDestinoSchema.index({ usuarioId: 1, nome: 1 }, { unique: true });

const FonteDestinoModel = mongoose.model('FonteDestino', fonteDestinoSchema);

export const FonteDestino = {
  Model: FonteDestinoModel,

  async criarPadrao(usuarioId) {
    const iniciais = [
      { usuarioId, nome: 'Conta Corrente', tipo: 'conta', reserva: false },
      { usuarioId, nome: 'Poupança (Reserva)', tipo: 'conta', reserva: true },
      { usuarioId, nome: 'Salário Mensal', tipo: 'renda', reserva: false }
    ];
    await FonteDestinoModel.insertMany(iniciais, { ordered: false }).catch(() => {});
  },

  async listarPorUsuario(usuarioId) {
    const docs = await FonteDestinoModel.find({ usuarioId }).sort({ nome: 1 });
    return docs.map((d) => d.toJSON());
  },

  async buscarPorId(id, usuarioId) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FonteDestinoModel.findOne({ _id: id, usuarioId });
    return doc ? doc.toJSON() : null;
  },

  async criar({ usuarioId, nome, tipo, diaFechamento, diaVencimento, limite, reserva }) {
    const ehCartao = tipo === 'cartao_credito';
    const doc = await FonteDestinoModel.create({
      usuarioId,
      nome: nome.trim(),
      tipo,
      diaFechamento: ehCartao ? Number(diaFechamento) : null,
      diaVencimento: ehCartao ? Number(diaVencimento) : null,
      limiteCentavos: ehCartao ? Math.round(Number(limite) * 100) : null,
      reserva: Boolean(reserva)
    });
    return doc.toJSON();
  },

  async atualizar(id, usuarioId, { nome, tipo, diaFechamento, diaVencimento, limite, reserva }) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const ehCartao = tipo === 'cartao_credito';
    const doc = await FonteDestinoModel.findOneAndUpdate(
      { _id: id, usuarioId },
      {
        nome: nome.trim(),
        tipo,
        diaFechamento: ehCartao ? Number(diaFechamento) : null,
        diaVencimento: ehCartao ? Number(diaVencimento) : null,
        limiteCentavos: ehCartao ? Math.round(Number(limite) * 100) : null,
        reserva: Boolean(reserva)
      },
      { new: true, runValidators: true }
    );
    return doc ? doc.toJSON() : null;
  },

  async temLancamentos(id, usuarioId) {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const LancamentoModel = mongoose.models.Lancamento;
    if (!LancamentoModel) return false;
    const existe = await LancamentoModel.exists({ fonteDestinoId: id, usuarioId });
    return Boolean(existe);
  },

  async excluir(id, usuarioId) {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const res = await FonteDestinoModel.deleteOne({ _id: id, usuarioId });
    return res.deletedCount > 0;
  }
};