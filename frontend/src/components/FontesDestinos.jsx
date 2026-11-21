import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Table,
  Badge,
  Alert,
  Spinner,
  Modal
} from 'react-bootstrap';
import { apiFetch, formatarMoeda } from '../services/api';

const FORM_INICIAL = {
  nome: '',
  tipo: 'conta',
  diaFechamento: '',
  diaVencimento: '',
  limite: '',
  reserva: false
};

const LABEL_TIPO = {
  renda: { texto: 'Renda', cor: 'success' },
  conta: { texto: 'Conta', cor: 'primary' },
  cartao_credito: { texto: 'Cartão de Crédito', cor: 'warning' }
};

export default function FontesDestinos() {
  const [fontes, setFontes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState('');

  const [form, setForm] = useState(FORM_INICIAL);
  const [editandoId, setEditandoId] = useState(null);
  const [errosCampos, setErrosCampos] = useState({});
  const [erroForm, setErroForm] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [fonteExcluir, setFonteExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');

  const carregarFontes = useCallback(async () => {
    setCarregando(true);
    setErroLista('');
    try {
      const dados = await apiFetch('/fontes-destinos');
      setFontes(Array.isArray(dados) ? dados : []);
    } catch (err) {
      setErroLista(err.message || 'Erro ao carregar fontes e destinos.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarFontes();
  }, [carregarFontes]);

  function atualizarCampo(campo, valor) {
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
    setErrosCampos((anterior) => ({ ...anterior, [campo]: undefined }));
  }

  function iniciarEdicao(item) {
    setEditandoId(item.id);
    setForm({
      nome: item.nome,
      tipo: item.tipo,
      diaFechamento: item.diaFechamento ?? '',
      diaVencimento: item.diaVencimento ?? '',
      limite: item.limite ?? '',
      reserva: Boolean(item.reserva)
    });
    setErrosCampos({});
    setErroForm('');
    setSucesso('');
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setForm(FORM_INICIAL);
    setErrosCampos({});
    setErroForm('');
  }

  function validarCliente() {
    const campos = {};
    if (!form.nome.trim()) {
      campos.nome = 'O nome é obrigatório.';
    } else if (form.nome.trim().length > 60) {
      campos.nome = 'O nome deve ter no máximo 60 caracteres.';
    }

    if (!['renda', 'conta', 'cartao_credito'].includes(form.tipo)) {
      campos.tipo = 'Selecione um tipo válido.';
    }

    if (form.tipo === 'cartao_credito') {
      const df = Number(form.diaFechamento);
      const dv = Number(form.diaVencimento);
      const lim = Number(form.limite);

      if (!Number.isInteger(df) || df < 1 || df > 31) {
        campos.diaFechamento = 'Informe um dia entre 1 e 31.';
      }
      if (!Number.isInteger(dv) || dv < 1 || dv > 31) {
        campos.diaVencimento = 'Informe um dia entre 1 e 31.';
      }
      if (!Number.isFinite(lim) || Math.round(lim * 100) < 1) {
        campos.limite = 'Informe um limite de pelo menos R$ 0,01.';
      }
    }

    return campos;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErroForm('');
    setSucesso('');

    const campos = validarCliente();
    if (Object.keys(campos).length > 0) {
      setErrosCampos(campos);
      return;
    }

    const ehCartao = form.tipo === 'cartao_credito';
    const payload = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      diaFechamento: ehCartao ? Number(form.diaFechamento) : null,
      diaVencimento: ehCartao ? Number(form.diaVencimento) : null,
      limite: ehCartao ? Number(form.limite) : null,
      reserva: form.tipo === 'conta' ? Boolean(form.reserva) : false
    };

    setErrosCampos({});
    setSalvando(true);
    try {
      if (editandoId) {
        await apiFetch(`/fontes-destinos/${editandoId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setSucesso('Fonte/Destino atualizada com sucesso.');
      } else {
        await apiFetch('/fontes-destinos', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setSucesso('Fonte/Destino cadastrada com sucesso.');
      }
      cancelarEdicao();
      await carregarFontes();
    } catch (err) {
      setErroForm(err.message || 'Não foi possível salvar.');
      if (err.campos) setErrosCampos(err.campos);
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!fonteExcluir) return;
    setExcluindo(true);
    setErroExclusao('');
    try {
      await apiFetch(`/fontes-destinos/${fonteExcluir.id}`, { method: 'DELETE' });
      setFonteExcluir(null);
      setSucesso('Fonte/Destino excluída com sucesso.');
      await carregarFontes();
    } catch (err) {
      setErroExclusao(err.message || 'Não foi possível excluir.');
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <Container className="pb-5">
      <div className="mb-4">
        <h3 className="fw-bold mb-0">Fontes e Destinos</h3>
        <small className="text-muted">Gerencie suas rendas, contas bancárias e cartões de crédito</small>
      </div>

      {sucesso && (
        <Alert variant="success" dismissible onClose={() => setSucesso('')}>
          {sucesso}
        </Alert>
      )}

      <Row className="g-4">
        <Col lg={4}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Card.Title className="fs-5 mb-3">
                {editandoId ? 'Editar Fonte/Destino' : 'Nova Fonte/Destino'}
              </Card.Title>

              {erroForm && <Alert variant="danger">{erroForm}</Alert>}

              <Form onSubmit={handleSubmit} noValidate>
                <Form.Group className="mb-3" controlId="fonteNome">
                  <Form.Label>Nome</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ex.: Conta Corrente, Cartão Nubank"
                    maxLength={60}
                    value={form.nome}
                    onChange={(e) => atualizarCampo('nome', e.target.value)}
                    isInvalid={Boolean(errosCampos.nome)}
                  />
                  <Form.Control.Feedback type="invalid">{errosCampos.nome}</Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3" controlId="fonteTipo">
                  <Form.Label>Tipo</Form.Label>
                  <Form.Select
                    value={form.tipo}
                    onChange={(e) => atualizarCampo('tipo', e.target.value)}
                    isInvalid={Boolean(errosCampos.tipo)}
                  >
                    <option value="conta">Conta (corrente, poupança, dinheiro)</option>
                    <option value="renda">Renda (salário, freelance)</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errosCampos.tipo}</Form.Control.Feedback>
                </Form.Group>

                {form.tipo === 'conta' && (
                  <Form.Group className="mb-3" controlId="fonteReserva">
                    <Form.Check
                      type="checkbox"
                      label="Considerar como reserva de emergência"
                      checked={form.reserva}
                      onChange={(e) => atualizarCampo('reserva', e.target.checked)}
                    />
                  </Form.Group>
                )}

                {form.tipo === 'cartao_credito' && (
                  <div className="p-3 bg-light rounded mb-3 border">
                    <div className="fw-semibold small text-muted mb-2">Dados do Cartão de Crédito</div>

                    <Row className="g-2 mb-2">
                      <Col xs={6}>
                        <Form.Group controlId="fonteFechamento">
                          <Form.Label className="small">Dia Fechamento</Form.Label>
                          <Form.Control
                            type="number"
                            min={1}
                            max={31}
                            placeholder="1 a 31"
                            value={form.diaFechamento}
                            onChange={(e) => atualizarCampo('diaFechamento', e.target.value)}
                            isInvalid={Boolean(errosCampos.diaFechamento)}
                          />
                          <Form.Control.Feedback type="invalid">
                            {errosCampos.diaFechamento}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>

                      <Col xs={6}>
                        <Form.Group controlId="fonteVencimento">
                          <Form.Label className="small">Dia Vencimento</Form.Label>
                          <Form.Control
                            type="number"
                            min={1}
                            max={31}
                            placeholder="1 a 31"
                            value={form.diaVencimento}
                            onChange={(e) => atualizarCampo('diaVencimento', e.target.value)}
                            isInvalid={Boolean(errosCampos.diaVencimento)}
                          />
                          <Form.Control.Feedback type="invalid">
                            {errosCampos.diaVencimento}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group controlId="fonteLimite">
                      <Form.Label className="small">Limite (R$)</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Ex.: 2500.00"
                        value={form.limite}
                        onChange={(e) => atualizarCampo('limite', e.target.value)}
                        isInvalid={Boolean(errosCampos.limite)}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errosCampos.limite}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </div>
                )}

                <div className="d-flex gap-2">
                  <Button type="submit" variant="primary" disabled={salvando} className="flex-grow-1">
                    {salvando ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Salvando...
                      </>
                    ) : editandoId ? (
                      'Salvar Alterações'
                    ) : (
                      'Cadastrar'
                    )}
                  </Button>
                  {editandoId && (
                    <Button variant="outline-secondary" onClick={cancelarEdicao} disabled={salvando}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Card.Title className="fs-5 mb-3">Minhas Fontes e Destinos</Card.Title>

              {carregando ? (
                <div className="text-center py-4">
                  <Spinner animation="border" variant="primary" role="status" />
                  <p className="text-muted mt-2 mb-0">Carregando fontes e destinos...</p>
                </div>
              ) : erroLista ? (
                <Alert variant="danger" className="mb-0">
                  {erroLista}{' '}
                  <Button variant="link" size="sm" className="p-0 align-baseline" onClick={carregarFontes}>
                    Tentar novamente
                  </Button>
                </Alert>
              ) : fontes.length === 0 ? (
                <Alert variant="light" className="border text-center mb-0">
                  Nenhuma fonte ou destino cadastrado até o momento.
                </Alert>
              ) : (
                <Table responsive hover className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Nome</th>
                      <th>Tipo</th>
                      <th>Detalhes</th>
                      <th className="text-end">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fontes.map((item) => {
                      const info = LABEL_TIPO[item.tipo] || { texto: item.tipo, cor: 'secondary' };
                      return (
                        <tr key={item.id}>
                          <td className="fw-medium">
                            {item.nome}{' '}
                            {item.reserva && (
                              <Badge bg="info" text="dark" className="ms-1">
                                Reserva
                              </Badge>
                            )}
                          </td>
                          <td>
                            <Badge bg={info.cor} text={info.cor === 'warning' ? 'dark' : undefined}>
                              {info.texto}
                            </Badge>
                          </td>
                          <td className="small text-muted">
                            {item.tipo === 'cartao_credito'
                              ? `Fecha dia ${item.diaFechamento} | Vence dia ${item.diaVencimento} | Limite: ${formatarMoeda(item.limite)}`
                              : '-'}
                          </td>
                          <td className="text-end">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => iniciarEdicao(item)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => {
                                setErroExclusao('');
                                setFonteExcluir(item);
                              }}
                            >
                              Excluir
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={Boolean(fonteExcluir)} onHide={() => !excluindo && setFonteExcluir(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">Confirmar exclusão</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {erroExclusao && <Alert variant="danger">{erroExclusao}</Alert>}
          <p className="mb-0">
            Deseja realmente excluir <strong>{fonteExcluir?.nome}</strong>?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setFonteExcluir(null)} disabled={excluindo}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmarExclusao} disabled={excluindo}>
            {excluindo ? 'Excluindo...' : 'Excluir'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}