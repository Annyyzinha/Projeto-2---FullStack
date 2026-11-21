import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Button,
  Alert,
  Spinner,
  ProgressBar
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch, formatarMoeda, formatarDataBR } from '../services/api';

export default function Dashboard() {
  const { usuario } = useAuth();
  const [dadosMes, setDadosMes] = useState(null);
  const [faturasCartoes, setFaturasCartoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregarResumo = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const [respLancamentos, respFaturas] = await Promise.all([
        apiFetch('/lancamentos'),
        apiFetch('/lancamentos/faturas/previsao?meses=3')
      ]);
      setDadosMes(respLancamentos);
      setFaturasCartoes(Array.isArray(respFaturas) ? respFaturas : []);
    } catch (err) {
      setErro(err.message || 'Não foi possível carregar o resumo financeiro.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarResumo();
  }, [carregarResumo]);

  const resumo = dadosMes?.resumo || { totalEntradas: 0, totalSaidas: 0, saldo: 0 };
  const recentes = (dadosMes?.lancamentos || []).slice(0, 5);

  return (
    <Container className="pb-5">
      {/* Banner principal em gradiente azul */}
      <div className="hero-dashboard mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 position-relative">
          <div>
            <span className="badge bg-white bg-opacity-25 text-white mb-2">
              Visão Geral do Mês
            </span>
            <h2 className="fw-bold mb-1">Olá, {usuario?.nome || 'Usuário'}</h2>
            <p className="mb-0 text-white-50 small">
              Acompanhe suas movimentações{' '}
              {dadosMes?.periodo
                ? `de ${formatarDataBR(dadosMes.periodo.inicio)} até ${formatarDataBR(dadosMes.periodo.fim)}`
                : 'do período atual'}
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Button
              as={Link}
              to="/lancamentos"
              variant="light"
              className="text-primary fw-bold px-3 shadow-sm"
            >
              + Novo Lançamento
            </Button>
            <Button
              as={Link}
              to="/faturas"
              variant="outline-light"
              className="px-3"
            >
              Ver Faturas
            </Button>
          </div>
        </div>
      </div>

      {carregando ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" role="status" />
          <p className="text-muted mt-2 mb-0">Carregando resumo do mês...</p>
        </div>
      ) : erro ? (
        <Alert variant="danger">
          {erro}{' '}
          <Button variant="link" size="sm" className="p-0 align-baseline" onClick={carregarResumo}>
            Tentar novamente
          </Button>
        </Alert>
      ) : (
        <>
          {/* Cards KPI Interativos */}
          <Row className="g-3 mb-4">
            <Col md={4}>
              <Card className="kpi-card kpi-card-entrada card-interativo h-100">
                <Card.Body className="d-flex align-items-center justify-content-between p-4">
                  <div>
                    <div className="text-muted small text-uppercase fw-bold">Entradas</div>
                    <h3 className="fw-bold text-success mt-1 mb-0">
                      {formatarMoeda(resumo.totalEntradas)}
                    </h3>
                  </div>
                  <div className="kpi-icon kpi-icon-entrada" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="kpi-card kpi-card-saida card-interativo h-100">
                <Card.Body className="d-flex align-items-center justify-content-between p-4">
                  <div>
                    <div className="text-muted small text-uppercase fw-bold">Saídas</div>
                    <h3 className="fw-bold text-danger mt-1 mb-0">
                      {formatarMoeda(resumo.totalSaidas)}
                    </h3>
                  </div>
                  <div className="kpi-icon kpi-icon-saida" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M19 12l-7 7-7-7" />
                    </svg>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="kpi-card kpi-card-saldo card-interativo h-100">
                <Card.Body className="d-flex align-items-center justify-content-between p-4">
                  <div>
                    <div className="text-muted small text-uppercase fw-bold">Saldo do Mês</div>
                    <h3
                      className={`fw-bold mt-1 mb-0 ${
                        resumo.saldo >= 0 ? 'text-primary' : 'text-danger'
                      }`}
                    >
                      {formatarMoeda(resumo.saldo)}
                    </h3>
                  </div>
                  <div className="kpi-icon kpi-icon-saldo" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="20" height="14" rx="3" />
                      <path d="M2 10h20" />
                    </svg>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-4">
            <Col lg={8}>
              <Card className="h-100">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <Card.Title className="fs-5 fw-bold mb-0">Últimos Lançamentos</Card.Title>
                      <small className="text-muted">Movimentações mais recentes do mês</small>
                    </div>
                    <Button as={Link} to="/lancamentos" variant="outline-primary" size="sm">
                      Ver todos
                    </Button>
                  </div>

                  {recentes.length === 0 ? (
                    <Alert variant="light" className="border text-center mb-0 py-4">
                      Nenhum lançamento registrado neste mês.
                    </Alert>
                  ) : (
                    <Table responsive hover className="align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Descrição</th>
                          <th>Categoria</th>
                          <th className="text-end">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentes.map((item) => (
                          <tr key={item.id}>
                            <td className="small text-muted text-nowrap">
                              {formatarDataBR(item.data)}
                            </td>
                            <td className="fw-semibold">
                              {item.descricao}
                              {item.totalParcelas > 1 && (
                                <Badge bg="primary" className="ms-2">
                                  {item.parcelaAtual}/{item.totalParcelas}
                                </Badge>
                              )}
                            </td>
                            <td>
                              <Badge bg="secondary">{item.categoriaNome}</Badge>
                            </td>
                            <td
                              className={`text-end fw-bold text-nowrap ${
                                item.tipo === 'entrada' ? 'text-success' : 'text-danger'
                              }`}
                            >
                              {item.tipo === 'entrada' ? '+' : '-'} {formatarMoeda(item.valor)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col lg={4}>
              <Card className="h-100">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <Card.Title className="fs-5 fw-bold mb-0">Meus Cartões</Card.Title>
                      <small className="text-muted">Fatura aberta e limite</small>
                    </div>
                    <Button as={Link} to="/faturas" variant="outline-primary" size="sm">
                      Detalhes
                    </Button>
                  </div>

                  {faturasCartoes.length === 0 ? (
                    <Alert variant="light" className="border text-center mb-0 small py-4">
                      Nenhum cartão cadastrado.{' '}
                      <Link to="/fontes-destinos" className="fw-semibold">
                        Cadastrar cartão
                      </Link>
                    </Alert>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {faturasCartoes.map(({ cartao, faturas }) => {
                        const faturaAtual = faturas[0];
                        const pct =
                          cartao.limite > 0
                            ? Math.min(100, (cartao.limiteUtilizado / cartao.limite) * 100)
                            : 0;
                        return (
                          <div key={cartao.id} className="credit-card-tile">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <div className="credit-chip" />
                              <span className="small text-white-50">
                                Vence dia {cartao.diaVencimento}
                              </span>
                            </div>
                            <div className="fw-bold fs-6 mb-2">{cartao.nome}</div>
                            <div className="d-flex justify-content-between small mb-1">
                              <span className="text-white-50">Fatura atual</span>
                              <span className="fw-bold">
                                {formatarMoeda(faturaAtual?.total || 0)}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between small mb-2">
                              <span className="text-white-50">Disponível</span>
                              <span className="fw-semibold" style={{ color: '#6ee7b7' }}>
                                {formatarMoeda(cartao.limiteDisponivel)}
                              </span>
                            </div>
                            <ProgressBar
                              now={pct}
                              variant={pct >= 80 ? 'danger' : pct >= 50 ? 'warning' : 'info'}
                              style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.2)' }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
}