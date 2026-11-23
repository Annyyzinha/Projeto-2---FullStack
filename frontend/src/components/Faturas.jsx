import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Accordion,
  Table,
  Badge,
  ProgressBar,
  Form,
  Alert,
  Spinner,
  Button
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { apiFetch, formatarMoeda, formatarDataBR } from '../services/api';

function formatarReferencia(ref) {
  if (!ref || !ref.includes('-')) return ref;
  const [ano, mes] = ref.split('-');
  return `${mes}/${ano}`;
}

const BADGE_STATUS = {
  fechada: { bg: 'warning', text: 'dark', label: 'Fechada' },
  aberta: { bg: 'primary', text: undefined, label: 'Aberta (Atual)' },
  futura: { bg: 'secondary', text: undefined, label: 'Prevista' }
};

export default function Faturas() {
  const [meses, setMeses] = useState(3);
  const [cartoesFaturas, setCartoesFaturas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregarFaturas = useCallback(async (qtdMeses) => {
    setCarregando(true);
    setErro('');
    try {
      const dados = await apiFetch(`/relatorios/faturas?meses=${qtdMeses}`);
      setCartoesFaturas(Array.isArray(dados?.cartoes) ? dados.cartoes : []);
    } catch (err) {
      setErro(err.message || 'Erro ao carregar previsão de faturas.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarFaturas(meses);
  }, [carregarFaturas, meses]);

  return (
    <Container className="pb-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-0">Previsão de Faturas</h3>
          <small className="text-muted">
            Acompanhe a fatura aberta, parcelas futuras e limite disponível por cartão
          </small>
        </div>

        <Form.Group controlId="filtroMeses" className="d-flex align-items-center gap-2">
          <Form.Label className="mb-0 small text-muted text-nowrap">Projeção:</Form.Label>
          <Form.Select
            size="sm"
            style={{ width: 'auto' }}
            value={meses}
            onChange={(e) => setMeses(Number(e.target.value))}
          >
            <option value={3}>Atual + 3 faturas</option>
            <option value={6}>Atual + 6 faturas</option>
            <option value={12}>Atual + 12 faturas</option>
          </Form.Select>
        </Form.Group>
      </div>

      {carregando ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" role="status" />
          <p className="text-muted mt-2 mb-0">Calculando previsão das faturas...</p>
        </div>
      ) : erro ? (
        <Alert variant="danger">
          {erro}{' '}
          <Button
            variant="link"
            size="sm"
            className="p-0 align-baseline"
            onClick={() => carregarFaturas(meses)}
          >
            Tentar novamente
          </Button>
        </Alert>
      ) : cartoesFaturas.length === 0 ? (
        <Alert variant="light" className="border text-center py-4">
          <p className="mb-2">Você ainda não possui nenhum cartão de crédito cadastrado.</p>
          <Button as={Link} to="/fontes-destinos" variant="primary" size="sm">
            Cadastrar Cartão de Crédito
          </Button>
        </Alert>
      ) : (
        <div className="d-flex flex-column gap-4">
          {cartoesFaturas.map((cartao) => {
            const faturas = cartao.faturas || [];
            const indiceAberta = faturas.findIndex((f) => f.status === 'aberta');
            const chaveInicial = String(indiceAberta >= 0 ? indiceAberta : 0);

            const percentualUso =
              cartao.limite > 0
                ? Math.min(100, Math.max(0, (cartao.limiteUtilizado / cartao.limite) * 100))
                : 0;
            const corBarra =
              percentualUso >= 85 ? 'danger' : percentualUso >= 60 ? 'warning' : 'primary';

            return (
              <Card key={cartao.id} className="shadow-sm border-0">
                <Card.Header className="bg-white border-bottom py-3">
                  <Row className="align-items-center g-3">
                    <Col md={4}>
                      <h5 className="fw-bold mb-1">{cartao.nome}</h5>
                      <small className="text-muted">
                        Fecha dia {cartao.diaFechamento} | Vence dia {cartao.diaVencimento}
                      </small>
                    </Col>

                    <Col md={8}>
                      <Row className="g-2 text-md-end mb-2">
                        <Col xs={4}>
                          <div className="small text-muted">Limite Total</div>
                          <div className="fw-semibold">{formatarMoeda(cartao.limite)}</div>
                        </Col>
                        <Col xs={4}>
                          <div className="small text-muted">Utilizado</div>
                          <div className="fw-semibold text-danger">
                            {formatarMoeda(cartao.limiteUtilizado)}
                          </div>
                        </Col>
                        <Col xs={4}>
                          <div className="small text-muted">Disponível</div>
                          <div
                            className={`fw-semibold ${
                              cartao.limiteDisponivel >= 0 ? 'text-success' : 'text-danger'
                            }`}
                          >
                            {formatarMoeda(cartao.limiteDisponivel)}
                          </div>
                        </Col>
                      </Row>
                      <ProgressBar
                        now={percentualUso}
                        variant={corBarra}
                        style={{ height: '8px' }}
                        title={`${percentualUso.toFixed(1)}% do limite utilizado`}
                      />
                    </Col>
                  </Row>
                </Card.Header>

                <Card.Body>
                  <Accordion defaultActiveKey={chaveInicial}>
                    {faturas.map((fatura, indice) => {
                      const statusInfo =
                        BADGE_STATUS[fatura.status] ||
                        (indice === 0 ? BADGE_STATUS.aberta : BADGE_STATUS.futura);

                      return (
                        <Accordion.Item key={fatura.referencia} eventKey={String(indice)}>
                          <Accordion.Header>
                            <div className="d-flex flex-wrap justify-content-between align-items-center w-100 pe-3 gap-2">
                              <div>
                                <span className="fw-semibold me-2">
                                  Fatura {formatarReferencia(fatura.referencia)}
                                </span>
                                <Badge bg={statusInfo.bg} text={statusInfo.text}>
                                  {statusInfo.label}
                                </Badge>
                                <div className="small text-muted mt-1">
                                  Fechamento: {formatarDataBR(fatura.fechamento)} | Vencimento:{' '}
                                  {formatarDataBR(fatura.vencimento)}
                                </div>
                              </div>
                              <div className="fs-6 fw-bold text-danger">
                                {formatarMoeda(fatura.total)}
                              </div>
                            </div>
                          </Accordion.Header>
                          <Accordion.Body>
                            {fatura.lancamentos.length === 0 ? (
                              <p className="text-muted small mb-0 text-center py-2">
                                Nenhum lançamento previsto para esta fatura.
                              </p>
                            ) : (
                              <Table responsive size="sm" hover className="align-middle mb-0">
                                <thead className="table-light">
                                  <tr>
                                    <th>Data da Compra</th>
                                    <th>Descrição / Parcela</th>
                                    <th className="text-end">Valor</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {fatura.lancamentos.map((lanc) => (
                                    <tr key={`${lanc.id}-${lanc.parcelaAtual}`}>
                                      <td className="small text-muted text-nowrap">
                                        {formatarDataBR(lanc.dataCompra)}
                                      </td>
                                      <td>{lanc.rotulo || lanc.descricao}</td>
                                      <td className="text-end fw-medium text-nowrap">
                                        {formatarMoeda(lanc.valor)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            )}
                          </Accordion.Body>
                        </Accordion.Item>
                      );
                    })}
                  </Accordion>
                </Card.Body>
              </Card>
            );
          })}
        </div>
      )}
    </Container>
  );
}