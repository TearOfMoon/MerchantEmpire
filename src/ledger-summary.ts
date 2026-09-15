import { ledger, money } from './data';

type Period = 'all' | 'today' | '7d' | '30d';
let selectedPeriod: Period = 'all';

function parseDate(value: string) {
  const m = value.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]) : new Date(0);
}

function rowsFor(period: Period) {
  if (period === 'all') return ledger;
  const latest = Math.max(...ledger.map(row => parseDate(row.date).getTime()));
  const latestDay = new Date(latest); latestDay.setHours(0,0,0,0);
  if (period === 'today') return ledger.filter(row => { const d=parseDate(row.date); d.setHours(0,0,0,0); return d.getTime()===latestDay.getTime(); });
  const days = period === '7d' ? 7 : 30;
  const from = new Date(latestDay); from.setDate(from.getDate() - (days - 1));
  return ledger.filter(row => parseDate(row.date).getTime() >= from.getTime());
}

function silver(value: number, negative = false) {
  return `<span class="silver"><span class="coin">◈</span>${negative ? '−' : ''}${money.format(Math.abs(value))}</span>`;
}

function renderValues(summary: HTMLElement) {
  const rows = rowsFor(selectedPeriod);
  const income = rows.reduce((sum, row) => sum + (row.income ?? 0), 0);
  const expenses = rows.reduce((sum, row) => sum + Math.abs(row.expense ?? 0), 0);
  const balance = ledger[0]?.balance ?? 0;
  const result = income - expenses;
  const margin = income > 0 ? result / income * 100 : 0;
  const value = (key:string) => summary.querySelector(`[data-value="${key}"]`) as HTMLElement;
  value('income').innerHTML = silver(income);
  value('expense').innerHTML = silver(expenses, true);
  value('balance').innerHTML = silver(balance);
  const resultEl=value('result'); resultEl.className=result>=0?'in':'out'; resultEl.innerHTML=`${result>=0?'PROFITTO':'PERDITA'} ${silver(result, result<0)}<small class="ledgerMargin">Margine ${margin>=0?'+':''}${margin.toLocaleString('it-IT',{maximumFractionDigits:1})}% · Entrate − Uscite</small>`;
  summary.querySelectorAll<HTMLButtonElement>('.ledgerPeriod button').forEach(b=>b.classList.toggle('selected',b.dataset.period===selectedPeriod));
}

function addLedgerSummary() {
  const title = [...document.querySelectorAll('.title h1')].find(el => el.textContent?.trim() === 'Libro Mastro');
  const existing = document.querySelector('.ledgerAnalysis');
  if (!title) { existing?.remove(); return; }
  const header = title.closest('.title');
  if (!header) return;
  if (existing) {
    if (existing.previousElementSibling !== header) header.insertAdjacentElement('afterend', existing);
    return;
  }
  const wrap=document.createElement('section'); wrap.className='ledgerAnalysis';
  wrap.innerHTML=`<div class="ledgerPeriod" aria-label="Periodo analizzato"><span>Periodo analizzato</span><button data-period="all">Tutto</button><button data-period="today">Oggi</button><button data-period="7d">7 giorni</button><button data-period="30d">30 giorni</button></div><div class="kpis ledgerSummary"><div class="kpi ledgerIncome"><small>Entrate Totali</small><strong class="in" data-value="income"></strong></div><div class="kpi ledgerExpense"><small>Uscite Totali</small><strong class="out" data-value="expense"></strong></div><div class="kpi ledgerBalance"><small>Saldo Attuale</small><strong data-value="balance"></strong><em>Liquidità disponibile</em></div><div class="kpi ledgerResult"><small>Bilancio</small><strong data-value="result"></strong></div></div>`;
  header.insertAdjacentElement('afterend',wrap);
  wrap.querySelectorAll<HTMLButtonElement>('.ledgerPeriod button').forEach(button=>button.addEventListener('click',()=>{selectedPeriod=button.dataset.period as Period;renderValues(wrap)}));
  renderValues(wrap);
}

let scheduled = false;
new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; addLedgerSummary(); });
}).observe(document.getElementById('root')!, { childList: true, subtree: true });
addLedgerSummary();
