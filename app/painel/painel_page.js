'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

function agoraLocal() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
}

export default function Painel() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [units, setUnits] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function load() {
    const { data } = await supabase.from('unidade')
      .select('chave,tipologia,m2,vagas,status,versao,unidade_num,andar')
      .order('chave').limit(1000);
    setUnits(data || []);
    const { data: st } = await supabase.from('status').select('*');
    setStatuses(st || []);
  }
  useEffect(() => {
    if (!session) return;
    load();
    const ch = supabase.channel('rt-painel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unidade' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'status' }, () => load())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [session]);

  async function login(e) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) setMsg({ t: 'err', m: 'Falha no login: ' + error.message });
  }
  async function logout() { await supabase.auth.signOut(); }

  function openEdit(u) {
    setMsg(null);
    setEditing(u.chave);
    setForm({ novo_status: u.status, cliente: '', imobiliaria: '', corretor: '', gerencia: '', hora_reserva: agoraLocal(), justificativa: '', confirma: false, versao: u.versao });
  }

  async function salvar(u) {
    const { data, error } = await supabase.rpc('reservar_unidade', {
      p_chave: u.chave,
      p_novo_status: form.novo_status,
      p_versao_esperada: form.versao,
      p_comercial: { cliente: form.cliente, imobiliaria: form.imobiliaria, corretor: form.corretor, gerencia: form.gerencia, hora_reserva: form.hora_reserva },
      p_confirma: form.confirma,
      p_justificativa: form.justificativa,
      p_origem: 'Painel Web / Vercel'
    });
    if (error) { setMsg({ t: 'err', m: error.message }); return; }
    if (data && data.ok) { setMsg({ t: 'ok', m: `${u.chave} → ${data.status} (v${data.versao})` }); setEditing(null); }
    else { setMsg({ t: 'err', m: (data && data.msg) || 'Operação rejeitada' }); }
  }

  const smap = {}; statuses.forEach(s => smap[s.nome] = s);

  if (!session) {
    return (
      <div className="home">
        <h1>Painel do operador</h1>
        <div className="muted">Entre com seu usuário (Supabase Auth). SSO Entra ID é o próximo passo.</div>
        {msg && <div className={'msg ' + (msg.t === 'ok' ? 'ok' : 'err')}>{msg.m}</div>}
        <form onSubmit={login} className="card">
          <div className="form">
            <label>E-mail<input value={email} onChange={e => setEmail(e.target.value)} /></label>
            <label>Senha<input type="password" value={senha} onChange={e => setSenha(e.target.value)} /></label>
          </div>
          <button type="submit">Entrar</button>
        </form>
      </div>
    );
  }

  const u = editing ? units.find(x => x.chave === editing) : null;

  return (
    <div className="wrap">
      <div className="topbar">
        <b>Painel do operador</b>
        <span className="muted">· {session.user.email}</span>
        <button className="sm" onClick={logout}>Sair</button>
      </div>
      {msg && <div className={'msg ' + (msg.t === 'ok' ? 'ok' : 'err')}>{msg.m}</div>}
      <table>
        <thead><tr><th>Chave</th><th>Tipologia</th><th>m²</th><th>Status</th><th>v</th><th></th></tr></thead>
        <tbody>
          {units.slice(0, 500).map(u => {
            const s = smap[u.status] || {};
            return (
              <tr key={u.chave}>
                <td>{u.chave}</td><td>{u.tipologia}</td><td>{u.m2}</td>
                <td><span className="badge" style={{ background: s.cor_fundo || '#888', color: s.cor_texto || '#fff' }}>{u.status}</span></td>
                <td>{u.versao}</td>
                <td><button className="sm" onClick={() => openEdit(u)}>Alterar</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {u && (
        <div onClick={e => { if (e.target === e.currentTarget) setEditing(null); }}
             style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 100 }}>
          <div style={{ background: '#181c22', border: '1px solid #2a323c', borderRadius: 12, maxWidth: 560, width: '100%', maxHeight: '90vh', overflow: 'auto', padding: 18 }}>
            <h3 style={{ marginTop: 0 }}>{u.chave}</h3>
            <div className="muted">versão atual v{form.versao} · status atual: {u.status}</div>
            {msg && <div className={'msg ' + (msg.t === 'ok' ? 'ok' : 'err')}>{msg.m}</div>}
            <div className="form">
              <label>Novo status
                <select value={form.novo_status} onChange={e => setForm({ ...form, novo_status: e.target.value })}>
                  {statuses.map(s => <option key={s.nome}>{s.nome}</option>)}
                </select>
              </label>
              <label>Cliente<input value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} /></label>
              <label>Imobiliária<input value={form.imobiliaria} onChange={e => setForm({ ...form, imobiliaria: e.target.value })} /></label>
              <label>Corretor<input value={form.corretor} onChange={e => setForm({ ...form, corretor: e.target.value })} /></label>
              <label>Gerente<input value={form.gerencia} onChange={e => setForm({ ...form, gerencia: e.target.value })} /></label>
              <label>Hora da reserva<input type="datetime-local" value={form.hora_reserva} onChange={e => setForm({ ...form, hora_reserva: e.target.value })} /></label>
              <label>Justificativa<input value={form.justificativa} onChange={e => setForm({ ...form, justificativa: e.target.value })} /></label>
              <label style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={form.confirma} onChange={e => setForm({ ...form, confirma: e.target.checked })} /> Confirmar ação crítica (Vendido, Bloqueada, etc.)
              </label>
            </div>
            <button onClick={() => salvar(u)}>Salvar</button>{' '}
            <button className="sm" style={{ background: '#20262e' }} onClick={() => setEditing(null)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
