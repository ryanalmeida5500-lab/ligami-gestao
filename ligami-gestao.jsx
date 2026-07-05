import React, { useState, useEffect, useMemo } from "react";
import {
  Activity, Users, Calendar, Presentation, Stethoscope,
  Plus, Trash2, Check, X, ChevronRight, TrendingUp, MapPin, Clock,
  Award, ListChecks, Medal
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────
// Intensivismo: fundo carvão clínico, traçado de ECG vermelho como assinatura,
// verde-monitor pra confirmações. Nada de cream/terracota template.
const C = {
  ink: "#0E1116",
  panel: "#161B22",
  panel2: "#1C2230",
  line: "#2A3240",
  text: "#E6EAF0",
  dim: "#8A94A6",
  ecg: "#E63946",      // vermelho do traçado (do logo)
  monitor: "#3DDC84",  // verde monitor
  amber: "#F2B84B",
};

const KEY = "ligami:v1";

// ── Persistência compartilhada ────────────────────────────
async function loadState() {
  try {
    const r = await window.storage.get(KEY, true);
    return r ? JSON.parse(r.value) : null;
  } catch { return null; }
}
async function saveState(state) {
  try { await window.storage.set(KEY, JSON.stringify(state), true); }
  catch (e) { console.error("Falha ao salvar", e); }
}

const emptyState = {
  ligantes: [],
  escalas: [],   // {id, liganteId, local, data, turno}
  reunioes: [],  // {id, tema, data, responsavel, presentes:[liganteId]}
  eventos: [],   // {id, nome, data, tipo, status}
};

const uid = () => Math.random().toString(36).slice(2, 9);
const fmtData = (s) => {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

export default function App() {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadState().then((s) => setState(s || emptyState));
  }, []);

  const update = (next) => {
    setState(next);
    setSaving(true);
    saveState(next).finally(() => setTimeout(() => setSaving(false), 400));
  };

  if (!state) {
    return (
      <div style={{ minHeight: "100vh", background: C.ink, color: C.dim,
        display: "grid", placeItems: "center", fontFamily: "system-ui" }}>
        <EcgPulse /> <span style={{ marginLeft: 12 }}>Carregando…</span>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", label: "Painel", icon: Activity },
    { id: "ligantes", label: "Ligantes", icon: Users },
    { id: "escalas", label: "Escalas", icon: Stethoscope },
    { id: "reunioes", label: "Reuniões", icon: Calendar },
    { id: "presenca", label: "Presença", icon: Award },
    { id: "eventos", label: "Simpósios", icon: Presentation },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap');
        * { box-sizing: border-box; }
        button { cursor: pointer; font-family: inherit; }
        input, select { font-family: inherit; }
        input::placeholder { color: ${C.dim}; }
        @keyframes ecg { 0%{stroke-dashoffset:300} 100%{stroke-dashoffset:0} }
        @keyframes pop { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        .card { animation: pop .3s ease both; }
        .tabbtn:hover { background: ${C.panel2} !important; }
        .rowdel:hover { color: ${C.ecg} !important; }
      `}</style>

      {/* Header com traçado de ECG */}
      <header style={{ borderBottom: `1px solid ${C.line}`, background: C.panel,
        position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "16px 20px",
          display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <EcgMark />
            <div>
              <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700,
                fontSize: 18, letterSpacing: "-0.02em" }}>
                LIGAMI <span style={{ color: C.ecg }}>·</span> Gestão
              </div>
              <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.08em",
                textTransform: "uppercase" }}>
                Liga de Medicina Intensiva · Itaperuna
              </div>
            </div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 12, color: saving ? C.monitor : C.dim,
            display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%",
              background: saving ? C.monitor : C.line }} />
            {saving ? "Salvando…" : "Sincronizado"}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ maxWidth: 1080, margin: "0 auto", padding: "0 12px",
          display: "flex", gap: 2, overflowX: "auto" }}>
          {tabs.map((t) => {
            const on = tab === t.id;
            const Icon = t.icon;
            return (
              <button key={t.id} className="tabbtn" onClick={() => setTab(t.id)}
                style={{ display: "flex", alignItems: "center", gap: 7,
                  padding: "12px 16px", background: "transparent", border: "none",
                  color: on ? C.text : C.dim, fontWeight: on ? 600 : 500, fontSize: 14,
                  borderBottom: `2px solid ${on ? C.ecg : "transparent"}`,
                  whiteSpace: "nowrap" }}>
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 20px 60px" }}>
        {tab === "dashboard" && <Dashboard state={state} setTab={setTab} />}
        {tab === "ligantes" && <Ligantes state={state} update={update} />}
        {tab === "escalas" && <Escalas state={state} update={update} />}
        {tab === "reunioes" && <Reunioes state={state} update={update} />}
        {tab === "presenca" && <Presenca state={state} setTab={setTab} />}
        {tab === "eventos" && <Eventos state={state} update={update} />}
      </main>

      <footer style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px 40px",
        fontSize: 12, color: C.dim, lineHeight: 1.6 }}>
        Os dados ficam salvos de forma compartilhada: qualquer diretor que abrir
        este mesmo app vê e edita as mesmas informações.
      </footer>
    </div>
  );
}

// ── Componentes visuais ───────────────────────────────────
function EcgMark() {
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
      <circle cx="21" cy="21" r="19" stroke={C.line} strokeWidth="2.5" />
      <path d="M6 21 H14 L17 12 L21 30 L25 16 L28 21 H36"
        stroke={C.ecg} strokeWidth="2.5" strokeLinecap="round"
        strokeLinejoin="round" strokeDasharray="300"
        style={{ animation: "ecg 1.6s ease-out both" }} />
    </svg>
  );
}
function EcgPulse() {
  return (
    <svg width="60" height="24" viewBox="0 0 60 24" fill="none">
      <path d="M2 12 H16 L20 4 L26 20 L31 8 L34 12 H58" stroke={C.ecg}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="120" style={{ animation: "ecg 1.4s linear infinite" }} />
    </svg>
  );
}

function Section({ title, sub, action, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "'Space Grotesk'", fontSize: 20,
            fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</h2>
          {sub && <p style={{ margin: "3px 0 0", fontSize: 13, color: C.dim }}>{sub}</p>}
        </div>
        {action && <div style={{ marginLeft: "auto" }}>{action}</div>}
      </div>
      {children}
    </div>
  );
}

function Btn({ children, onClick, tone = "ecg", small }) {
  const bg = tone === "ecg" ? C.ecg : tone === "ghost" ? "transparent" : C.panel2;
  return (
    <button onClick={onClick} style={{
      background: bg, color: tone === "ghost" ? C.dim : "#fff",
      border: tone === "ghost" ? `1px solid ${C.line}` : "none",
      borderRadius: 8, padding: small ? "7px 12px" : "10px 16px",
      fontSize: 13, fontWeight: 600, display: "inline-flex",
      alignItems: "center", gap: 6 }}>
      {children}
    </button>
  );
}

const inputStyle = {
  background: C.ink, border: `1px solid ${C.line}`, borderRadius: 8,
  padding: "10px 12px", color: C.text, fontSize: 14, width: "100%",
};

function Card({ children, style }) {
  return (
    <div className="card" style={{ background: C.panel, border: `1px solid ${C.line}`,
      borderRadius: 12, padding: 16, ...style }}>{children}</div>
  );
}

function Empty({ children }) {
  return (
    <Card style={{ textAlign: "center", padding: "40px 20px", color: C.dim }}>
      <EcgPulse />
      <p style={{ margin: "12px 0 0", fontSize: 14 }}>{children}</p>
    </Card>
  );
}

// ── Dashboard ─────────────────────────────────────────────
function Dashboard({ state, setTab }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const proxReunioes = state.reunioes
    .filter((r) => r.data >= hoje).sort((a, b) => a.data.localeCompare(b.data));
  const proxEventos = state.eventos
    .filter((e) => e.data >= hoje).sort((a, b) => a.data.localeCompare(b.data));

  const presencaMedia = useMemo(() => {
    const rs = state.reunioes.filter((r) => r.data < hoje);
    if (!rs.length || !state.ligantes.length) return 0;
    const soma = rs.reduce((a, r) => a + (r.presentes?.length || 0), 0);
    return Math.round((soma / (rs.length * state.ligantes.length)) * 100);
  }, [state, hoje]);

  const porLocal = useMemo(() => {
    const cti = state.escalas.filter((e) => e.local === "CTI").length;
    const upa = state.escalas.filter((e) => e.local === "UPA").length;
    return { cti, upa, total: cti + upa };
  }, [state]);

  const stats = [
    { label: "Ligantes ativos", value: state.ligantes.length, icon: Users, go: "ligantes" },
    { label: "Plantões escalados", value: porLocal.total, icon: Stethoscope, go: "escalas" },
    { label: "Reuniões registradas", value: state.reunioes.length, icon: Calendar, go: "reunioes" },
    { label: "Presença média", value: `${presencaMedia}%`, icon: TrendingUp, go: "reunioes", accent: true },
  ];

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
        gap: 12, marginBottom: 28 }}>
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} style={{ cursor: "pointer" }}>
              <div onClick={() => setTab(s.go)}>
                <Icon size={18} color={s.accent ? C.monitor : C.ecg} />
                <div style={{ fontFamily: "'Space Grotesk'", fontSize: 32, fontWeight: 700,
                  marginTop: 8, color: s.accent ? C.monitor : C.text }}>{s.value}</div>
                <div style={{ fontSize: 12, color: C.dim }}>{s.label}</div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Barra CTI vs UPA */}
      <Section title="Distribuição de plantões" sub="CTI × UPA">
        {porLocal.total === 0 ? (
          <Empty>Nenhum plantão escalado ainda.</Empty>
        ) : (
          <Card>
            <BarRow label="CTI" value={porLocal.cti} total={porLocal.total} color={C.ecg} />
            <BarRow label="UPA" value={porLocal.upa} total={porLocal.total} color={C.amber} />
          </Card>
        )}
      </Section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
        <Section title="Próximas reuniões" sub="Educação continuada">
          {proxReunioes.length === 0 ? <Empty>Sem reuniões agendadas.</Empty> :
            proxReunioes.slice(0, 4).map((r) => (
              <Card key={r.id} style={{ marginBottom: 8, display: "flex", gap: 12, alignItems: "center" }}>
                <DateChip data={r.data} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{r.tema}</div>
                  <div style={{ fontSize: 12, color: C.dim }}>{r.responsavel || "Sem responsável"}</div>
                </div>
              </Card>
            ))}
        </Section>

        <Section title="Próximos simpósios" sub="Eventos do ano">
          {proxEventos.length === 0 ? <Empty>Sem eventos agendados.</Empty> :
            proxEventos.slice(0, 4).map((e) => (
              <Card key={e.id} style={{ marginBottom: 8, display: "flex", gap: 12, alignItems: "center" }}>
                <DateChip data={e.data} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{e.nome}</div>
                  <div style={{ fontSize: 12, color: C.dim }}>{e.tipo} · {e.status}</div>
                </div>
              </Card>
            ))}
        </Section>
      </div>
    </>
  );
}

function BarRow({ label, value, total, color }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13,
        marginBottom: 5 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color: C.dim }}>{value} · {pct}%</span>
      </div>
      <div style={{ height: 8, background: C.ink, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color,
          borderRadius: 4, transition: "width .5s ease" }} />
      </div>
    </div>
  );
}

function DateChip({ data }) {
  const [y, m, d] = data.split("-");
  const meses = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  return (
    <div style={{ textAlign: "center", background: C.ink, borderRadius: 8,
      padding: "6px 10px", minWidth: 46, border: `1px solid ${C.line}` }}>
      <div style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{d}</div>
      <div style={{ fontSize: 10, color: C.ecg, fontWeight: 600 }}>{meses[+m - 1]}</div>
    </div>
  );
}

// ── Ligantes ──────────────────────────────────────────────
function Ligantes({ state, update }) {
  const [nome, setNome] = useState("");
  const [periodo, setPeriodo] = useState("");

  const add = () => {
    if (!nome.trim()) return;
    update({ ...state, ligantes: [...state.ligantes,
      { id: uid(), nome: nome.trim(), periodo: periodo.trim() }] });
    setNome(""); setPeriodo("");
  };
  const del = (id) => update({
    ...state,
    ligantes: state.ligantes.filter((l) => l.id !== id),
    escalas: state.escalas.filter((e) => e.liganteId !== id),
    reunioes: state.reunioes.map((r) => ({ ...r,
      presentes: (r.presentes || []).filter((p) => p !== id) })),
  });

  return (
    <Section title="Ligantes" sub="Membros da liga">
      <Card style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input style={{ ...inputStyle, flex: 2, minWidth: 160 }} placeholder="Nome do ligante"
          value={nome} onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()} />
        <input style={{ ...inputStyle, flex: 1, minWidth: 120 }} placeholder="Período (ex: 8º)"
          value={periodo} onChange={(e) => setPeriodo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()} />
        <Btn onClick={add}><Plus size={15} /> Adicionar</Btn>
      </Card>

      {state.ligantes.length === 0 ? <Empty>Cadastre o primeiro ligante acima.</Empty> :
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
          {state.ligantes.map((l) => (
            <Card key={l.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.panel2,
                display: "grid", placeItems: "center", fontWeight: 700, color: C.ecg,
                fontFamily: "'Space Grotesk'" }}>
                {l.nome.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.nome}</div>
                {l.periodo && <div style={{ fontSize: 12, color: C.dim }}>{l.periodo} período</div>}
              </div>
              <Trash2 className="rowdel" size={16} color={C.dim}
                style={{ cursor: "pointer" }} onClick={() => del(l.id)} />
            </Card>
          ))}
        </div>}
    </Section>
  );
}

// ── Escalas ───────────────────────────────────────────────
function Escalas({ state, update }) {
  const [f, setF] = useState({ liganteId: "", local: "CTI", data: "", turno: "Manhã" });

  const add = () => {
    if (!f.liganteId || !f.data) return;
    update({ ...state, escalas: [...state.escalas, { id: uid(), ...f }] });
    setF({ ...f, data: "" });
  };
  const del = (id) => update({ ...state, escalas: state.escalas.filter((e) => e.id !== id) });
  const nome = (id) => state.ligantes.find((l) => l.id === id)?.nome || "—";

  const ordenadas = [...state.escalas].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <Section title="Escala de estágios" sub="CTI e UPA">
      {state.ligantes.length === 0 ?
        <Empty>Cadastre ligantes antes de montar a escala.</Empty> : (
        <>
          <Card style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select style={{ ...inputStyle, flex: 2, minWidth: 150 }} value={f.liganteId}
              onChange={(e) => setF({ ...f, liganteId: e.target.value })}>
              <option value="">Selecionar ligante…</option>
              {state.ligantes.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
            <select style={{ ...inputStyle, flex: 1, minWidth: 90 }} value={f.local}
              onChange={(e) => setF({ ...f, local: e.target.value })}>
              <option>CTI</option><option>UPA</option>
            </select>
            <select style={{ ...inputStyle, flex: 1, minWidth: 100 }} value={f.turno}
              onChange={(e) => setF({ ...f, turno: e.target.value })}>
              <option>Manhã</option><option>Tarde</option><option>Noite</option>
            </select>
            <input type="date" style={{ ...inputStyle, flex: 1, minWidth: 140 }} value={f.data}
              onChange={(e) => setF({ ...f, data: e.target.value })} />
            <Btn onClick={add}><Plus size={15} /> Escalar</Btn>
          </Card>

          {ordenadas.length === 0 ? <Empty>Nenhum plantão escalado.</Empty> :
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ordenadas.map((e) => (
                <Card key={e.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <DateChip data={e.data} />
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px",
                    borderRadius: 6, background: e.local === "CTI" ? "rgba(230,57,70,.15)" : "rgba(242,184,75,.15)",
                    color: e.local === "CTI" ? C.ecg : C.amber }}>{e.local}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{nome(e.liganteId)}</div>
                    <div style={{ fontSize: 12, color: C.dim, display: "flex", alignItems: "center", gap: 5 }}>
                      <Clock size={12} /> {e.turno}
                    </div>
                  </div>
                  <Trash2 className="rowdel" size={16} color={C.dim}
                    style={{ cursor: "pointer" }} onClick={() => del(e.id)} />
                </Card>
              ))}
            </div>}
        </>
      )}
    </Section>
  );
}

// ── Reuniões (com presença) ───────────────────────────────
function Reunioes({ state, update }) {
  const [f, setF] = useState({ tema: "", data: "", responsavel: "" });
  const [aberta, setAberta] = useState(null);

  const add = () => {
    if (!f.tema.trim() || !f.data) return;
    update({ ...state, reunioes: [...state.reunioes,
      { id: uid(), ...f, tema: f.tema.trim(), presentes: [] }] });
    setF({ tema: "", data: "", responsavel: "" });
  };
  const del = (id) => update({ ...state, reunioes: state.reunioes.filter((r) => r.id !== id) });
  const togglePresenca = (rid, lid) => {
    update({ ...state, reunioes: state.reunioes.map((r) => {
      if (r.id !== rid) return r;
      const p = r.presentes || [];
      return { ...r, presentes: p.includes(lid) ? p.filter((x) => x !== lid) : [...p, lid] };
    }) });
  };

  const ordenadas = [...state.reunioes].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <Section title="Educação continuada" sub="Reuniões semanais e presença">
      <Card style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input style={{ ...inputStyle, flex: 2, minWidth: 180 }} placeholder="Tema da reunião"
          value={f.tema} onChange={(e) => setF({ ...f, tema: e.target.value })} />
        <input style={{ ...inputStyle, flex: 1, minWidth: 140 }} placeholder="Responsável"
          value={f.responsavel} onChange={(e) => setF({ ...f, responsavel: e.target.value })} />
        <input type="date" style={{ ...inputStyle, flex: 1, minWidth: 140 }} value={f.data}
          onChange={(e) => setF({ ...f, data: e.target.value })} />
        <Btn onClick={add}><Plus size={15} /> Registrar</Btn>
      </Card>

      {ordenadas.length === 0 ? <Empty>Nenhuma reunião registrada.</Empty> :
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ordenadas.map((r) => {
            const open = aberta === r.id;
            const pres = r.presentes?.length || 0;
            const tot = state.ligantes.length;
            return (
              <Card key={r.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <DateChip data={r.data} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.tema}</div>
                    <div style={{ fontSize: 12, color: C.dim }}>
                      {r.responsavel || "Sem responsável"} · {pres}/{tot} presentes
                    </div>
                  </div>
                  <Btn tone="ghost" small onClick={() => setAberta(open ? null : r.id)}>
                    Presença <ChevronRight size={14} style={{ transform: open ? "rotate(90deg)" : "none",
                      transition: "transform .2s" }} />
                  </Btn>
                  <Trash2 className="rowdel" size={16} color={C.dim}
                    style={{ cursor: "pointer" }} onClick={() => del(r.id)} />
                </div>
                {open && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}`,
                    display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 6 }}>
                    {tot === 0 ? <span style={{ color: C.dim, fontSize: 13 }}>Cadastre ligantes primeiro.</span> :
                      state.ligantes.map((l) => {
                        const on = r.presentes?.includes(l.id);
                        return (
                          <button key={l.id} onClick={() => togglePresenca(r.id, l.id)}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                              borderRadius: 8, border: `1px solid ${on ? C.monitor : C.line}`,
                              background: on ? "rgba(61,220,132,.1)" : C.ink,
                              color: on ? C.monitor : C.dim, fontSize: 13, textAlign: "left" }}>
                            {on ? <Check size={15} /> : <X size={15} />}
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis",
                              whiteSpace: "nowrap" }}>{l.nome}</span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>}
    </Section>
  );
}

