import { Routes, Route, Navigate } from 'react-router-dom';
import NavbarApp from './components/NavbarApp';
import RotaProtegida from './components/RotaProtegida';
import Login from './components/Login';
import Cadastro from './components/Cadastro';
import Dashboard from './components/Dashboard';
import Lancamentos from './components/Lancamentos';
import Categorias from './components/Categorias';
import FontesDestinos from './components/FontesDestinos';
import Faturas from './components/Faturas';
import Relatorios from './components/Relatorios';
import SaudeFinanceira from './components/SaudeFinanceira';

export default function App() {
  return (
    <>
      <NavbarApp />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />

        <Route
          path="/"
          element={
            <RotaProtegida>
              <Dashboard />
            </RotaProtegida>
          }
        />
        <Route
          path="/lancamentos"
          element={
            <RotaProtegida>
              <Lancamentos />
            </RotaProtegida>
          }
        />
        <Route
          path="/categorias"
          element={
            <RotaProtegida>
              <Categorias />
            </RotaProtegida>
          }
        />
        <Route
          path="/fontes-destinos"
          element={
            <RotaProtegida>
              <FontesDestinos />
            </RotaProtegida>
          }
        />
        <Route
          path="/faturas"
          element={
            <RotaProtegida>
              <Faturas />
            </RotaProtegida>
          }
        />
        <Route
          path="/relatorios"
          element={
            <RotaProtegida>
              <Relatorios />
            </RotaProtegida>
          }
        />
        <Route
          path="/saude-financeira"
          element={
            <RotaProtegida>
              <SaudeFinanceira />
            </RotaProtegida>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}