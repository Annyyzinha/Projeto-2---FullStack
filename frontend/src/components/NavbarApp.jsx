import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function NavbarApp() {
  const { autenticado, usuario, logout } = useAuth();
  const navigate = useNavigate();

  if (!autenticado) return null;

  const iniciais = (usuario?.nome || 'U')
    .trim()
    .split(/\s+/)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <Navbar expand="lg" variant="dark" className="navbar-fintech mb-4 sticky-top">
      <Container>
        <Navbar.Brand as={NavLink} to="/">
          <span className="brand-icon-box" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </span>
          <span>FinControl</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="menu-principal" />
        <Navbar.Collapse id="menu-principal">
          <Nav className="me-auto my-2 my-lg-0">
            <Nav.Link as={NavLink} to="/" end>
              Dashboard
            </Nav.Link>
            <Nav.Link as={NavLink} to="/lancamentos">
              Lançamentos
            </Nav.Link>
            <Nav.Link as={NavLink} to="/categorias">
              Categorias
            </Nav.Link>
            <Nav.Link as={NavLink} to="/fontes-destinos">
              Fontes/Destinos
            </Nav.Link>
            <Nav.Link as={NavLink} to="/faturas">
              Faturas
            </Nav.Link>
            <Nav.Link as={NavLink} to="/relatorios">
              Relatórios
            </Nav.Link>
            <Nav.Link as={NavLink} to="/saude-financeira">
              Saúde Financeira
            </Nav.Link>
          </Nav>

          <div className="d-flex align-items-center gap-2 mt-2 mt-lg-0">
            <div className="user-chip">
              <span className="user-avatar">{iniciais}</span>
              <span className="text-white small fw-medium">{usuario?.nome}</span>
            </div>
            <Button
              variant="light"
              size="sm"
              className="text-primary fw-semibold px-3"
              onClick={handleLogout}
            >
              Sair
            </Button>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}