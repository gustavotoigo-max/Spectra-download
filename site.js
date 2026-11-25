// SpectraCast — comportamento comum das páginas do site (sem dependências).

// Menu do celular.
document.querySelectorAll('.menu-btn').forEach((btn) => {
  const nav = document.getElementById(btn.getAttribute('aria-controls'))
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open')
    btn.setAttribute('aria-expanded', String(open))
  })
})

// Primeira visita deste navegador: de onde veio (mesmo formato da sala, em web/src/utils/visit.ts).
;(() => {
  try {
    if (localStorage.getItem('spectracast.firstVisit')) return
    const url = new URL(location.href)
    let referrer = ''
    try {
      const r = document.referrer ? new URL(document.referrer) : null
      if (r && r.hostname !== url.hostname) referrer = r.hostname.toLowerCase()
    } catch {
      /* referrer inválido */
    }
    const q = url.searchParams
    const clip = (v, max) => (v || '').trim().slice(0, max)
    localStorage.setItem(
      'spectracast.firstVisit',
      JSON.stringify({
        at: Date.now(),
        landing: clip(url.pathname, 120),
        referrer,
        source: clip(q.get('origem') || q.get('utm_source'), 60),
        medium: clip(q.get('utm_medium'), 60),
        campaign: clip(q.get('utm_campaign'), 60),
      }),
    )
  } catch {
    /* sem acesso ao armazenamento */
  }
})()

// Link de convite vencido (a sala manda para cá com ?convite=vencido).
;(() => {
  const el = document.getElementById('invite-expired')
  if (!el || new URLSearchParams(location.search).get('convite') !== 'vencido') return
  el.hidden = false
  history.replaceState(null, '', location.pathname + location.hash)
})()

// Quem já entrou na sala neste navegador vê "Suas salas" com a própria foto no botão do topo.
;(() => {
  try {
    const raw = localStorage.getItem('echoroom.discord')
    const profile = raw ? JSON.parse(raw) : null
    if (!profile || !profile.name) return
    document.querySelectorAll('[data-open-room]').forEach((a) => {
      a.textContent = 'Suas salas'
      if (profile.avatarUrl && /^https:\/\//.test(profile.avatarUrl)) {
        const img = document.createElement('img')
        img.src = profile.avatarUrl
        img.alt = ''
        img.style.borderRadius = '50%'
        a.prepend(img)
      }
    })
  } catch {
    /* sem acesso ao armazenamento: fica o texto padrão */
  }
})()

// Versão e tamanho do instalador mais recente (se a API do GitHub responder).
;(() => {
  const els = document.querySelectorAll('[data-version]')
  if (!els.length) return
  fetch('https://api.github.com/repos/gustavotoigo-max/Spectra-download/releases/latest')
    .then((r) => (r.ok ? r.json() : null))
    .then((rel) => {
      if (!rel) return
      const exe = (rel.assets || []).find((a) => a.name === 'Spectra.exe')
      const size = exe ? ` · ${Math.round(exe.size / 1e6)} MB` : ''
      const text = `Versão ${String(rel.tag_name).replace(/^v/, '')}${size} · Windows 10 e 11`
      els.forEach((el) => (el.textContent = text))
    })
    .catch(() => {})
})()

// Aviso de limite de tráfego do servidor de transmissão (perto do limite ou bloqueado).
;(() => {
  const server = document.querySelector('meta[name="spectra-server"]')?.content || ''
  const el = document.getElementById('usage-notice')
  if (!el || !/^https:\/\//.test(server)) return
  const tb = (b) => `${(b / 1e12).toFixed(2).replace('.', ',')} TB`
  const date = (iso) => String(iso).split('-').reverse().join('/')
  fetch(`${server.replace(/\/+$/, '')}/api/usage`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((u) => {
      if (!u || (u.status !== 'warning' && u.status !== 'blocked')) return
      el.textContent =
        u.status === 'blocked'
          ? `O servidor de transmissão atingiu o limite de tráfego do mês (${tb(u.limitBytes)}). As transmissões voltam em ${date(u.resetsOn)}. A música continua funcionando.`
          : `O servidor de transmissão já usou ${String(u.percent).replace('.', ',')}% do tráfego do mês. Ao chegar em ${tb(u.limitBytes)}, as transmissões param até ${date(u.resetsOn)}.`
      el.classList.toggle('blocked', u.status === 'blocked')
      el.hidden = false
    })
    .catch(() => {})
})()

// Medidor de apoio: "Custo do servidor em novembro: R$ 100 · 30% coberto" (some se não responder).
;(() => {
  const auth = document.querySelector('meta[name="spectra-auth"]')?.content || ''
  const el = document.getElementById('support-meter')
  if (!el || !/^https:\/\//.test(auth)) return
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: n % 1 ? 2 : 0 })
  fetch(`${auth.replace(/\/+$/, '')}/support`)
    .then((r) => (r.ok ? r.json() : null))
    .then((s) => {
      const m = s && s.meter
      if (!m || !(m.goal > 0)) return
      const pct = Math.round((m.raised / m.goal) * 100)
      el.querySelector('[data-month]').textContent = months[Number(String(m.month).slice(5, 7)) - 1] || 'este mês'
      el.querySelector('[data-goal]').textContent = brl(m.goal)
      el.querySelector('[data-pct]').textContent = `${pct}% coberto`
      el.querySelector('[data-raised]').textContent = `${brl(m.raised)} arrecadados este mês. Todo valor vai para os servidores.`
      const bar = el.querySelector('.support-meter-bar')
      bar.setAttribute('aria-valuenow', String(Math.min(pct, 100)))
      bar.querySelector('i').style.width = `${Math.min(pct, 100)}%`
      el.hidden = false
    })
    .catch(() => {})
})()
