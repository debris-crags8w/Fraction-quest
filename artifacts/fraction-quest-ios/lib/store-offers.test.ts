import assert from 'node:assert/strict';
import test from 'node:test';
import { connectToStore, offersFromProducts, type StoreModule } from './store-offers';

const IDS = { yearly: 'fq_year', monthly: 'fq_month' };
const product = (id: string, displayPrice: string, price: number, extra: object = {}) => ({ id, displayPrice, price, currency: 'USD', ...extra });

const fakeStore = (options: { connected?: boolean; products?: unknown[] | null; throws?: boolean; eligible?: (group: string) => Promise<boolean> } = {}) => {
  const calls: string[] = [];
  const api = {
    ...(options.eligible ? { isEligibleForIntroOfferIOS: options.eligible } : {}),
    initConnection: async () => { calls.push('init'); return options.connected ?? true; },
    fetchProducts: async (request: { skus: string[]; type: string }) => {
      calls.push(`fetch ${request.skus.join(',')} ${request.type}`);
      if (options.throws) throw new Error('store down');
      return options.products === undefined ? [] : options.products;
    },
    endConnection: async () => true,
  } as unknown as StoreModule;
  return { api, calls };
};

test('a store that connects but finds no products cannot sell, so the page leaves lessons open', async () => {
  assert.equal(await connectToStore(fakeStore({ products: [] }).api, IDS), null);
  assert.equal(await connectToStore(fakeStore({ products: null }).api, IDS), null);
  assert.equal(await connectToStore(fakeStore({ products: [product('some_other_id', '$1.99', 1.99)] }).api, IDS), null);
});

test('no connection means no offers, and the product query is never made', async () => {
  const { api, calls } = fakeStore({ connected: false });
  assert.equal(await connectToStore(api, IDS), null);
  assert.deepEqual(calls, ['init']);
  const gone = fakeStore();
  assert.equal(await connectToStore(gone.api, IDS, () => false), null);
  assert.deepEqual(gone.calls, ['init']);
});

test('a thrown store error still reaches the caller, which treats it as unknown too', async () => {
  await assert.rejects(connectToStore(fakeStore({ throws: true }).api, IDS), /store down/);
});

test('found plans are reported yearly first, with the amounts and Android offer tokens, and one plan alone is enough', async () => {
  const both = await connectToStore(fakeStore({ products: [
    product('fq_month', '$4.99', 4.99, { subscriptionOffers: [{ offerTokenAndroid: 'tok-m' }] }),
    product('fq_year', '$39.99', 39.99),
  ] }).api, IDS);
  assert.deepEqual(both?.offers, [
    { plan: 'yearly', price: '$39.99', amount: 39.99, currency: 'USD' },
    { plan: 'monthly', price: '$4.99', amount: 4.99, currency: 'USD' },
  ]);
  assert.deepEqual(both?.tokens, { monthly: 'tok-m' });
  const one = await connectToStore(fakeStore({ products: [product('fq_year', '$39.99', 39.99)] }).api, IDS);
  assert.deepEqual(one?.offers.map((offer) => offer.plan), ['yearly']);
  assert.deepEqual(offersFromProducts([{ id: 'fq_month', displayPrice: '$4.99', price: 'free' }], IDS).offers[0], { plan: 'monthly', price: '$4.99', amount: null, currency: null });
});

const phases = (...micros: string[]) => ({ pricingPhasesAndroid: { pricingPhaseList: micros.map((priceAmountMicros) => ({ priceAmountMicros })) } });

test('on Android the plan is bought with its free-trial offer when Google Play offers one, and the page is told', async () => {
  const found = await connectToStore(fakeStore({ products: [
    product('fq_month', '$4.99', 4.99, { platform: 'android', subscriptionOffers: [{ offerTokenAndroid: 'base', ...phases('4990000') }, { offerTokenAndroid: 'trial', ...phases('0', '4990000') }] }),
  ] }).api, IDS);
  assert.deepEqual(found?.tokens, { monthly: 'trial' });
  assert.equal(found?.trial, true);
});

test('on Android an account Google Play offers no trial (it had one before) is told so', async () => {
  const found = await connectToStore(fakeStore({ products: [
    product('fq_month', '$4.99', 4.99, { platform: 'android', subscriptionOffers: [{ offerTokenAndroid: 'base', ...phases('4990000') }] }),
    product('fq_year', '$39.99', 39.99, { platform: 'android', subscriptionOffers: [{ offerTokenAndroid: 'year-trial', ...phases('0', '39990000') }] }),
  ] }).api, IDS);
  assert.deepEqual(found?.tokens, { monthly: 'base', yearly: 'year-trial' });
  assert.equal(found?.trial, false, 'one plan without the trial: the page promises none');
});

test('on iPhone the store is asked whether this account can still get the trial', async () => {
  const ios = [product('fq_month', '$4.99', 4.99, { platform: 'ios', subscriptionGroupIdIOS: 'group-1' })];
  const asked: string[] = [];
  const no = await connectToStore(fakeStore({ products: ios, eligible: async (group) => { asked.push(group); return false; } }).api, IDS);
  assert.equal(no?.trial, false);
  assert.deepEqual(asked, ['group-1']);
  assert.equal((await connectToStore(fakeStore({ products: ios, eligible: async () => true }).api, IDS))?.trial, true);
  assert.equal((await connectToStore(fakeStore({ products: ios, eligible: async () => { throw new Error('no'); } }).api, IDS))?.trial, null, 'the store did not say');
  assert.equal((await connectToStore(fakeStore({ products: ios }).api, IDS))?.trial, null);
});

test('a store that says nothing about offers leaves the trial unknown', async () => {
  const found = await connectToStore(fakeStore({ products: [product('fq_month', '$4.99', 4.99, { subscriptionOffers: [{ offerTokenAndroid: 'tok-m' }] })] }).api, IDS);
  assert.equal(found?.trial, null);
});
