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
import { apiFetch } from '../services/api';

const FORM_INICIAL = { nome: '', tipo: 'saida' };

export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState('');

  const [form, setForm] = useState(FORM_INICIAL);
  const [editandoId, setEditandoId] = useState(null);
  const [errosCampos, setErrosCampos] = useState({});
  const [erroForm, setErroForm] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [categoriaExcluir, setCategoriaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');

  const carregarCategorias = useCallback(async () => {
    setCarregando(true);
    setErroLista('');
    try {
      const dados = await apiFetch('/categorias');
      setCategorias(Array.isArray(dados) ? dados : []);
    } catch (err) {
      setErroLista(err.message || 'Erro ao carregar categorias.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarCategorias();
  }, [carregarCategorias]);

  function iniciarEdicao(cat) {
    setEditandoId(cat.id);
    setForm({ nome: cat.nome, tipo: cat.tipo });
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

  async function handleSubmit(e) {
    e.preventDefault();
    setErroForm('');
    setSucesso('');

    const campos = {};
    if (!form.nome.trim()) {
      campos.nome = 'O nome da categoria é obrigatório.';
    } else if (form.nome.trim().length > 60) {
      campos.nome = 'O nome deve ter no máximo 60 caracteres.';
    }
    if (!['entrada', 'saida'].includes(form.tipo)) {
      campos.tipo = 'Selecione um tipo válido.';
    }

    if (Object.keys(campos).length > 0) {
      setErrosCampos(campos);
      return;
    }

    setErrosCampos({});
    setSalvando(true);
    try {
      const payload = { nome: form.nome.trim(), tipo: form.tipo };
      if (editandoId) {
        await apiFetch(`/categorias/${editandoId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setSucesso('Categoria atualizada com sucesso.');
      } else {
        await apiFetch('/categorias', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setSucesso('Categoria criada com sucesso.');
      }
      cancelarEdicao();
      await carregarCategorias();
    } catch (err) {
      setErroForm(err.message || 'Não foi possível salvar a categoria.');
      if (err.campos) setErrosCampos(err.campos);
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!categoriaExcluir) return;
    setExcluindo(true);
    setErroExclusao('');
    try {
      await apiFetch(`/categorias/${categoriaExcluir.id}`, { method: 'DELETE' });
      setCategoriaExcluir(null);
      setSucesso('Categoria excluída com sucesso.');
      await carregarCategorias();
    } catch (err) {
      setErroExclusao(err.message || 'Não foi possível excluir a categoria.');
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <Container className="pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-0">Categorias</h3>
          <small className="text-muted">Gerencie as categorias de entradas e saídas</small>
        </div>
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
                {editandoId ? 'Editar Categoria' : 'Nova Categoria'}
              </Card.Title>

              {erroForm && <Alert variant="danger">{erroForm}</Alert>}

              <Form onSubmit={handleSubmit} noValidate>
                <Form.Group className="mb-3" controlId="catNome">
                  <Form.Label>Nome</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ex.: Alimentação, Freelance"
                    maxLength={60}
                    value={form.nome}
                    onChange={(e) => {
                      setForm({ ...form, nome: e.target.value });
                      setErrosCampos({ ...errosCampos, nome: undefined });
                    }}
                    isInvalid={Boolean(errosCampos.nome)}
                  />
                  <Form.Control.Feedback type="invalid">{errosCampos.nome}</Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3" controlId="catTipo">
                  <Form.Label>Tipo</Form.Label>
                  <Form.Select
                    value={form.tipo}
                    onChange={(e) => {
                      setForm({ ...form, tipo: e.target.value });
                      setErrosCampos({ ...errosCampos, tipo: undefined });
                    }}
                    isInvalid={Boolean(errosCampos.tipo)}
                  >
                    <option value="saida">Saída</option>
                    <option value="entrada">Entrada</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errosCampos.tipo}</Form.Control.Feedback>
                </Form.Group>

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
              <Card.Title className="fs-5 mb-3">Minhas Categorias</Card.Title>

              {carregando ? (
                <div className="text-center py-4">
                  <Spinner animation="border" variant="primary" role="status" />
                  <p className="text-muted mt-2 mb-0">Carregando categorias...</p>
                </div>
              ) : erroLista ? (
                <Alert variant="danger" className="mb-0">
                  {erroLista}{' '}
                  <Button variant="link" size="sm" className="p-0 align-baseline" onClick={carregarCategorias}>
                    Tentar novamente
                  </Button>
                </Alert>
              ) : categorias.length === 0 ? (
                <Alert variant="light" className="border text-center mb-0">
                  Nenhuma categoria cadastrada até o momento.
                </Alert>
              ) : (
                <Table responsive hover className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Nome</th>
                      <th>Tipo</th>
                      <th className="text-end">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorias.map((cat) => (
                      <tr key={cat.id}>
                        <td className="fw-medium">{cat.nome}</td>
                        <td>
                          <Badge bg={cat.tipo === 'entrada' ? 'success' : 'danger'}>
                            {cat.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                          </Badge>
                        </td>
                        <td className="text-end">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => iniciarEdicao(cat)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => {
                              setErroExclusao('');
                              setCategoriaExcluir(cat);
                            }}
                          >
                            Excluir
                          </Button>
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

      <Modal show={Boolean(categoriaExcluir)} onHide={() => !excluindo && setCategoriaExcluir(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">Confirmar exclusão</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {erroExclusao && <Alert variant="danger">{erroExclusao}</Alert>}
          <p className="mb-0">
            Deseja realmente excluir a categoria <strong>{categoriaExcluir?.nome}</strong>?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setCategoriaExcluir(null)} disabled={excluindo}>
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