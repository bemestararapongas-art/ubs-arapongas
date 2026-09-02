'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

const ages = ['Criança — até 12 anos','Adolescente — 13 a 17 anos','Adulto — 18 a 59 anos','Pessoa idosa — 60 anos ou mais']
const services = ['Consulta agendada','Consulta de pré-natal','Atendimento por livre demanda','Atendimento de enfermagem','Renovação de receita','Vacinação']
const professionals = ['Médico(a)','Estudante','Enfermeiro(a)','Técnico(a) de enfermagem','Dentista','Nutricionista','Recepção','Outro']
const ratings = ['Ótimo','Bom','Regular','Ruim']
const resolution = ['Sim','Parcialmente','Não']
const waits = ['Muito bom','Bom','Regular','Ruim']

type FormData = {
  atendimento_hoje: boolean | null
  data_atendimento: string
  faixa_etaria: string
  tipo_atendimento: string
  profissionais: string[]
  profissional_outro: string
  avaliacao_atendimento: string
  motivo_avaliacao: string
  resolutividade: string
  motivo_nao_resolucao: string
  avaliacao_espera: string
  motivo_espera: string
  tipo_comentario: string
  comentario: string
}

const initial: FormData = { atendimento_hoje:null,data_atendimento:'',faixa_etaria:'',tipo_atendimento:'',profissionais:[],profissional_outro:'',avaliacao_atendimento:'',motivo_avaliacao:'',resolutividade:'',motivo_nao_resolucao:'',avaliacao_espera:'',motivo_espera:'',tipo_comentario:'',comentario:'' }

function todayLocal(){ const d=new Date(); const off=d.getTimezoneOffset(); return new Date(d.getTime()-off*60000).toISOString().slice(0,10) }
function pct(n:number,d:number){return d?Math.round((n/d)*100):0}

