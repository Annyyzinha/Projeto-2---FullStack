import { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [usuario, setUsuario] = useState(() => {
    const salvo = localStorage.getItem('usuario');
    try {
      return salvo ? JSON.parse(salvo) : null;
    } catch {
      return null;
    }
  });
  const [carregandoAuth, setCarregandoAuth] = useState(Boolean(localStorage.getItem('token')));

  useEffect(() => {
    async function validarSessao() {
      if (!token) {
        setCarregandoAuth(false);
        return;
      }
      try {
        const dados = await apiFetch('/auth/me');
        setUsuario(dados);
        localStorage.setItem('usuario', JSON.stringify(dados));
      } catch {
        setToken(null);
        setUsuario(null);
      } finally {
        setCarregandoAuth(false);
      }
    }
    validarSessao();
  }, [token]);

  async function login(email, senha) {
    const dados = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha })
    });
    localStorage.setItem('token', dados.token);
    localStorage.setItem('usuario', JSON.stringify(dados.usuario));
    setToken(dados.token);
    setUsuario(dados.usuario);
    return dados;
  }

  async function cadastrar({ nome, email, cpf, senha }) {
    return apiFetch('/auth/cadastro', {
      method: 'POST',
      body: JSON.stringify({ nome, email, cpf, senha })
    });
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        autenticado: Boolean(token),
        carregandoAuth,
        login,
        cadastrar,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}