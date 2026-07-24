'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function Espelho() {
  const [cells, setCells] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [ts, setTs] = useState('');
  const [online, setOnline] = useState(true);

  async function load() {
    const { data, error } = await supabase.from('vw_espelho').select('*');
    if (!error) { setCells(data || []); setTs(new Date().toLocaleTimeString('pt-BR')); setOnline(true); }
    else { setOnline(false); }
  }
  async function loadStatus() {
    const { data } = await supabase.from('status').select('*');
    setStatuses(data || []);
  }

  useEffect(() => {
    loadStatus(); load();
    const ch = supabase
      .channel('rt-espelho')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unidade' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'status' }, () => loadStatus())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const smap = useMemo(() => { const m = {}; statuses.forEach(s => m[s.nome] = s); return m; }, [statuses]);
  const money = v => v == null ? '' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  function tower(bl, name) {
    const bu = cells.filter(c => c.bloco_num === bl);
    const floors = [...new Set(bu.map(c => c.andar))].filter(x => x != null).sort((a, b) => b - a);
    const perFloor = Math.max(1, ...floors.map(f => bu.filter(c => c.andar === f).length));
    return (
      <div className="tower" key={bl}>
        <h3>{name}</h3>
        {floors.map(f => {
          const row = bu.filter(c => c.andar === f).sort((a, b) => a.unidade_num - b.unidade_num);
          const cob = row[0] && row[0].andar_tipo === 'Cobertura';
          return (
            <div className="floor" key={f}>
              <div className="fl">{cob ? 'COB' : f}</div>
              <div className="cells" style={{ gridTemplateColumns: `repeat(${perFloor},1fr)` }}>
                {row.map(u => {
                  const s = smap[u.status] || {};
                  const tip = (u.tipologia || '').replace(' Qtos.', 'Q').replace(' Qto.', 'Q');
                  return (
                    <div className="cell" key={u.chave} style={{ background: s.cor_fundo || '#888', color: s.cor_texto || '#fff' }}>
                      <b>{u.unidade_num}</b>
                      <span className="t">{tip} · {u.m2}m²</span>
                      {u.valor != null && <span className="t">{money(u.valor)}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="topbar">
        <span className="dot" style={{ background: online ? '#2e7d32' : '#c0392b' }} />
        <b>Symphony — Ilha Pura</b>
        <span className="muted">· {cells.length} unidades · atualizado {ts}</span>
      </div>
      <div className="grid-tv">
        {tower(1, 'BL.1 - Marquês de Abrantes')}
        {tower(2, 'BL.2 - Tamoios')}
      </div>
      <div className="legend">
        {statuses.filter(s => s.visivel_tv).map(s => (
          <span key={s.nome}><i className="sw" style={{ background: s.cor_fundo }} />{s.nome}</span>
        ))}
      </div>
      <div className="muted" style={{ textAlign: 'center' }}>
        Somente leitura · sem dados de cliente, corretor ou proposta
      </div>
    </div>
  );
}
