export function cpfValido(cpf) {
  const d = String(cpf ?? '').replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) {
    return false;
  }
  const digito = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => d.toISOString().slice(0, 10);

function ultimoDiaDoMes(ano, mes) {
  return new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
}

function dataSegura(ano, mes, dia) {
  const a = ano + Math.floor(mes / 12);
  const m = ((mes % 12) + 12) % 12;
  return new Date(Date.UTC(a, m, Math.min(dia, ultimoDiaDoMes(a, m))));
}

export function dataValida(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [a, m, d] = s.split('-').map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= ultimoDiaDoMes(a, m - 1);
}

export function adicionarMeses(dataIso, n) {
  const [a, m, d] = dataIso.split('-').map(Number);
  return iso(dataSegura(a, m - 1 + n, d));
}

export function adicionarDias(dataIso, n) {
  const dt = new Date(`${dataIso}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return iso(dt);
}

export function hojeIso(agora = new Date()) {
  return `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}`;
}

export function mesDe(dataIso) {
  const [a, m] = dataIso.split('-').map(Number);
  return {
    inicio: `${a}-${pad(m)}-01`,
    fim: `${a}-${pad(m)}-${pad(ultimoDiaDoMes(a, m - 1))}`
  };
}

export function periodoAnterior(inicio, fim) {
  const [ai, mi, di] = inicio.split('-').map(Number);
  const [af, mf, df] = fim.split('-').map(Number);
  if (di === 1 && df === ultimoDiaDoMes(af, mf - 1)) {
    const meses = (af - ai) * 12 + (mf - mi) + 1;
    const ini = adicionarMeses(inicio, -meses);
    return { inicio: ini, fim: adicionarDias(inicio, -1) };
  }
  const dias = Math.round((Date.parse(fim) - Date.parse(inicio)) / 86400000) + 1;
  return { inicio: adicionarDias(inicio, -dias), fim: adicionarDias(inicio, -1) };
}

export const deCentavos = (c) => Number(((Number(c) || 0) / 100).toFixed(2));
export const dinheiro = (v) => (v === null || v === undefined ? 0 : Math.round(Number(v) * 100) / 100);

export function calcularFatura(dataCompra, cartao, numeroParcela = 1) {
  const [ano, mes, dia] = dataCompra.split('-').map(Number);
  const m = mes - 1;
  const fechamentoDoMes = Math.min(cartao.diaFechamento, ultimoDiaDoMes(ano, m));
  let mesFechamento = dia < fechamentoDoMes ? m : m + 1;
  mesFechamento += numeroParcela - 1;

  const fechamento = dataSegura(ano, mesFechamento, cartao.diaFechamento);
  const mesVencimento =
    cartao.diaVencimento > cartao.diaFechamento ? mesFechamento : mesFechamento + 1;
  const vencimento = dataSegura(ano, mesVencimento, cartao.diaVencimento);

  return {
    referencia: iso(vencimento).slice(0, 7),
    fechamento: iso(fechamento),
    vencimento: iso(vencimento)
  };
}