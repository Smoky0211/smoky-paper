(function(){
const tg = window.Telegram && Telegram.WebApp;
if (tg){ try{ tg.ready(); tg.expand(); tg.setHeaderColor && tg.setHeaderColor('#000000'); tg.setBackgroundColor && tg.setBackgroundColor('#000000'); }catch(e){} }
const RANGES = {LIVE:2*3600, '1H':3600, '4H':4*3600, '1D':86400, '1W':7*86400, ALL:null};
let D = null, cur = 'LIVE';
const $ = id => document.getElementById(id);
const usd = v => (v<0?'-':'') + '$' + Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const sgn = v => (v>0?'+':v<0?'-':'+') + '$' + Math.abs(v).toFixed(2);
const pct = v => v==null ? '' : (v>=0?'+':'') + v.toFixed(2) + '%';
const cls = v => v>0 ? 'g' : v<0 ? 'r' : 'mut';
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ago = ts => { const s = Date.now()/1000 - ts; return s<90 ? 'just now' : s<5400 ? Math.round(s/60)+'m ago' : s<129600 ? Math.round(s/3600)+'h ago' : Math.round(s/86400)+'d ago'; };

function header(){
  $('bal').textContent = usd(D.equity);
  $('today').innerHTML = `<span class="${D.today_pnl<0?'r':'g'}">${pct(D.today_pct)} today</span> <span class="mut">(${sgn(D.today_pnl)})</span>`;
  $('sub').innerHTML = `Cash <b>${usd(D.cash)}</b> · in coins <b>${usd(D.positions_value)}</b><br>` +
    `<span class="mut">start ${usd(D.start)} · total</span> <span class="${cls(D.pnl)}">${sgn(D.pnl)} · ${pct(D.pnl_pct)}</span>`;
  $('ph').textContent = `Paper positions · ${D.open} open · ${D.closed} closed`;
  $('foot').textContent = `Fake money only · updated ${ago(D.generated_at)}`;
}

function chart(){
  const svg = $('chart'), W = 400, H = 260, P = 8;
  const span = RANGES[cur], t1 = D.series.length ? D.series[D.series.length-1][0] : 0;
  const pts = D.series.filter(p => span==null || p[0] >= t1 - span);
  if (pts.length < 2){ svg.innerHTML = `<text class="empty" x="200" y="130" text-anchor="middle">Not enough data for ${cur} yet</text>`; return; }
  const t0 = pts[0][0], te = pts[pts.length-1][0];
  let lo = Math.min(...pts.map(p=>p[1]), D.start), hi = Math.max(...pts.map(p=>p[1]), D.start);
  if (hi-lo < 1){ hi += .5; lo -= .5; }
  const x = t => P + (W-2*P) * (te===t0 ? 1 : (t-t0)/(te-t0));
  const y = v => P + (H-2*P) * (1 - (v-lo)/(hi-lo));
  const up = pts[pts.length-1][1] >= pts[0][1];
  const col = up ? '#22c55e' : '#ef4444';
  let d = '';
  pts.forEach((p,i) => { d += (i===0 || p[2] ? 'M' : 'L') + x(p[0]).toFixed(1) + ' ' + y(p[1]).toFixed(1) + ' '; });
  const last = pts[pts.length-1];
  const area = `M${x(t0)} ${H} ` + pts.map(p => `L${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`).join(' ') + ` L${x(te)} ${H} Z`;
  svg.innerHTML = `<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".25"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
    <line x1="0" x2="${W}" y1="${y(D.start)}" y2="${y(D.start)}" stroke="#3a3a3c" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>
    <path d="${area}" fill="url(#fade)"/>
    <path d="${d}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    <circle cx="${x(last[0])}" cy="${y(last[1])}" r="4" fill="${col}"/>`;
}

function ranges(){
  $('ranges').innerHTML = Object.keys(RANGES).map(k => `<button class="${k===cur?'on':''}" data-k="${k}">${k}</button>`).join('');
  $('ranges').querySelectorAll('button').forEach(b => b.onclick = () => { cur = b.dataset.k; ranges(); chart(); });
}

function list(){
  const open = D.positions.filter(p => p.status==='open'), closed = D.positions.filter(p => p.status!=='open');
  const row = p => {
    const meta = p.status==='open' ? `size ${usd(p.size)} · now ${usd(p.value)} · ${ago(p.entry_ts)}` : `size ${usd(p.size)} · ${esc(p.reason||'closed')} · ${ago(p.close_ts)}`;
    const tag = p.status==='open' ? '<span class="tag">OPEN</span>' : '';
    const inner = `<div><div class="s">${esc(p.symbol)}${tag}</div><div class="m">${meta}</div></div>
      <div class="p ${cls(p.pnl)}"><div>${sgn(p.pnl)}</div><div>${pct(p.pnl_pct)}</div></div>`;
    const ok = p.link && p.link.indexOf('r=savipww') !== -1 && p.link.indexOf('https://fomo.family/') === 0;
    return ok ? `<a class="row" href="${esc(p.link)}" data-link="${esc(p.link)}">${inner}</a>` : `<div class="row">${inner}</div>`;
  };
  $('list').innerHTML = open.map(row).join('') + closed.slice(0, 30).map(row).join('');
  if (tg) $('list').querySelectorAll('a[data-link]').forEach(a => a.onclick = e => { e.preventDefault(); tg.openLink(a.dataset.link); });
}

function load(){
  fetch('data.json?t=' + Date.now(), {cache:'no-store'}).then(r => r.json()).then(j => { D = j; header(); chart(); ranges(); list(); })
    .catch(() => { $('sub').textContent = 'Could not load data'; });
}
load(); setInterval(load, 60000);
})();
