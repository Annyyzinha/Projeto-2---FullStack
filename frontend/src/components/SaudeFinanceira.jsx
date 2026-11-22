import { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Alert,
  Spinner,
  Button,
  Table
} from 'react-bootstrap';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { apiFetch, formatarMoeda } from '../services/api';

const STATUS_BADGE = {
  bom: { texto: 'Bom', bg: 'success' },
  atencao: { texto: 'Atenção', bg: 'warning' },
  critico: { texto: 'Crítico', bg: 'danger' },
  sem_dados: { texto: 'Sem dados', bg: 'secondary' }
};

const ALERTA_NIVEL = {
  critico: 'danger',
  atencao: 'warning',
  bom: 'success',
  info: 'info'
};

function formatarValorIndicador(ind) {
  if (ind.valor === null || ind.valor === undefined) return '—';
  if (ind.unidade === 'R$') return formatarMoeda(ind.valor);
  if (ind.unidade === '%') return `${Number(ind.valor).toFixed(1)}%`;
  return `${ind.valor} ${ind.unidade}`;
}

export default function SaudeFinanceira() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const resposta = await apiFetch('/saude-financeira');
      setDados(resposta);
    } catch (err) {
      setErro(err.message || 'Erro ao carregar indicadores de saúde financeira.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <Container className="pb-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h3 className="fw-bold mb-0">Saúde Financeira</h3>
          <small className="text-muted">
            Indicadores automáticos, alertas personalizados e projeção de saldo para 6 meses
          </small>
        </div>
        <Button variant="outline-primary" size="sm" onClick={carregar} disabled={carregando}>
          Atualizar Análise
        </Button>
      </div>

      {carregando ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" role="status" />
          <p className="text-muted mt-2 mb-0">A calcular saúde financeira...</p>
        </div>
      ) : erro ? (
        <Alert variant="danger">
          {erro}{' '}
          <Button variant="link" size="sm" className="p-0 align-baseline" onClick={carregar}>
            Tentar novamente
          </Button>
        </Alert>
      ) : (
        dados && (
          <>
            <Alert variant="info" className="small shadow-sm mb-4">
              {dados.aviso}
            </Alert>

            {/* Médias base */}
            <Row className="g-3 mb-4">
              <Col md={4}>
                <Card className="kpi-card kpi-card-entrada card-interativo h-100">
                  <Card.Body className="p-3">
                    <div className="small text-muted fw-bold text-uppercase">
                      Renda Média Mensal
                    </div>
                    <h4 className="fw-bold text-success mt-1 mb-0">
                      {formatarMoeda(dados.medias?.entradas)}
                    </h4>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="kpi-card kpi-card-saida card-interativo h-100">
                  <Card.Body className="p-3">
                    <div className="small text-muted fw-bold text-uppercase">
                      Despesa Média Mensal
                    </div>
                    <h4 className="fw-bold text-danger mt-1 mb-0">
                      {formatarMoeda(dados.medias?.saidas)}
                    </h4>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="kpi-card kpi-card-saldo card-interativo h-100">
                  <Card.Body className="p-3">
                    <div className="small text-muted fw-bold text-uppercase">
                      Saldo Acumulado Atual
                    </div>
                    <h4
                      className={`fw-bold mt-1 mb-0 ${
                        (dados.projecao?.saldoInicial || 0) >= 0 ? 'text-primary' : 'text-danger'
                      }`}
                    >
                      {formatarMoeda(dados.projecao?.saldoInicial)}
                    </h4>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* 5 Indicadores */}
            <h5 className="fw-bold mb-3">Indicadores Principais</h5>
            <Row className="g-3 mb-4">
              {(dados.indicadores || []).map((ind) => {
                const st = STATUS_BADGE[ind.status] || STATUS_BADGE.sem_dados;
                return (
                  <Col md={6} lg={4} key={ind.id}>
                    <Card className="card-interativo h-100">
                      <Card.Body className="p-4 d-flex flex-column justify-content-between">
                        <div>
                          <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                            <span className="fw-semibold small text-muted">{ind.nome}</span>
                            <Badge bg={st.bg}>{st.texto}</Badge>
                          </div>
                          <h3 className="fw-bold mb-1">{formatarValorIndicador(ind)}</h3>
                          {ind.referencia && (
                            <div className="small text-muted">Referência: {ind.referencia}</div>
                          )}
                        </div>

                        {ind.id === 'reserva_emergencia' && ind.detalhe && (
                          <div className="mt-3 pt-2 border-top small text-muted">
                            Reserva atual: <strong>{formatarMoeda(ind.detalhe.saldoReserva)}</strong>
                          </div>
                        )}

                        {ind.id === 'categorias_fora_da_curva' &&
                          Array.isArray(ind.detalhe) &&
                          ind.detalhe.length > 0 && (
                            <div className="mt-3 pt-2 border-top small">
                              {ind.detalhe.slice(0, 3).map((c) => (
                                <div key={c.id} className="d-flex justify-content-between">
                                  <span>{c.nome}</span>
                                  <span className="text-danger fw-semibold">+{c.acimaPct}%</span>
                                </div>
                              ))}
                            </div>
                          )}
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {/* Dicas */}
            {(dados.dicas || []).length > 0 && (
              <Card className="mb-4">
                <Card.Body className="p-4">
                  <Card.Title className="fs-5 fw-bold mb-3">Dicas e Alertas</Card.Title>
                  <div className="d-flex flex-column gap-2">
                    {dados.dicas.map((dica, idx) => (
                      <Alert
                        key={idx}
                        variant={ALERTA_NIVEL[dica.nivel] || 'info'}
                        className="mb-0 py-2 px-3 small"
                      >
                        {dica.texto}
                      </Alert>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Projeção de Saldo (6 meses) */}
            <Card>
              <Card.Body className="p-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                  <div>
                    <Card.Title className="fs-5 fw-bold mb-0">
                      Projeção de Saldo (Próximos 6 Meses)
                    </Card.Title>
                    <small className="text-muted">
                      Baseada na média dos últimos 3 meses somada às parcelas já agendadas
                    </small>
                  </div>
                  {dados.projecao?.alertaNegativo && (
                    <Badge bg="danger">Alerta de Saldo Negativo</Badge>
                  )}
                </div>

                <div style={{ width: '100%', height: 280 }} className="mb-4">
                  <ResponsiveContainer>
                    <LineChart data={dados.projecao?.meses || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="mes" />
                      <YAxis tickFormatter={(v) => `R$ ${v}`} width={85} />
                      <Tooltip formatter={(v) => formatarMoeda(v)} />
                      <Legend />
                      <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="4 4" />
                      <Line
                        type="monotone"
                        dataKey="saldoAcumulado"
                        name="Saldo Acumulado"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="parcelas"
                        name="Parcelas no Mês"
                        stroke="#f59e0b"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <Table responsive hover className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th className="text-end">Entradas Previstas</th>
                      <th className="text-end">Saídas Previstas</th>
                      <th className="text-end">Parcelas</th>
                      <th className="text-end">Saldo do Mês</th>
                      <th className="text-end">Saldo Acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dados.projecao?.meses || []).map((m) => (
                      <tr key={m.mes}>
                        <td className="fw-semibold">{m.mes}</td>
                        <td className="text-end text-success">{formatarMoeda(m.entradas)}</td>
                        <td className="text-end text-danger">{formatarMoeda(m.saidas)}</td>
                        <td className="text-end text-muted">{formatarMoeda(m.parcelas)}</td>
                        <td
                          className={`text-end fw-semibold ${
                            m.saldo >= 0 ? 'text-success' : 'text-danger'
                          }`}
                        >
                          {formatarMoeda(m.saldo)}
                        </td>
                        <td
                          className={`text-end fw-bold ${
                            m.negativo ? 'text-danger' : 'text-primary'
                          }`}
                        >
                          {formatarMoeda(m.saldoAcumulado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </>
        )
      )}
    </Container>
  );
}