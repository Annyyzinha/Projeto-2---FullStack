import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { formatarCPF } from '../services/api';

function validarCpfCliente(cpf) {
  const d = String(cpf || '').replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

export default function Cadastro() {
  const { cadastrar } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nome: '',
    email: '',
    cpf: '',
    senha: '',
    confirmacaoSenha: ''
  });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  function atualizarCampo(campo, valor) {
    const novoValor = campo === 'cpf' ? formatarCPF(valor) : valor;
    setForm((prev) => ({ ...prev, [campo]: novoValor }));
    if (erros[campo]) {
      setErros((prev) => {
        const copia = { ...prev };
        delete copia[campo];
        return copia;
      });
    }
  }

  function validarFormulario() {
    const novosErros = {};
    if (!form.nome.trim()) {
      novosErros.nome = 'Informe o nome completo.';
    }
    if (!form.email.trim()) {
      novosErros.email = 'Informe o e-mail.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      novosErros.email = 'Formato de e-mail inválido.';
    }
    if (!form.cpf.trim()) {
      novosErros.cpf = 'Informe o CPF.';
    } else if (!validarCpfCliente(form.cpf)) {
      novosErros.cpf = 'CPF inválido (verifique os dígitos).';
    }
    if (!form.senha) {
      novosErros.senha = 'Informe a senha.';
    } else if (form.senha.length < 8 || !/[A-Za-z]/.test(form.senha) || !/\d/.test(form.senha)) {
      novosErros.senha = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
    }
    if (!form.confirmacaoSenha) {
      novosErros.confirmacaoSenha = 'Confirme a senha.';
    } else if (form.confirmacaoSenha !== form.senha) {
      novosErros.confirmacaoSenha = 'As senhas não conferem.';
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErroGeral('');
    if (!validarFormulario()) return;

    setEnviando(true);
    try {
      await cadastrar({
        nome: form.nome.trim(),
        email: form.email.trim(),
        cpf: form.cpf,
        senha: form.senha,
        confirmacaoSenha: form.confirmacaoSenha
      });
      navigate('/', { replace: true });
    } catch (err) {
      if (err.campos && Object.keys(err.campos).length > 0) {
        setErros(err.campos);
      }
      setErroGeral(err.message || 'Não foi possível concluir o cadastro.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Container className="py-5" style={{ maxWidth: '480px' }}>
      <Card className="shadow-sm">
        <Card.Body className="p-4">
          <h3 className="fw-bold text-primary mb-1">Criar Conta</h3>
          <p className="text-muted small mb-4">
            Cadastre-se para gerenciar suas finanças pessoais
          </p>

          {erroGeral && (
            <Alert variant="danger" className="py-2 small">
              {erroGeral}
            </Alert>
          )}

          <Form onSubmit={handleSubmit} noValidate>
            <Form.Group className="mb-3" controlId="cadNome">
              <Form.Label>Nome completo</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ex.: Ana Souza"
                value={form.nome}
                isInvalid={!!erros.nome}
                onChange={(e) => atualizarCampo('nome', e.target.value)}
              />
              <Form.Control.Feedback type="invalid">{erros.nome}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3" controlId="cadEmail">
              <Form.Label>E-mail</Form.Label>
              <Form.Control
                type="email"
                placeholder="seuemail@exemplo.com"
                value={form.email}
                isInvalid={!!erros.email}
                onChange={(e) => atualizarCampo('email', e.target.value)}
              />
              <Form.Control.Feedback type="invalid">{erros.email}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3" controlId="cadCpf">
              <Form.Label>CPF</Form.Label>
              <Form.Control
                type="text"
                placeholder="000.000.000-00"
                maxLength={14}
                value={form.cpf}
                isInvalid={!!erros.cpf}
                onChange={(e) => atualizarCampo('cpf', e.target.value)}
              />
              <Form.Control.Feedback type="invalid">{erros.cpf}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3" controlId="cadSenha">
              <Form.Label>Senha</Form.Label>
              <Form.Control
                type="password"
                placeholder="Mínimo 8 caracteres (letras e números)"
                value={form.senha}
                isInvalid={!!erros.senha}
                onChange={(e) => atualizarCampo('senha', e.target.value)}
              />
              <Form.Control.Feedback type="invalid">{erros.senha}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-4" controlId="cadConfirmacao">
              <Form.Label>Confirmar senha</Form.Label>
              <Form.Control
                type="password"
                placeholder="Repita a senha"
                value={form.confirmacaoSenha}
                isInvalid={!!erros.confirmacaoSenha}
                onChange={(e) => atualizarCampo('confirmacaoSenha', e.target.value)}
              />
              <Form.Control.Feedback type="invalid">
                {erros.confirmacaoSenha}
              </Form.Control.Feedback>
            </Form.Group>

            <Button variant="primary" type="submit" className="w-100" disabled={enviando}>
              {enviando ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Cadastrando...
                </>
              ) : (
                'Cadastrar'
              )}
            </Button>
          </Form>

          <div className="text-center mt-3 small">
            Já possui conta? <Link to="/login">Entrar</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}