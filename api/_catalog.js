// What the site is allowed to sell. Prices live HERE, on the server, never in the browser.
// An item is sold only when enabled === true AND amount is a whole number of cents (>= 50).
// To turn one on: set amount (cents) and enabled: true, commit, deploy. See STRIPE.md.
export const CATALOG = {
  // ---- deposits: Build Systems packages -------------------------------------------------------------
  'deposit-discovery': {
    kind: 'deposit',
    name: 'Discovery Session',
    amount: null,            // e.g. 25000 for $250.00
    enabled: false,
    maxQty: 1,
    cancelPath: '/Build-Systems#start-a-project',
  },
  'deposit-event-ops': {
    kind: 'deposit',
    name: 'Event Ops Support: deposit',
    amount: null,            // quote first, then set the agreed deposit
    enabled: false,
    maxQty: 1,
    cancelPath: '/Build-Systems#start-a-project',
  },
  'deposit-residency': {
    kind: 'deposit',
    name: 'Residency / Cultural Exchange Build: deposit',
    amount: null,
    enabled: false,
    maxQty: 1,
    cancelPath: '/Build-Systems#start-a-project',
  },
  // ---- tickets: add one entry per event when it is announced -------------------------------------------
  // 'ticket-sunset-showcase-2027': { kind: 'ticket', name: 'Sunset Showcase: General Admission',
  //   amount: 3500, enabled: true, maxQty: 6, cancelPath: '/Sunset-Showcase' },
};

export const DEPOSIT_TERMS =
  'Deposits are non-refundable once work begins and are fully applied to your package. Full terms: breaksinthesimulation.com/terms';

export const isLive = (item) =>
  !!item && item.enabled === true && Number.isInteger(item.amount) && item.amount >= 50;
