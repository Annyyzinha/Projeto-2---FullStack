import { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { aplicarMascaraCPF, cpfValido } from '../services/api';

export default function Cadastro() {
  const { cadastrar } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nome: '',
    email: '',
    cpf: '',
    senha: '',
    confirmarSenha: ''
  });
  const [errosCampos, setErrosCampos] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [enviando, setEnviando] = useState(false);

  function atualizarCampo(campo, valor) {
    setForm((anterior) => ({
      ...anterior,
      [campo]: campo === 'cpf' ? aplicarMascaraCPF(valor) : valor
    }));
    setErrosCampos((anterior) => ({ ...anterior, [campo]: undefined }));
  }

  function validarCliente() {
    const campos = {};
    if (!form.nome.trim()) campos.nome = 'O nome é obrigatório.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      campos.email = 'Informe um e-mail válido.';
    }
    if (!cpfValido(form.cpf)) {
      campos.cpf = 'CPF inválido. Verifique os dígitos.';
    }
    if (form.senha.length < 8 || !/[a-zA-Z]/.test(form.senha) || !/\d/.test(form.senha)) {
      campos.senha = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
    }
    if (form.senha !== form.confirmarSenha) {
      campos.confirmarSenha = 'A confirmação de senha não confere.';
    }
    return campos;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErroGeral('');
    setSucesso('');

    const campos = validarCliente();
    if (Object.keys(campos).length > 0) {
      setErrosCampos(campos);
      return;
    }

    setErrosCampos({});
    setEnviando(true);
    try {
      await cadastrar({
        nome: form.nome.trim(),
        email: form.email.trim(),
        cpf: form.cpf,
        senha: form.senha
      });
      setSucesso('Cadastro realizado com sucesso! Redirecionando para o login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setErroGeral(err.message || 'Não foi possível concluir o cadastro.');
      if (err.campos) setErrosCampos(err.campos);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <Card className="auth-card" style={{ maxWidth: '520px' }}>
        <Card.Body className="p-4">
          <h3 className="fw-bold mb-1 text-center">Criar Conta</h3>
          <p className="text-muted text-center mb-4">Preencha seus dados para começar</p>

          {erroGeral && <Alert variant="danger">{erroGeral}</Alert>}
          {sucesso && <Alert variant="success">{sucesso}</Alert>}

          <Form onSubmit={handleSubmit} noValidate>
            <Form.Group className="mb-3" controlId="cadNome">
              <Form.Label>Nome completo</Form.Label>
              <Form.Control
                type="text"
                value={form.nome}
                onChange={(e) => atualizarCampo('nome', e.target.value)}
                isInvalid={Boolean(errosCampos.nome)}
              />
              <Form.Control.Feedback type="invalid">{errosCampos.nome}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3" controlId="cadEmail">
              <Form.Label>E-mail</Form.Label>
              <Form.Control
                type="email"
                value={form.email}
                onChange={(e) => atualizarCampo('email', e.target.value)}
                isInvalid={Boolean(errosCampos.email)}
              />
              <Form.Control.Feedback type="invalid">{errosCampos.email}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3" controlId="cadCpf">
              <Form.Label>CPF</Form.Label>
              <Form.Control
                type="text"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => atualizarCampo('cpf', e.target.value)}
                isInvalid={Boolean(errosCampos.cpf)}
              />
              <Form.Control.Feedback type="invalid">{errosCampos.cpf}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3" controlId="cadSenha">
              <Form.Label>Senha</Form.Label>
              <Form.Control
                type="password"
                placeholder="Mínimo 8 caracteres (letras e números)"
                value={form.senha}
                onChange={(e) => atualizarCampo('senha', e.target.value)}
                isInvalid={Boolean(errosCampos.senha)}
              />
              <Form.Control.Feedback type="invalid">{errosCampos.senha}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-4" controlId="cadConfirmarSenha">
              <Form.Label>Confirmar senha</Form.Label>
              <Form.Control
                type="password"
                value={form.confirmarSenha}
                onChange={(e) => atualizarCampo('confirmarSenha', e.target.value)}
                isInvalid={Boolean(errosCampos.confirmarSenha)}
              />
              <Form.Control.Feedback type="invalid">
                {errosCampos.confirmarSenha}
              </Form.Control.Feedback>
            </Form.Group>

            <Button type="submit" variant="primary" className="w-100" disabled={enviando}>
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

          <div className="text-center mt-3">
            <small className="text-muted">
              Já possui conta? <Link to="/login">Fazer login</Link>
            </small>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}