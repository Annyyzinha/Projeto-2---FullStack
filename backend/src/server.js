import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose, { conectarBanco } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import categoriasRoutes from './routes/categorias.routes.js';
import fontesRoutes from './routes/fontes.routes.js';
import lancamentosRoutes from './routes/lancamentos.routes.js';
import relatoriosRoutes from './routes/relatorios.routes.js';
import saudeFinanceiraRoutes from './routes/saudeFinanceira.routes.js';
import { tratarErros } from './middlewares/erros.js';

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  const conectado = mongoose.connection.readyState === 1;
  res.status(conectado ? 200 : 503).json({
    status: conectado ? 'ok' : 'erro',
    banco: 'MongoDB',
    conectado
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/fontes-destinos', fontesRoutes);
app.use('/api/lancamentos', lancamentosRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/saude-financeira', saudeFinanceiraRoutes);

app.use(tratarErros);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[API] Servidor Express em execução em http://localhost:${PORT}`);
  conectarBanco();
});