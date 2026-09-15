import { ledger, money } from './data';

const income = ledger.reduce((sum, row) => sum + (row.income ?? 0), 0);
const expenses = ledger.reduce((sum, row) => sum + Math.abs(row.expense ?? 0), 0);
const balance = ledger[0]?.balance ?? 0;
const result = income - expenses;

function silver(value: number) {
  return `<span class="silver"><span class="coin">◈</span>${money.format(Math.abs(value))}</span>`;
}

function addLedgerSummary() {
  const title = [...document.querySelectorAll('.title h1')].find(el => el.textContent?.trim() === 'Libro Mastro');
  if (!title) return;
  const header = title.closest('.title');
  if (!header || header.nextElementSibling?.classList.contains('ledgerSummary')) return;

  const summary = document.createElement('div');
  summary.className = 'kpis ledgerSummary';
  summary.innerHTML = `
    <div class="kpi ledgerIncome"><small>Entrate Totali</small><strong>${silver(income)}</strong></div>
    <div class="kpi ledgerExpense"><small>Uscite Totali</small><strong>${silver(expenses)}</strong></div>
    <div class="kpi ledgerBalance"><small>Saldo Attuale</small><strong>${silver(balance)}</strong></div>
    <div class="kpi ledgerResult"><small>Bilancio</small><strong class="${result >= 0 ? 'in' : 'out'}">${result >= 0 ? 'PROFITTO +' : 'PERDITA −'} ${silver(result)}</strong></div>`;
  header.insertAdjacentElement('afterend', summary);
}

new MutationObserver(addLedgerSummary).observe(document.getElementById('root')!, { childList: true, subtree: true });
addLedgerSummary();
