import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Modal,
  Pagination
} from 'react-bootstrap';
import { apiFetch, formatarMoeda, formatarDataBR } from '../services/api';

function obterPeriodoMesAtual() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ultimoDia = new Date(ano, hoje.getMonth() + 1, 0).getDate();
  return {
    inicio: `${ano}-${mes}-01`,
    fim: `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`
  };
}

function obterHojeISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

const FORM_INICIAL = {
  tipo: 'saida',
  descricao: '',
  valor: '',
  data: obterHojeISO(),
  categoriaId: '',
  fonteDestinoId: '',
  totalParcelas: 1
};

export default function Lancamentos() {
  const periodoPadrao = useMemo(() => obterPeriodoMesAtual(), []);

  const [categorias, setCategorias] = useState([]);
  const [fontes, setFontes] = useState([]);

  const [filtros, setFiltros] = useState({
    inicio: periodoPadrao.inicio,
    fim: periodoPadrao.fim,
    tipo: '',
    categoriaId: '',
    fonteDestinoId: ''
  });
  const [pagina, setPagina] = useState(1);

  const [dados, setDados] = useState({
    lancamentos: [],
    paginacao: { pagina: 1, totalPaginas: 1, totalRegistros: 0 },
    resumo: { totalEntradas: 0, totalSaidas: 0, saldo: 0 }
  });
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [errosCampos, setErrosCampos] = useState({});
  const [erroForm, setErroForm] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [lancamentoExcluir, setLancamentoExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');

  useEffect(() => {
    async function carregarAuxiliares() {
      try {
        const [cats, fts] = await Promise.all([
          apiFetch('/categorias'),
          apiFetch('/fontes-destinos')
        ]);
        setCategorias(Array.isArray(cats) ? cats : []);
        setFontes(Array.isArray(fts) ? fts : []);
      } catch {
      }
    }
    carregarAuxiliares();
  }, []);

  const carregarLancamentos = useCallback(
    async (filtrosAtivos, pagAtual) => {
      setCarregando(true);
      setErroLista('');
      try {
        const params = new URLSearchParams();
        if (filtrosAtivos.inicio) params.set('inicio', filtrosAtivos.inicio);
        if (filtrosAtivos.fim) params.set('fim', filtrosAtivos.fim);
        if (filtrosAtivos.tipo) params.set('tipo', filtrosAtivos.tipo);
        if (filtrosAtivos.categoriaId) params.set('categoriaId', filtrosAtivos.categoriaId);
        if (filtrosAtivos.fonteDestinoId) params.set('fonteDestinoId', filtrosAtivos.fonteDestinoId);
        params.set('pagina', String(pagAtual));

        const resposta = await apiFetch(`/lancamentos?${params.toString()}`);
        setDados(resposta);
      } catch (err) {
        setErroLista(err.message || 'Erro ao carregar lançamentos.');
      } finally {
        setCarregando(false);
      }
    },
    []
  );

  useEffect(() => {
    carregarLancamentos(filtros, pagina);
  }, [carregarLancamentos, filtros, pagina]);

  const categoriasCompativeis = useMemo(
    () => categorias.filter((c) => c.tipo === form.tipo),
    [categorias, form.tipo]
  );

  const fonteSelecionada = useMemo(
    () => fontes.find((f) => f.id === form.fonteDestinoId) || null,
    [fontes, form.fonteDestinoId]
  );

  const permiteParcelar =
    !editandoId && form.tipo === 'saida' && fonteSelecionada?.tipo === 'cartao_credito';

  function abrirNovo() {
    setEditandoId(null);
    setForm({ ...FORM_INICIAL, data: obterHojeISO() });
    setErrosCampos({});
    setErroForm('');
    setMostrarForm(true);
  }

  function abrirEdicao(item) {
    setEditandoId(item.id);
    setForm({
      tipo: item.tipo,
      descricao: item.descricao,
      valor: String(item.valor),
      data: item.data,
      categoriaId: item.categoriaId,
      fonteDestinoId: item.fonteDestinoId,
      totalParcelas: item.totalParcelas || 1
    });
    setErrosCampos({});
    setErroForm('');
    setMostrarForm(true);
  }

  function atualizarCampoForm(campo, valor) {
    setForm((anterior) => {
      const proximo = { ...anterior, [campo]: valor };
      if (campo === 'tipo' && anterior.tipo !== valor) {
        proximo.categoriaId = '';
        if (valor !== 'saida') proximo.totalParcelas = 1;
      }
      if (campo === 'fonteDestinoId') {
        const fonte = fontes.find((f) => f.id === valor);
        if (fonte?.tipo !== 'cartao_credito') {
          proximo.totalParcelas = 1;
        }
      }
      return proximo;
    });
    setErrosCampos((anterior) => ({ ...anterior, [campo]: undefined }));
  }

  function validarFormCliente() {
    const campos = {};
    if (!['entrada', 'saida'].includes(form.tipo)) campos.tipo = 'Tipo inválido.';
    if (!form.descricao.trim()) {
      campos.descricao = 'A descrição é obrigatória.';
    } else if (form.descricao.trim().length > 120) {
      campos.descricao = 'A descrição deve ter no máximo 120 caracteres.';
    }

    const numValor = Number(form.valor);
    const totalCentavos = Math.round(numValor * 100);
    if (!Number.isFinite(numValor) || totalCentavos < 1) {
      campos.valor = 'Informe um valor de pelo menos R$ 0,01.';
    }

    if (!form.data) campos.data = 'A data é obrigatória.';
    if (!form.categoriaId) campos.categoriaId = 'Selecione uma categoria.';
    if (!form.fonteDestinoId) campos.fonteDestinoId = 'Selecione uma fonte ou destino.';

    if (permiteParcelar) {
      const nParcelas = Number(form.totalParcelas);
      if (!Number.isInteger(nParcelas) || nParcelas < 1 || nParcelas > 48) {
        campos.totalParcelas = 'Informe entre 1 e 48 parcelas.';
      } else if (!campos.valor && totalCentavos < nParcelas) {
        campos.totalParcelas = 'O valor total é insuficiente para esta quantidade de parcelas.';
      }
    }

    return campos;
  }

  async function handleSalvar(e) {
    e.preventDefault();
    setErroForm('');
    setSucesso('');

    const campos = validarFormCliente();
    if (Object.keys(campos).length > 0) {
      setErrosCampos(campos);
      return;
    }

    const payload = {
      tipo: form.tipo,
      descricao: form.descricao.trim(),
      valor: Number(form.valor),
      data: form.data,
      categoriaId: form.categoriaId,
      fonteDestinoId: form.fonteDestinoId
    };

    if (permiteParcelar) {
      payload.totalParcelas = Number(form.totalParcelas);
    }

    setErrosCampos({});
    setSalvando(true);
    try {
      if (editandoId) {
        await apiFetch(`/lancamentos/${editandoId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setSucesso('Lançamento atualizado com sucesso.');
      } else {
        await apiFetch('/lancamentos', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setSucesso(
          permiteParcelar && Number(form.totalParcelas) > 1
            ? `Compra parcelada em ${form.totalParcelas}x registrada com sucesso.`
            : 'Lançamento cadastrado com sucesso.'
        );
      }
      setMostrarForm(false);
      await carregarLancamentos(filtros, pagina);
    } catch (err) {
      setErroForm(err.message || 'Não foi possível salvar o lançamento.');
      if (err.campos) setErrosCampos(err.campos);
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao(todasParcelas = false) {
    if (!lancamentoExcluir) return;
    setExcluindo(true);
    setErroExclusao('');
    try {
      const query = todasParcelas ? '?todasParcelas=true' : '';
      await apiFetch(`/lancamentos/${lancamentoExcluir.id}${query}`, { method: 'DELETE' });
      setLancamentoExcluir(null);
      setSucesso(
        todasParcelas
          ? 'Todas as parcelas da compra foram excluídas.'
          : 'Lançamento excluído com sucesso.'
      );
      await carregarLancamentos(filtros, pagina);
    } catch (err) {
      setErroExclusao(err.message || 'Erro ao excluir lançamento.');
    } finally {
      setExcluindo(false);
    }
  }

  function limparFiltros() {
    setFiltros({
      inicio: periodoPadrao.inicio,
      fim: periodoPadrao.fim,
      tipo: '',
      categoriaId: '',
      fonteDestinoId: ''
    });
    setPagina(1);
  }

  const previaParcelas = useMemo(() => {
    if (!permiteParcelar) return null;
    const n = Number(form.totalParcelas);
    const totalCentavos = Math.round(Number(form.valor) * 100);
    if (!Number.isInteger(n) || n <= 1 || !Number.isFinite(totalCentavos) || totalCentavos < n) {
      return null;
    }
    const base = Math.floor(totalCentavos / n);
    const resto = totalCentavos - base * n;
    const primeira = (base + resto) / 100;
    const demais = base / 100;
    if (resto === 0) {
      return `${n}x de ${formatarMoeda(demais)}`;
    }
    return `1ª parcela de ${formatarMoeda(primeira)} + ${n - 1}x de ${formatarMoeda(demais)}`;
  }, [permiteParcelar, form.valor, form.totalParcelas]);

  return (
    <Container className="pb-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h3 className="fw-bold mb-0">Lançamentos</h3>
          <small className="text-muted">Controle suas entradas, saídas e compras parceladas</small>
        </div>
        <Button variant="primary" onClick={abrirNovo}>
          Novo Lançamento
        </Button>
      </div>

      {sucesso && (
        <Alert variant="success" dismissible onClose={() => setSucesso('')}>
          {sucesso}
        </Alert>
      )}

      {/* Filtros */}
      <Card className="shadow-sm border-0 mb-4">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col sm={6} md={2}>
              <Form.Group controlId="filtroInicio">
                <Form.Label className="small text-muted mb-1">Data Inicial</Form.Label>
                <Form.Control
                  type="date"
                  size="sm"
                  value={filtros.inicio}
                  onChange={(e) => {
                    setFiltros({ ...filtros, inicio: e.target.value });
                    setPagina(1);
                  }}
                />
              </Form.Group>
            </Col>

            <Col sm={6} md={2}>
              <Form.Group controlId="filtroFim">
                <Form.Label className="small text-muted mb-1">Data Final</Form.Label>
                <Form.Control
                  type="date"
                  size="sm"
                  value={filtros.fim}
                  onChange={(e) => {
                    setFiltros({ ...filtros, fim: e.target.value });
                    setPagina(1);
                  }}
                />
              </Form.Group>
            </Col>

            <Col sm={4} md={2}>
              <Form.Group controlId="filtroTipo">
                <Form.Label className="small text-muted mb-1">Tipo</Form.Label>
                <Form.Select
                  size="sm"
                  value={filtros.tipo}
                  onChange={(e) => {
                    setFiltros({ ...filtros, tipo: e.target.value });
                    setPagina(1);
                  }}
                >
                  <option value="">Todos</option>
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col sm={4} md={2}>
              <Form.Group controlId="filtroCategoria">
                <Form.Label className="small text-muted mb-1">Categoria</Form.Label>
                <Form.Select
                  size="sm"
                  value={filtros.categoriaId}
                  onChange={(e) => {
                    setFiltros({ ...filtros, categoriaId: e.target.value });
                    setPagina(1);
                  }}
                >
                  <option value="">Todas</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.tipo === 'entrada' ? 'E' : 'S'})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col sm={4} md={2}>
              <Form.Group controlId="filtroFonte">
                <Form.Label className="small text-muted mb-1">Fonte/Destino</Form.Label>
                <Form.Select
                  size="sm"
                  value={filtros.fonteDestinoId}
                  onChange={(e) => {
                    setFiltros({ ...filtros, fonteDestinoId: e.target.value });
                    setPagina(1);
                  }}
                >
                  <option value="">Todas</option>
                  {fontes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={2}>
              <Button variant="outline-secondary" size="sm" className="w-100" onClick={limparFiltros}>
                Limpar Filtros
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Totais do período filtrado */}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="shadow-sm border-0 bg-light">
            <Card.Body className="py-3">
              <div className="small text-muted">Total de Entradas</div>
              <div className="fs-5 fw-bold text-success">
                {formatarMoeda(dados.resumo?.totalEntradas)}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm border-0 bg-light">
            <Card.Body className="py-3">
              <div className="small text-muted">Total de Saídas</div>
              <div className="fs-5 fw-bold text-danger">
                {formatarMoeda(dados.resumo?.totalSaidas)}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm border-0 bg-light">
            <Card.Body className="py-3">
              <div className="small text-muted">Saldo do Período</div>
              <div
                className={`fs-5 fw-bold ${
                  (dados.resumo?.saldo || 0) >= 0 ? 'text-primary' : 'text-danger'
                }`}
              >
                {formatarMoeda(dados.resumo?.saldo)}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabela */}
      <Card className="shadow-sm border-0">
        <Card.Body>
          {carregando ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" role="status" />
              <p className="text-muted mt-2 mb-0">Carregando lançamentos...</p>
            </div>
          ) : erroLista ? (
            <Alert variant="danger" className="mb-0">
              {erroLista}{' '}
              <Button
                variant="link"
                size="sm"
                className="p-0 align-baseline"
                onClick={() => carregarLancamentos(filtros, pagina)}
              >
                Tentar novamente
              </Button>
            </Alert>
          ) : dados.lancamentos.length === 0 ? (
            <Alert variant="light" className="border text-center mb-0">
              Nenhum lançamento encontrado para os filtros selecionados.
            </Alert>
          ) : (
            <>
              <Table responsive hover className="align-middle mb-3">
                <thead className="table-light">
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th>Fonte/Destino</th>
                    <th>Tipo</th>
                    <th className="text-end">Valor</th>
                    <th className="text-end">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.lancamentos.map((item) => (
                    <tr key={item.id}>
                      <td className="small text-muted text-nowrap">{formatarDataBR(item.data)}</td>
                      <td className="fw-medium">
                        {item.descricao}
                        {item.totalParcelas > 1 && (
                          <Badge bg="secondary" className="ms-2">
                            {item.parcelaAtual}/{item.totalParcelas}
                          </Badge>
                        )}
                      </td>
                      <td className="small">{item.categoriaNome}</td>
                      <td className="small">{item.fonteDestinoNome}</td>
                      <td>
                        <Badge bg={item.tipo === 'entrada' ? 'success' : 'danger'}>
                          {item.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </td>
                      <td
                        className={`text-end fw-semibold text-nowrap ${
                          item.tipo === 'entrada' ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {item.tipo === 'entrada' ? '+' : '-'} {formatarMoeda(item.valor)}
                      </td>
                      <td className="text-end text-nowrap">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => abrirEdicao(item)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => {
                            setErroExclusao('');
                            setLancamentoExcluir(item);
                          }}
                        >
                          Excluir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {dados.paginacao.totalPaginas > 1 && (
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    Página {dados.paginacao.pagina} de {dados.paginacao.totalPaginas} (
                    {dados.paginacao.totalRegistros} registros)
                  </small>
                  <Pagination size="sm" className="mb-0">
                    <Pagination.Prev
                      disabled={pagina <= 1}
                      onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    />
                    {Array.from({ length: dados.paginacao.totalPaginas }, (_, idx) => idx + 1).map(
                      (num) => (
                        <Pagination.Item
                          key={num}
                          active={num === pagina}
                          onClick={() => setPagina(num)}
                        >
                          {num}
                        </Pagination.Item>
                      )
                    )}
                    <Pagination.Next
                      disabled={pagina >= dados.paginacao.totalPaginas}
                      onClick={() =>
                        setPagina((p) => Math.min(dados.paginacao.totalPaginas, p + 1))
                      }
                    />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Modal de Cadastro / Edição */}
      <Modal show={mostrarForm} onHide={() => !salvando && setMostrarForm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">
            {editandoId ? 'Editar Lançamento' : 'Novo Lançamento'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSalvar} noValidate>
          <Modal.Body>
            {erroForm && <Alert variant="danger">{erroForm}</Alert>}

            <Row className="g-3">
              <Col sm={6}>
                <Form.Group controlId="lancTipo">
                  <Form.Label>Tipo</Form.Label>
                  <Form.Select
                    value={form.tipo}
                    onChange={(e) => atualizarCampoForm('tipo', e.target.value)}
                    isInvalid={Boolean(errosCampos.tipo)}
                  >
                    <option value="saida">Saída</option>
                    <option value="entrada">Entrada</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errosCampos.tipo}</Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col sm={6}>
                <Form.Group controlId="lancData">
                  <Form.Label>Data</Form.Label>
                  <Form.Control
                    type="date"
                    value={form.data}
                    onChange={(e) => atualizarCampoForm('data', e.target.value)}
                    isInvalid={Boolean(errosCampos.data)}
                  />
                  <Form.Control.Feedback type="invalid">{errosCampos.data}</Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group controlId="lancDescricao">
                  <Form.Label>Descrição</Form.Label>
                  <Form.Control
                    type="text"
                    maxLength={120}
                    placeholder="Ex.: Supermercado, Notebook, Salário"
                    value={form.descricao}
                    onChange={(e) => atualizarCampoForm('descricao', e.target.value)}
                    isInvalid={Boolean(errosCampos.descricao)}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errosCampos.descricao}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col sm={6}>
                <Form.Group controlId="lancValor">
                  <Form.Label>
                    {permiteParcelar && Number(form.totalParcelas) > 1
                      ? 'Valor Total da Compra (R$)'
                      : 'Valor (R$)'}
                  </Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={form.valor}
                    onChange={(e) => atualizarCampoForm('valor', e.target.value)}
                    isInvalid={Boolean(errosCampos.valor)}
                  />
                  <Form.Control.Feedback type="invalid">{errosCampos.valor}</Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col sm={6}>
                <Form.Group controlId="lancCategoria">
                  <Form.Label>Categoria</Form.Label>
                  <Form.Select
                    value={form.categoriaId}
                    onChange={(e) => atualizarCampoForm('categoriaId', e.target.value)}
                    isInvalid={Boolean(errosCampos.categoriaId)}
                  >
                    <option value="">Selecione...</option>
                    {categoriasCompativeis.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errosCampos.categoriaId}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group controlId="lancFonte">
                  <Form.Label>Fonte / Destino</Form.Label>
                  <Form.Select
                    value={form.fonteDestinoId}
                    onChange={(e) => atualizarCampoForm('fonteDestinoId', e.target.value)}
                    isInvalid={Boolean(errosCampos.fonteDestinoId)}
                  >
                    <option value="">Selecione...</option>
                    {fontes.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome} ({f.tipo === 'cartao_credito' ? 'Cartão' : f.tipo})
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errosCampos.fonteDestinoId}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              {permiteParcelar && (
                <Col xs={12}>
                  <div className="p-3 bg-light rounded border">
                    <Form.Group controlId="lancParcelas">
                      <Form.Label className="small fw-semibold">
                        Parcelamento no Cartão (1 a 48x)
                      </Form.Label>
                      <Form.Control
                        type="number"
                        min={1}
                        max={48}
                        value={form.totalParcelas}
                        onChange={(e) => atualizarCampoForm('totalParcelas', e.target.value)}
                        isInvalid={Boolean(errosCampos.totalParcelas)}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errosCampos.totalParcelas}
                      </Form.Control.Feedback>
                    </Form.Group>
                    {previaParcelas && (
                      <small className="text-primary d-block mt-2">
                        Divisão exata: <strong>{previaParcelas}</strong>
                      </small>
                    )}
                  </div>
                </Col>
              )}
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setMostrarForm(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={salvando}>
              {salvando ? 'Salvando...' : editandoId ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal de Exclusão (com opção de parcela única ou todas as parcelas - RF6) */}
      <Modal
        show={Boolean(lancamentoExcluir)}
        onHide={() => !excluindo && setLancamentoExcluir(null)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">Confirmar exclusão</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {erroExclusao && <Alert variant="danger">{erroExclusao}</Alert>}
          <p className="mb-2">
            Deseja excluir o lançamento <strong>{lancamentoExcluir?.descricao}</strong> (
            {formatarMoeda(lancamentoExcluir?.valor)})?
          </p>
          {lancamentoExcluir?.totalParcelas > 1 && lancamentoExcluir?.grupoParcelamento && (
            <Alert variant="warning" className="small mb-0">
              Este lançamento corresponde à parcela{' '}
              <strong>
                {lancamentoExcluir.parcelaAtual}/{lancamentoExcluir.totalParcelas}
              </strong>{' '}
              de uma compra parcelada. Escolha abaixo se deseja excluir apenas esta parcela ou todas
              as parcelas da compra.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer className="d-flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => setLancamentoExcluir(null)}
            disabled={excluindo}
          >
            Cancelar
          </Button>
          {lancamentoExcluir?.totalParcelas > 1 && lancamentoExcluir?.grupoParcelamento ? (
            <>
              <Button
                variant="outline-danger"
                onClick={() => confirmarExclusao(false)}
                disabled={excluindo}
              >
                {excluindo ? 'Excluindo...' : 'Excluir só esta parcela'}
              </Button>
              <Button
                variant="danger"
                onClick={() => confirmarExclusao(true)}
                disabled={excluindo}
              >
                {excluindo ? 'Excluindo...' : 'Excluir todas as parcelas'}
              </Button>
            </>
          ) : (
            <Button variant="danger" onClick={() => confirmarExclusao(false)} disabled={excluindo}>
              {excluindo ? 'Excluindo...' : 'Excluir'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
}