import { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [errosCampos, setErrosCampos] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErroGeral('');

    const campos = {};
    if (!email.trim()) campos.email = 'Informe seu e-mail.';
    if (!senha) campos.senha = 'Informe sua senha.';

    if (Object.keys(campos).length > 0) {
      setErrosCampos(campos);
      return;
    }

    setErrosCampos({});
    setEnviando(true);
    try {
      await login(email.trim(), senha);
      navigate('/');
    } catch (err) {
      setErroGeral(err.message || 'E-mail ou senha inválidos.');
      if (err.campos) setErrosCampos(err.campos);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <Card className="auth-card">
        <Card.Body className="p-4 p-md-5">
          <div className="text-center mb-4">
            <div className="brand-icon-box mx-auto mb-3" style={{ width: '48px', height: '48px', borderRadius: '14px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h3 className="fw-bold mb-1">Bem-vindo ao FinControl</h3>
            <p className="text-muted small mb-0">Acesse sua conta para gerenciar suas finanças</p>
          </div>

          {erroGeral && <Alert variant="danger">{erroGeral}</Alert>}

          <Form onSubmit={handleSubmit} noValidate>
            <Form.Group className="mb-3" controlId="loginEmail">
              <Form.Label className="fw-semibold small">E-mail</Form.Label>
              <Form.Control
                type="email"
                placeholder="nome@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                isInvalid={Boolean(errosCampos.email)}
              />
              <Form.Control.Feedback type="invalid">{errosCampos.email}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-4" controlId="loginSenha">
              <Form.Label className="fw-semibold small">Senha</Form.Label>
              <Form.Control
                type="password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                isInvalid={Boolean(errosCampos.senha)}
              />
              <Form.Control.Feedback type="invalid">{errosCampos.senha}</Form.Control.Feedback>
            </Form.Group>

            <Button type="submit" variant="primary" className="w-100 py-2" disabled={enviando}>
              {enviando ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </Form>

          <div className="text-center mt-4">
            <small className="text-muted">
              Não tem conta?{' '}
              <Link to="/cadastro" className="fw-semibold text-decoration-none">
                Cadastre-se gratuitamente
              </Link>
            </small>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}