export default function Home(){
  const [mode,setMode]=useState<'home'|'survey'|'login'|'dashboard'>('home')
  const [manual,setManual]=useState(false)
  const [form,setForm]=useState<FormData>(initial)
  const [step,setStep]=useState(0)
  const [sent,setSent]=useState(false)
  const [error,setError]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [rows,setRows]=useState<any[]>([])
  const [loading,setLoading]=useState(false)
  const [filters,setFilters]=useState({age:'',service:'',professional:'',rating:'',from:'',to:''})

  useEffect(()=>{ supabase.auth.getSession().then(({data})=>{ if(data.session && mode==='login') setMode('dashboard') }) },[mode])

  const startSurvey=(isManual=false)=>{setManual(isManual);setForm(initial);setStep(0);setSent(false);setError('');setMode('survey')}
  const setField=(key:keyof FormData,value:any)=>setForm(f=>({...f,[key]:value}))
  const toggleProfessional=(p:string)=>setForm(f=>({...f,professionals:f.profissionais.includes(p)?f.profissionais.filter(x=>x!==p):[...f.profissionais,p]}))

  const canNext=()=>{
    if(step===0) return form.atendimento_hoje!==null && (form.atendimento_hoje || !!form.data_atendimento)
    if(step===1) return !!form.faixa_etaria && !!form.tipo_atendimento
    if(step===2) return form.profissionais.length>0 && (!form.profissionais.includes('Outro') || !!form.profissional_outro.trim())
    if(step===3) return !!form.avaliacao_atendimento
    if(step===4) return !!form.resolutividade
    if(step===5) return !!form.avaliacao_espera
    return !!form.tipo_comentario && !!form.comentario.trim()
  }

  async function submit(e?:FormEvent){
    e?.preventDefault();setLoading(true);setError('')
    const payload={...form,data_atendimento:form.atendimento_hoje?null:form.data_atendimento}
    const {error}=await supabase.from('respostas').insert(payload)
    setLoading(false)
    if(error){setError('Não foi possível salvar a resposta. Verifique a conexão e tente novamente.');return}
    setSent(true)
  }

  async function login(e:FormEvent){
    e.preventDefault();setLoading(true);setError('')
    const {error}=await supabase.auth.signInWithPassword({email,password})
    setLoading(false)
    if(error){setError('E-mail ou senha incorretos.');return}
    setMode('dashboard');await loadRows()
  }
  async function logout(){await supabase.auth.signOut();setRows([]);setMode('home')}

  async function loadRows(){
    setLoading(true);setError('')
    const {data,error}=await supabase.from('respostas').select('*').order('data_atendimento',{ascending:false}).order('criado_em',{ascending:false}).limit(5000)
    setLoading(false)
    if(error){setError('Não foi possível carregar os dados.');return}
    setRows(data||[])
  }

  const filtered=useMemo(()=>rows.filter(r=>{
    if(filters.age && r.faixa_etaria!==filters.age)return false
    if(filters.service && r.tipo_atendimento!==filters.service)return false
    if(filters.rating && r.avaliacao_atendimento!==filters.rating)return false
    if(filters.professional && !(r.profissionais||[]).includes(filters.professional))return false
    const date=r.data_atendimento || (r.criado_em?.slice(0,10))
    if(filters.from && date<filters.from)return false
    if(filters.to && date>filters.to)return false
    return true
  }),[rows,filters])

  const metrics=useMemo(()=>{
    const total=filtered.length
    const good=filtered.filter(r=>['Ótimo','Bom'].includes(r.avaliacao_atendimento)).length
    const resolved=filtered.filter(r=>r.resolutividade==='Sim').length
    const wait=filtered.filter(r=>['Muito bom','Bom'].includes(r.avaliacao_espera)).length
    return {total,good,resolved,wait}
  },[filtered])

  const distribution=(field:string, values:string[])=>values.map(v=>({label:v,count:filtered.filter(r=>r[field]===v).length}))
  const comments=filtered.filter(r=>r.comentario).slice(0,100)

  function exportCsv(){
    const cols=['id','data_preenchimento','atendimento_hoje','data_atendimento','faixa_etaria','tipo_atendimento','profissionais','profissional_outro','avaliacao_atendimento','motivo_avaliacao','resolutividade','motivo_nao_resolucao','avaliacao_espera','motivo_espera','tipo_comentario','comentario']
    const esc=(v:any)=>`"${String(Array.isArray(v)?v.join(' + '):v??'').replaceAll('"','""')}"`
    const csv='\ufeff'+[cols.join(';'),...filtered.map(r=>cols.map(c=>esc(r[c])).join(';'))].join('\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`ubs-arapongas-respostas-${todayLocal()}.csv`;a.click();URL.revokeObjectURL(url)
  }

  if(mode==='home') return <main className="page"><div className="shell"><Header/><section className="hero"><div className="card"><p className="eyebrow">Pesquisa de experiência</p><h1>UBS Arapongas</h1><p className="subtitle">Araranguá — Santa Catarina</p><p className="subtitle" style={{marginTop:14}}>Sua experiência ajuda a equipe a identificar pontos fortes e oportunidades de melhoria no atendimento da unidade.</p><div className="actions" style={{marginTop:24}}><button className="btn btn-primary" onClick={()=>startSurvey(false)}>Responder pesquisa</button><button className="btn btn-secondary" onClick={()=>setMode('login')}>Acesso administrativo</button></div></div><div className="hero-badge"><span className="eyebrow">Pesquisa anônima</span><strong>Sem nome, CPF ou telefone</strong><p className="subtitle">As respostas são utilizadas para análise da experiência dos usuários.</p></div></section></div></main>

  if(mode==='login') return <main className="page"><div className="shell"><Header/><form className="card login" onSubmit={login}><p className="eyebrow">Área restrita</p><h1>Acesso administrativo</h1><p className="subtitle">Somente usuários autorizados podem visualizar os resultados.</p><div className="field"><label>E-mail</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div><div className="field"><label>Senha</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></div>{error&&<p className="error" style={{marginTop:14}}>{error}</p>}<div className="actions" style={{marginTop:20}}><button className="btn btn-primary" disabled={loading}>{loading?'Entrando...':'Entrar'}</button><button type="button" className="btn btn-secondary" onClick={()=>setMode('home')}>Voltar</button></div></form></div></main>

  if(mode==='survey'){
    if(sent) return <main className="page"><div className="shell"><Header/><div className="card success"><div className="success-icon">✓</div><h1>Obrigado pela sua participação!</h1><p className="subtitle">Sua avaliação foi registrada com sucesso para a <strong>UBS Arapongas — Araranguá/SC</strong>.</p>{manual&&<span className="pill" style={{marginTop:16}}>Lançamento manual</span>}<div style={{marginTop:24}}><button className="btn btn-secondary" onClick={()=>setMode('home')}>Voltar ao início</button></div></div></div></main>
    return <main className="page"><div className="shell"><Header/><form className="card form" onSubmit={submit}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><div><p className="eyebrow">{manual?'Lançamento manual':'Pesquisa anônima'}</p><h1>Avaliação do atendimento</h1></div><span className="pill">{step+1} de 7</span></div><div className="progress"><span style={{width:`${((step+1)/7)*100}%`}}/></div>
      {step===0&&<Step title="O atendimento ocorreu hoje?"><div className="option-grid"><Radio label="Sim" checked={form.atendimento_hoje===true} onClick={()=>setField('atendimento_hoje',true)}/><Radio label="Não" checked={form.atendimento_hoje===false} onClick={()=>setField('atendimento_hoje',false)}/></div>{form.atendimento_hoje===false&&<div className="conditional"><div className="field" style={{marginTop:0}}><label>Em qual data ocorreu o atendimento?</label><input className="input" type="date" value={form.data_atendimento} max={todayLocal()} onChange={e=>setField('data_atendimento',e.target.value)} required/></div></div>}</Step>}
      {step===1&&<Step title="Qual a faixa etária do paciente atendido?"><div className="option-grid">{ages.map(x=><Radio key={x} label={x} checked={form.faixa_etaria===x} onClick={()=>setField('faixa_etaria',x)}/>)}</div><div className="field"><label>Qual foi o tipo de atendimento realizado?</label><select className="select" value={form.tipo_atendimento} onChange={e=>setField('tipo_atendimento',e.target.value)}><option value="">Selecione</option>{services.map(x=><option key={x}>{x}</option>)}</select></div></Step>}
      {step===2&&<Step title="Quem realizou seu atendimento?"><p className="help">Você pode selecionar mais de uma opção.</p><div className="option-grid">{professionals.map(x=><Check key={x} label={x} checked={form.profissionais.includes(x)} onClick={()=>toggleProfessional(x)}/>)}</div>{form.profissionais.includes('Outro')&&<div className="conditional"><div className="field" style={{marginTop:0}}><label>Especifique *</label><input className="input" value={form.profissional_outro} onChange={e=>setField('profissional_outro',e.target.value)} required/></div></div>}</Step>}
      {step===3&&<Step title="Como você avalia o atendimento recebido?"><div className="option-grid">{ratings.map(x=><Radio key={x} label={x} checked={form.avaliacao_atendimento===x} onClick={()=>setField('avaliacao_atendimento',x)}/>)}</div>{['Regular','Ruim'].includes(form.avaliacao_atendimento)&&<ConditionalText label="Se desejar, conte-nos o motivo" value={form.motivo_avaliacao} onChange={v=>setField('motivo_avaliacao',v)}/>}</Step>}
      {step===4&&<Step title="Você conseguiu resolver o que precisava hoje?"><div className="option-grid">{resolution.map(x=><Radio key={x} label={x} checked={form.resolutividade===x} onClick={()=>setField('resolutividade',x)}/>)}</div>{form.resolutividade==='Não'&&<ConditionalText label="Se desejar, explique o motivo" value={form.motivo_nao_resolucao} onChange={v=>setField('motivo_nao_resolucao',v)}/>}</Step>}
      {step===5&&<Step title="Como você avalia o tempo de espera?"><div className="option-grid">{waits.map(x=><Radio key={x} label={x} checked={form.avaliacao_espera===x} onClick={()=>setField('avaliacao_espera',x)}/>)}</div>{['Regular','Ruim'].includes(form.avaliacao_espera)&&<ConditionalText label="Se desejar, explique" value={form.motivo_espera} onChange={v=>setField('motivo_espera',v)}/>}</Step>}
      {step===6&&<Step title="Você gostaria de deixar um comentário sobre a UBS?"><div className="option-grid">{['Elogio','Sugestão','Reclamação'].map(x=><Radio key={x} label={x} checked={form.tipo_comentario===x} onClick={()=>setField('tipo_comentario',x)}/>)}</div>{form.tipo_comentario&&<div className="conditional"><div className="field" style={{marginTop:0}}><label>Escreva seu comentário *</label><textarea className="textarea" value={form.comentario} onChange={e=>setField('comentario',e.target.value)} required/></div></div>}</Step>}
      {error&&<p className="error" style={{marginTop:18}}>{error}</p>}<div className="footer-actions">{step>0?<button type="button" className="btn btn-secondary" onClick={()=>setStep(s=>s-1)}>Voltar</button>:<button type="button" className="btn btn-secondary" onClick={()=>setMode('home')}>Cancelar</button>}{step<6?<button type="button" className="btn btn-primary" disabled={!canNext()} onClick={()=>setStep(s=>s+1)}>Próxima</button>:<button className="btn btn-primary" disabled={!canNext()||loading}>{loading?'Enviando...':'Enviar avaliação'}</button>}</div></form></div></main>
  }

  return <main className="page"><div className="shell"><div className="topbar"><Header/><div className="admin-nav"><button className="btn btn-secondary" onClick={()=>startSurvey(true)}>+ Lançar avaliação manual</button><button className="btn btn-secondary" onClick={loadRows}>Atualizar</button><button className="btn btn-danger" onClick={logout}>Sair</button></div></div><div className="dashboard"><div className="card"><p className="eyebrow">Área restrita</p><h1>Dashboard — UBS Arapongas</h1><p className="subtitle">Experiência dos usuários • Araranguá/SC</p></div><div className="card filters"><Select label="Faixa etária" value={filters.age} onChange={v=>setFilters(f=>({...f,age:v}))} options={ages}/><Select label="Tipo de atendimento" value={filters.service} onChange={v=>setFilters(f=>({...f,service:v}))} options={services}/><Select label="Quem realizou" value={filters.professional} onChange={v=>setFilters(f=>({...f,professional:v}))} options={professionals}/><Select label="Avaliação" value={filters.rating} onChange={v=>setFilters(f=>({...f,rating:v}))} options={ratings}/><div className="field"><label>De</label><input className="input" type="date" value={filters.from} onChange={e=>setFilters(f=>({...f,from:e.target.value}))}/></div><div className="field"><label>Até</label><input className="input" type="date" value={filters.to} onChange={e=>setFilters(f=>({...f,to:e.target.value}))}/></div><div className="actions" style={{alignSelf:'end'}}><button className="btn btn-secondary" onClick={()=>setFilters({age:'',service:'',professional:'',rating:'',from:'',to:''})}>Limpar filtros</button><button className="btn btn-primary" onClick={exportCsv}>Exportar CSV</button></div></div>
      <div className="stats"><Stat label="Respostas" value={metrics.total}/><Stat label="Ótimo/Bom" value={`${pct(metrics.good,metrics.total)}%`}/><Stat label="Necessidade resolvida" value={`${pct(metrics.resolved,metrics.total)}%`}/><Stat label="Espera muito boa/boa" value={`${pct(metrics.wait,metrics.total)}%`}/></div>
      <div className="chart-grid"><Chart title="Avaliação do atendimento" data={distribution('avaliacao_atendimento',ratings)}/><Chart title="Resolutividade" data={distribution('resolutividade',resolution)}/><Chart title="Tempo de espera" data={distribution('avaliacao_espera',waits)}/><Chart title="Tipo de comentário" data={distribution('tipo_comentario',['Elogio','Sugestão','Reclamação'])}/></div>
      <div className="card"><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',marginBottom:12}}><div><h2>Comentários dos usuários</h2><p className="subtitle">Exibindo até 100 comentários do recorte selecionado.</p></div><span className="pill">{comments.length}</span></div>{comments.length===0?<div className="empty">Nenhum comentário no recorte atual.</div>:<div className="table-wrap"><table className="table"><thead><tr><th>Data</th><th>Categoria</th><th>Atendimento</th><th>Comentário</th></tr></thead><tbody>{comments.map(r=><tr key={r.id}><td>{r.data_atendimento?new Date(r.data_atendimento+'T00:00:00').toLocaleDateString('pt-BR'):new Date(r.criado_em).toLocaleDateString('pt-BR')}</td><td><span className="pill">{r.tipo_comentario}</span></td><td>{r.tipo_atendimento}</td><td className="comment">{r.comentario}</td></tr>)}</tbody></table></div>}</div>
      <div className="card"><h2>Respostas</h2><p className="subtitle" style={{marginBottom:12}}>Tabela completa do recorte selecionado.</p>{loading?<div className="empty">Carregando...</div>:<div className="table-wrap"><table className="table"><thead><tr><th>Data</th><th>Faixa etária</th><th>Atendimento</th><th>Profissionais</th><th>Avaliação</th><th>Resolutividade</th><th>Espera</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td>{r.data_atendimento?new Date(r.data_atendimento+'T00:00:00').toLocaleDateString('pt-BR'):new Date(r.criado_em).toLocaleDateString('pt-BR')}</td><td>{r.faixa_etaria}</td><td>{r.tipo_atendimento}</td><td>{(r.profissionais||[]).join(', ')}{r.profissional_outro?` (${r.profissional_outro})`:''}</td><td>{r.avaliacao_atendimento}</td><td>{r.resolutividade}</td><td>{r.avaliacao_espera}</td></tr>)}</tbody></table></div>}</div>
    </div></div></main>
}

