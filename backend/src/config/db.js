import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export async function conectarBanco() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('[DB] Variável de ambiente MONGODB_URI não configurada.');
    process.exit(1);
  }

  try {
    console.log('[DB] Iniciando conexão com o MongoDB...');
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000
    });
    console.log('[DB] Conexão com o MongoDB estabelecida com sucesso.');
  } catch (erro) {
    console.error('[DB] Falha ao conectar ao MongoDB:', erro.message);
    process.exit(1);
  }
}

export default mongoose;