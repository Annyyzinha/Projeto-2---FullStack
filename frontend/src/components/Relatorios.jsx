import { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Table,
  Badge,
  Alert,
  Spinner,
  Button,
  Tabs,
  Tab
} from 'react-bootstrap';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { apiFetch, formatarMoeda, formatarDataBR } from '../services/api';

const CORES = [
  '#2563eb',
  '#0ea5e9',
  '#10b981',
  '#f43f5e',
  '#6366f1',
  '#f59e0b',
  '#06b6d4',
  '#ec4899'
];

const pad = (n) => String(n).padStart(2, '0');

function mesAtualIntervalo() {
  const h = new Date();
  const ultimo = new Date(h.getFullYear(), h.getMonth() + 1, 0).getDate();
  return {
    inicio: `${h.getFullYear()}-${pad(h.getMonth() + 1)}-01`,
    fim: `${h.getFullYear()}-${pad(h.getMonth() + 1)}-${pad(ultimo)}`
  };
}

function BadgeVariacao({ valor, inverso = false }) {
  if (valor === null || valor === undefined) {
    return <Badge bg="secondary">Novo</Badge>;
  }
  if (valor === 0) {
    return <Badge bg="secondary">0,0%</Badge>;
  }
  const subiu = valor > 0;
  const ruim = inverso ? subiu : !subiu;
  return (
    <Badge bg={ruim ? 'danger' : 'success'}>
      {subiu ? '▲' : '▼'} {Math.abs(valor).toFixed(1)}%
    </Badge>
  );
}

const LABEL_TIPO_FONTE = {
  renda: { texto: 'Renda', cor: 'success' },
  conta: { texto: 'Conta', cor: 'primary' },
  cartao_credito: { texto: 'Cartão', cor: 'warning' }
};