// ── Presença (ranking de frequência) ──────────────────────
function Presenca({ state, setTab }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const realizadas = state.reunioes.filter((r) => r.data <= hoje);
  const totalR = realizadas.length;

  const ranking = useMemo(() => {
    return state.ligantes.map((l) => {
      const presencas = realizadas.filter((r) => r.presentes?.includes(l.id)).length;
      const pct = totalR ? Math.round((presencas / totalR) * 100) : 0;
      // faltas consecutivas mais recentes
      const ordenadas = [...realizadas].sort((a, b) => b.data.localeCompare(a.data));
      let seq = 0;
      for (const r of ordenadas) {
        if (r.presentes?.includes(l.id)) break;
        seq++;
      }
      return { ...l, presencas, pct, faltasSeguidas: seq };
    }).sort((a, b) => b.pct - a.pct || b.presencas - a.presencas);
  }, [state, realizadas, totalR]);

  if (state.ligantes.length === 0)
    return (
      <Section title="Controle de presença" sub="Ranking de frequência nas reuniões">
        <Empty>Cadastre ligantes para acompanhar a presença.</Empty>
      </Section>
    );

  if (totalR === 0)
    return (
      <Section title="Controle de presença" sub="Ranking de frequência nas reuniões">
        <Empty>Nenhuma reunião realizada ainda. Registre reuniões e marque a presença na aba Reuniões.</Empty>
      </Section>
    );

  const medalCor = ["#F2C94C", "#C0C7D0", "#CD7F45"]; // ouro, prata, bronze

  return (
    <Section title="Controle de presença"
      sub={`Ranking com base em ${totalR} ${totalR === 1 ? "reunião realizada" : "reuniões realizadas"}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ranking.map((l, i) => {
          const alerta = l.faltasSeguidas >= 3;
          return (
            <Card key={l.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 30, textAlign: "center", fontFamily: "'Space Grotesk'",
                fontWeight: 700, fontSize: 16,
                color: i < 3 ? medalCor[i] : C.dim }}>
                {i < 3 ? <Medal size={20} color={medalCor[i]} /> : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.nome}</span>
                  {alerta && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px",
                      borderRadius: 5, background: "rgba(230,57,70,.15)", color: C.ecg }}>
                      {l.faltasSeguidas} faltas seguidas
                    </span>
                  )}
                </div>
                <div style={{ height: 6, background: C.ink, borderRadius: 3, marginTop: 6,
                  overflow: "hidden" }}>
                  <div style={{ width: `${l.pct}%`, height: "100%",
                    background: l.pct >= 75 ? C.monitor : l.pct >= 50 ? C.amber : C.ecg,
                    borderRadius: 3, transition: "width .5s ease" }} />
                </div>
              </div>
              <div style={{ textAlign: "right", minWidth: 64 }}>
                <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 18,
                  color: l.pct >= 75 ? C.monitor : l.pct >= 50 ? C.amber : C.ecg }}>{l.pct}%</div>
                <div style={{ fontSize: 11, color: C.dim }}>{l.presencas}/{totalR}</div>
              </div>
            </Card>
          );
        })}
      </div>
      <p style={{ fontSize: 12, color: C.dim, marginTop: 14, display: "flex",
        alignItems: "center", gap: 6 }}>
        <TrendingUp size={13} /> A presença é marcada dentro de cada reunião, na aba{" "}
        <button onClick={() => setTab("reunioes")} style={{ background: "none", border: "none",
          color: C.ecg, fontWeight: 600, padding: 0, cursor: "pointer" }}>Reuniões</button>.
      </p>
    </Section>
  );
}

// ── Eventos / Simpósios ───────────────────────────────────
function Eventos({ state, update }) {
  const [f, setF] = useState({ nome: "", data: "", tipo: "Simpósio", status: "Planejamento" });

  const [novoItem, setNovoItem] = useState({});

  const checklistPadrao = () => [
    { id: uid(), texto: "Reservar local", ok: false },
    { id: uid(), texto: "Confirmar palestrantes", ok: false },
    { id: uid(), texto: "Divulgação nas redes", ok: false },
    { id: uid(), texto: "Inscrições abertas", ok: false },
    { id: uid(), texto: "Certificados", ok: false },
  ];

  const add = () => {
    if (!f.nome.trim() || !f.data) return;
    update({ ...state, eventos: [...state.eventos,
      { id: uid(), ...f, nome: f.nome.trim(), checklist: checklistPadrao() }] });
    setF({ nome: "", data: "", tipo: "Simpósio", status: "Planejamento" });
  };
  const del = (id) => update({ ...state, eventos: state.eventos.filter((e) => e.id !== id) });
  const setStatus = (id, status) => update({ ...state,
    eventos: state.eventos.map((e) => e.id === id ? { ...e, status } : e) });

  const toggleItem = (eid, iid) => update({ ...state,
    eventos: state.eventos.map((e) => e.id === eid ? { ...e,
      checklist: (e.checklist || []).map((it) => it.id === iid ? { ...it, ok: !it.ok } : it) } : e) });
  const addItem = (eid) => {
    const txt = (novoItem[eid] || "").trim();
    if (!txt) return;
    update({ ...state, eventos: state.eventos.map((e) => e.id === eid ? { ...e,
      checklist: [...(e.checklist || []), { id: uid(), texto: txt, ok: false }] } : e) });
    setNovoItem({ ...novoItem, [eid]: "" });
  };
  const delItem = (eid, iid) => update({ ...state,
    eventos: state.eventos.map((e) => e.id === eid ? { ...e,
      checklist: (e.checklist || []).filter((it) => it.id !== iid) } : e) });

  const statusCor = { "Planejamento": C.amber, "Confirmado": C.monitor, "Realizado": C.dim };
  const ordenados = [...state.eventos].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <Section title="Simpósios & eventos" sub="Organização anual">
      <Card style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input style={{ ...inputStyle, flex: 2, minWidth: 180 }} placeholder="Nome do evento"
          value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
        <select style={{ ...inputStyle, flex: 1, minWidth: 120 }} value={f.tipo}
          onChange={(e) => setF({ ...f, tipo: e.target.value })}>
          <option>Simpósio</option><option>Workshop</option><option>Palestra</option><option>Jornada</option>
        </select>
        <input type="date" style={{ ...inputStyle, flex: 1, minWidth: 140 }} value={f.data}
          onChange={(e) => setF({ ...f, data: e.target.value })} />
        <Btn onClick={add}><Plus size={15} /> Criar</Btn>
      </Card>

      {ordenados.length === 0 ? <Empty>Nenhum evento planejado ainda.</Empty> :
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 12 }}>
          {ordenados.map((e) => {
            const cl = e.checklist || [];
            const feitos = cl.filter((it) => it.ok).length;
            const pct = cl.length ? Math.round((feitos / cl.length) * 100) : 0;
            return (
              <Card key={e.id}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <DateChip data={e.data} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{e.nome}</div>
                    <div style={{ fontSize: 12, color: C.dim, marginBottom: 8 }}>{e.tipo}</div>
                    <select value={e.status} onChange={(ev) => setStatus(e.id, ev.target.value)}
                      style={{ background: C.ink, border: `1px solid ${C.line}`, borderRadius: 6,
                        padding: "4px 8px", fontSize: 12, fontWeight: 600,
                        color: statusCor[e.status] }}>
                      <option>Planejamento</option><option>Confirmado</option><option>Realizado</option>
                    </select>
                  </div>
                  <Trash2 className="rowdel" size={16} color={C.dim}
                    style={{ cursor: "pointer" }} onClick={() => del(e.id)} />
                </div>

                {/* Checklist de organização */}
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <ListChecks size={14} color={C.dim} />
                    <span style={{ fontSize: 12, color: C.dim, fontWeight: 600 }}>Organização</span>
                    <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700,
                      color: pct === 100 ? C.monitor : C.dim }}>{feitos}/{cl.length}</span>
                  </div>
                  <div style={{ height: 5, background: C.ink, borderRadius: 3, overflow: "hidden",
                    marginBottom: 10 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: C.monitor,
                      borderRadius: 3, transition: "width .4s ease" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {cl.map((it) => (
                      <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => toggleItem(e.id, it.id)}
                          style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                            border: `1.5px solid ${it.ok ? C.monitor : C.line}`,
                            background: it.ok ? C.monitor : "transparent",
                            display: "grid", placeItems: "center", padding: 0 }}>
                          {it.ok && <Check size={12} color={C.ink} strokeWidth={3} />}
                        </button>
                        <span style={{ flex: 1, fontSize: 13,
                          color: it.ok ? C.dim : C.text,
                          textDecoration: it.ok ? "line-through" : "none" }}>{it.texto}</span>
                        <X className="rowdel" size={13} color={C.line}
                          style={{ cursor: "pointer", flexShrink: 0 }}
                          onClick={() => delItem(e.id, it.id)} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <input value={novoItem[e.id] || ""}
                      onChange={(ev) => setNovoItem({ ...novoItem, [e.id]: ev.target.value })}
                      onKeyDown={(ev) => ev.key === "Enter" && addItem(e.id)}
                      placeholder="Novo item…"
                      style={{ ...inputStyle, padding: "6px 10px", fontSize: 13 }} />
                    <Btn small tone="dark" onClick={() => addItem(e.id)}><Plus size={14} /></Btn>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>}
    </Section>
  );
}
