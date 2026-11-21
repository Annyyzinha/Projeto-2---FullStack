import mongoose from 'mongoose';

const categoriaSchema = new mongoose.Schema(
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
      enum: ['entrada', 'saida']
    }
  },
  {
    timestamps: false,
    toJSON: {
      transform(_, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.usuarioId;
      }
    }
  }
);

categoriaSchema.index({ usuarioId: 1, nome: 1, tipo: 1 }, { unique: true });

const CategoriaModel = mongoose.model('Categoria', categoriaSchema);

export const Categoria = {
  Model: CategoriaModel,

  async criarPadrao(usuarioId) {
    const iniciais = [
      { usuarioId, nome: 'Salário', tipo: 'entrada' },
      { usuarioId, nome: 'Rendimentos', tipo: 'entrada' },
      { usuarioId, nome: 'Alimentação', tipo: 'saida' },
      { usuarioId, nome: 'Moradia', tipo: 'saida' },
      { usuarioId, nome: 'Saúde', tipo: 'saida' },
      { usuarioId, nome: 'Mobilidade', tipo: 'saida' },
      { usuarioId, nome: 'Lazer', tipo: 'saida' },
      { usuarioId, nome: 'Educação', tipo: 'saida' },
      { usuarioId, nome: 'Outros', tipo: 'saida' }
    ];
    await CategoriaModel.insertMany(iniciais, { ordered: false }).catch(() => {});
  },

  async listarPorUsuario(usuarioId) {
    const docs = await CategoriaModel.find({ usuarioId }).sort({ tipo: 1, nome: 1 });
    return docs.map((d) => d.toJSON());
  },

  async buscarPorId(id, usuarioId) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await CategoriaModel.findOne({ _id: id, usuarioId });
    return doc ? doc.toJSON() : null;
  },

  async criar({ usuarioId, nome, tipo }) {
    const doc = await CategoriaModel.create({
      usuarioId,
      nome: nome.trim(),
      tipo
    });
    return doc.toJSON();
  },

  async atualizar(id, usuarioId, { nome, tipo }) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await CategoriaModel.findOneAndUpdate(
      { _id: id, usuarioId },
      { nome: nome.trim(), tipo },
      { new: true, runValidators: true }
    );
    return doc ? doc.toJSON() : null;
  },

  async temLancamentos(id, usuarioId) {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const LancamentoModel = mongoose.models.Lancamento;
    if (!LancamentoModel) return false;
    const existe = await LancamentoModel.exists({ categoriaId: id, usuarioId });
    return Boolean(existe);
  },

  async excluir(id, usuarioId) {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const res = await CategoriaModel.deleteOne({ _id: id, usuarioId });
    return res.deletedCount > 0;
  }
};