export default function Relatorios() {
  const [periodo, setPeriodo] = useState(mesAtualIntervalo);
  const [relCategorias, setRelCategorias] = useState(null);
  const [relFontes, setRelFontes] = useState(null);
  const [serieMensal, setSerieMensal] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregarRelatorios = useCallback(async (p) => {
    setCarregando(true);
    setErro('');
    try {
      const qs = new URLSearchParams({ inicio: p.inicio, fim: p.fim }).toString();
      const [cats, fontes, mensal] = await Promise.all([
        apiFetch(`/relatorios/categorias?${qs}`),
        apiFetch(`/relatorios/fontes-destinos?${qs}`),
        apiFetch('/relatorios/mensal?meses=6')
      ]);
      setRelCategorias(cats);
      setRelFontes(fontes);
      setSerieMensal(Array.isArray(mensal?.meses) ? mensal.meses : []);
    } catch (err) {
      setErro(err.message || 'Erro ao carregar os relatórios.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarRelatorios(periodo);
  }, [carregarRelatorios, periodo]);

  const categoriasSaida = relCategorias?.saidas?.categorias || [];
  const categoriasEntrada = relCategorias?.entradas?.categorias || [];
  const dadosPizza = categoriasSaida.filter((c) => c.total > 0);
  const dadosGraficoFontes = (relFontes?.itens || []).filter(
    (i) => i.entradas > 0 || i.saidas > 0
  );

  return (
    <Container className="pb-5">
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-0">Relatórios Financeiros</h3>
          <small className="text-muted">
            Análise por categoria, comparativo de períodos e fluxo por fontes/destinos
          </small>
        </div>

        <div className="d-flex flex-wrap gap-2 align-items-end">
          <Form.Group controlId="relInicio">
            <Form.Label className="small text-muted mb-1">Data Inicial</Form.Label>
            <Form.Control
              type="date"
              size="sm"
              value={periodo.inicio}
              onChange={(e) => setPeriodo((p) => ({ ...p, inicio: e.target.value }))}
            />
          </Form.Group>
          <Form.Group controlId="relFim">
            <Form.Label className="small text-muted mb-1">Data Final</Form.Label>
            <Form.Control
              type="date"
              size="sm"
              value={periodo.fim}
              onChange={(e) => setPeriodo((p) => ({ ...p, fim: e.target.value }))}
            />
          </Form.Group>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => setPeriodo(mesAtualIntervalo())}
          >
            Mês Atual
          </Button>
        </div>
      </div>

      {carregando ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" role="status" />
          <p className="text-muted mt-2 mb-0">A calcular relatórios...</p>
        </div>
      ) : erro ? (
        <Alert variant="danger">
          {erro}{' '}
          <Button
            variant="link"
            size="sm"
            className="p-0 align-baseline"
            onClick={() => carregarRelatorios(periodo)}
          >
            Tentar novamente
          </Button>
        </Alert>
      ) : (
        <>
          {/* Cards de resumo do período */}
          <Row className="g-3 mb-4">
            <Col md={4}>
              <Card className="kpi-card kpi-card-entrada card-interativo h-100">
                <Card.Body className="p-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="small text-muted fw-bold text-uppercase">Entradas</span>
                    <BadgeVariacao valor={relCategorias?.entradas?.variacao} />
                  </div>
                  <h4 className="fw-bold text-success mb-1">
                    {formatarMoeda(relCategorias?.totalEntradas)}
                  </h4>
                  <small className="text-muted">
                    Período anterior: {formatarMoeda(relCategorias?.entradas?.totalAnterior)}
                  </small>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="kpi-card kpi-card-saida card-interativo h-100">
                <Card.Body className="p-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="small text-muted fw-bold text-uppercase">Saídas</span>
                    <BadgeVariacao valor={relCategorias?.saidas?.variacao} inverso />
                  </div>
                  <h4 className="fw-bold text-danger mb-1">
                    {formatarMoeda(relCategorias?.totalSaidas)}
                  </h4>
                  <small className="text-muted">
                    Período anterior: {formatarMoeda(relCategorias?.saidas?.totalAnterior)}
                  </small>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="kpi-card kpi-card-saldo card-interativo h-100">
                <Card.Body className="p-3">
                  <div className="small text-muted fw-bold text-uppercase mb-1">
                    Saldo no Período
                  </div>
                  <h4
                    className={`fw-bold mb-1 ${
                      (relFontes?.saldo || 0) >= 0 ? 'text-primary' : 'text-danger'
                    }`}
                  >
                    {formatarMoeda(relFontes?.saldo)}
                  </h4>
                  <small className="text-muted">
                    Comparado com {formatarDataBR(relCategorias?.periodoAnterior?.inicio)} a{' '}
                    {formatarDataBR(relCategorias?.periodoAnterior?.fim)}
                  </small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Tabs defaultActiveKey="categorias" className="mb-4">
            {/* ABA 1: RF7 — Categorias e Comparativo */}
            <Tab eventKey="categorias" title="Por Categoria (RF7)">
              <Row className="g-4 mb-4">
                <Col lg={5}>
                  <Card className="h-100">
                    <Card.Body className="p-4">
                      <Card.Title className="fs-5 fw-bold mb-3">
                        Distribuição de Saídas
                      </Card.Title>
                      {dadosPizza.length === 0 ? (
                        <Alert variant="light" className="border text-center mb-0">
                          Nenhuma saída registada no período.
                        </Alert>
                      ) : (
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie
                                data={dadosPizza}
                                dataKey="total"
                                nameKey="nome"
                                innerRadius={55}
                                outerRadius={105}
                                paddingAngle={2}
                                label={({ percentual }) => `${percentual}%`}
                              >
                                {dadosPizza.map((c, idx) => (
                                  <Cell key={c.id} fill={CORES[idx % CORES.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(v) => formatarMoeda(v)} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>

                <Col lg={7}>
                  <Card className="h-100">
                    <Card.Body className="p-4">
                      <Card.Title className="fs-5 fw-bold mb-3">
                        Saídas por Categoria vs Período Anterior
                      </Card.Title>
                      {categoriasSaida.length === 0 ? (
                        <Alert variant="light" className="border text-center mb-0">
                          Sem movimentações de saída para comparar.
                        </Alert>
                      ) : (
                        <Table responsive hover className="align-middle mb-0">
                          <thead>
                            <tr>
                              <th>Categoria</th>
                              <th className="text-end">Atual</th>
                              <th className="text-end">%</th>
                              <th className="text-end">Anterior</th>
                              <th className="text-end">Variação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {categoriasSaida.map((c) => (
                              <tr key={c.id}>
                                <td className="fw-medium">{c.nome}</td>
                                <td className="text-end fw-semibold text-danger text-nowrap">
                                  {formatarMoeda(c.total)}
                                </td>
                                <td className="text-end text-muted small">{c.percentual}%</td>
                                <td className="text-end text-muted small text-nowrap">
                                  {formatarMoeda(c.totalAnterior)}
                                </td>
                                <td className="text-end">
                                  <BadgeVariacao valor={c.variacao} inverso />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {categoriasEntrada.length > 0 && (
                <Card className="mb-4">
                  <Card.Body className="p-4">
                    <Card.Title className="fs-5 fw-bold mb-3">
                      Entradas por Categoria vs Período Anterior
                    </Card.Title>
                    <Table responsive hover className="align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Categoria</th>
                          <th className="text-end">Atual</th>
                          <th className="text-end">%</th>
                          <th className="text-end">Anterior</th>
                          <th className="text-end">Variação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoriasEntrada.map((c) => (
                          <tr key={c.id}>
                            <td className="fw-medium">{c.nome}</td>
                            <td className="text-end fw-semibold text-success text-nowrap">
                              {formatarMoeda(c.total)}
                            </td>
                            <td className="text-end text-muted small">{c.percentual}%</td>
                            <td className="text-end text-muted small text-nowrap">
                              {formatarMoeda(c.totalAnterior)}
                            </td>
                            <td className="text-end">
                              <BadgeVariacao valor={c.variacao} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              )}

              {/* Evolução mensal (6 meses) */}
              <Card>
                <Card.Body className="p-4">
                  <Card.Title className="fs-5 fw-bold mb-3">
                    Evolução Mensal: Entradas x Saídas (Últimos 6 Meses)
                  </Card.Title>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={serieMensal}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="mes" />
                        <YAxis tickFormatter={(v) => `R$ ${v}`} width={85} />
                        <Tooltip formatter={(v) => formatarMoeda(v)} />
                        <Legend />
                        <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="saidas" name="Saídas" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>
            </Tab>

            {/* ABA 2: RF8 — Fontes e Destinos */}
            <Tab eventKey="fontes" title="Por Fonte e Destino (RF8)">
              <Card className="mb-4">
                <Card.Body className="p-4">
                  <Card.Title className="fs-5 fw-bold mb-3">
                    Movimentação por Fonte / Destino: Entradas x Saídas
                  </Card.Title>
                  {dadosGraficoFontes.length === 0 ? (
                    <Alert variant="light" className="border text-center mb-0">
                      Nenhuma movimentação por fonte ou destino no período.
                    </Alert>
                  ) : (
                    <div style={{ width: '100%', height: 300 }}>
                      <ResponsiveContainer>
                        <BarChart data={dadosGraficoFontes}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="nome" />
                          <YAxis tickFormatter={(v) => `R$ ${v}`} width={85} />
                          <Tooltip formatter={(v) => formatarMoeda(v)} />
                          <Legend />
                          <Bar
                            dataKey="entradas"
                            name="Entradas"
                            fill="#10b981"
                            radius={[6, 6, 0, 0]}
                          />
                          <Bar
                            dataKey="saidas"
                            name="Saídas"
                            fill="#f43f5e"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card.Body>
              </Card>

              <Row className="g-4 mb-4">
                <Col lg={6}>
                  <Card className="h-100">
                    <Card.Body className="p-4">
                      <Card.Title className="fs-5 fw-bold mb-3">Entradas por Fonte</Card.Title>
                      {(relFontes?.entradasPorFonte || []).length === 0 ? (
                        <Alert variant="light" className="border text-center mb-0">
                          Nenhuma entrada no período.
                        </Alert>
                      ) : (
                        <Table responsive hover className="align-middle mb-0">
                          <thead>
                            <tr>
                              <th>Fonte</th>
                              <th className="text-end">Total</th>
                              <th className="text-end">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {relFontes.entradasPorFonte.map((item) => (
                              <tr key={item.id}>
                                <td className="fw-medium">{item.nome}</td>
                                <td className="text-end fw-semibold text-success">
                                  {formatarMoeda(item.total)}
                                </td>
                                <td className="text-end text-muted small">{item.percentual}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}
                    </Card.Body>
                  </Card>
                </Col>

                <Col lg={6}>
                  <Card className="h-100">
                    <Card.Body className="p-4">
                      <Card.Title className="fs-5 fw-bold mb-3">Saídas por Destino</Card.Title>
                      {(relFontes?.saidasPorDestino || []).length === 0 ? (
                        <Alert variant="light" className="border text-center mb-0">
                          Nenhuma saída no período.
                        </Alert>
                      ) : (
                        <Table responsive hover className="align-middle mb-0">
                          <thead>
                            <tr>
                              <th>Destino</th>
                              <th className="text-end">Total</th>
                              <th className="text-end">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {relFontes.saidasPorDestino.map((item) => (
                              <tr key={item.id}>
                                <td className="fw-medium">{item.nome}</td>
                                <td className="text-end fw-semibold text-danger">
                                  {formatarMoeda(item.total)}
                                </td>
                                <td className="text-end text-muted small">{item.percentual}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Card>
                <Card.Body className="p-4">
                  <Card.Title className="fs-5 fw-bold mb-3">
                    Saldo Consolidado das Contas no Período
                  </Card.Title>
                  {(relFontes?.saldoContas || []).length === 0 ? (
                    <Alert variant="light" className="border text-center mb-0">
                      Nenhuma conta bancária ou carteira cadastrada.
                    </Alert>
                  ) : (
                    <Table responsive hover className="align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Conta</th>
                          <th>Tipo</th>
                          <th className="text-end">Entradas</th>
                          <th className="text-end">Saídas</th>
                          <th className="text-end">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relFontes.saldoContas.map((conta) => {
                          const info = LABEL_TIPO_FONTE[conta.tipo] || {
                            texto: conta.tipo,
                            cor: 'secondary'
                          };
                          return (
                            <tr key={conta.id}>
                              <td className="fw-semibold">{conta.nome}</td>
                              <td>
                                <Badge bg={info.cor}>{info.texto}</Badge>
                              </td>
                              <td className="text-end text-success">
                                {formatarMoeda(conta.entradas)}
                              </td>
                              <td className="text-end text-danger">
                                {formatarMoeda(conta.saidas)}
                              </td>
                              <td
                                className={`text-end fw-bold ${
                                  conta.saldo >= 0 ? 'text-primary' : 'text-danger'
                                }`}
                              >
                                {formatarMoeda(conta.saldo)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </>
      )}
    </Container>
  );
}