function Header(){return <div className="topbar" style={{marginBottom:0}}><div className="brand"><div className="brand-mark">UA</div><div><div style={{fontWeight:850}}>UBS Arapongas</div><div className="muted small">Araranguá — SC</div></div></div></div>}
function Step({title,children}:{title:string,children:React.ReactNode}){return <section className="step active"><h2 className="question">{title}</h2><div style={{marginTop:18}}>{children}</div></section>}
function Radio({label,checked,onClick}:{label:string;checked:boolean;onClick:()=>void}){return <label className="option"><input type="radio" checked={checked} onChange={onClick}/><span>{label}</span></label>}
function Check({label,checked,onClick}:{label:string;checked:boolean;onClick:()=>void}){return <label className="option"><input type="checkbox" checked={checked} onChange={onClick}/><span>{label}</span></label>}
function ConditionalText({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <div className="conditional"><div className="field" style={{marginTop:0}}><label>{label}</label><textarea className="textarea" value={value} onChange={e=>onChange(e.target.value)}/></div></div>}
function Select({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:string[]}){return <div className="field" style={{marginTop:0}}><label>{label}</label><select className="select" value={value} onChange={e=>onChange(e.target.value)}><option value="">Todos</option>{options.map(x=><option key={x}>{x}</option>)}</select></div>}
function Stat({label,value}:{label:string;value:any}){return <div className="stat"><span className="label">{label}</span><strong>{value}</strong></div>}
function Chart({title,data}:{title:string;data:{label:string;count:number}[]}){const max=Math.max(1,...data.map(x=>x.count));return <div className="card"><h2>{title}</h2>{data.map(x=><div className="bar-row" key={x.label}><span>{x.label}</span><div className="bar-track"><div className="bar-fill" style={{width:`${(x.count/max)*100}%`}}/></div><strong>{x.count}</strong></div>)}</div>}
