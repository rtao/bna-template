'use strict';
const namespace = 'org.acme.bnatemplate';

/**
 * Track the trade of a commodity from one trader to another
 * @param {org.acme.bnatemplate.Trade} trade - the trade to be processed
 * @transaction
 */
async function tradeCommodity(trade) {
  trade.commodity.owner = trade.newOwner;
  const registry = await getAssetRegistry(`${namespace}.Commodity`);
  await registry.update(trade.commodity);
}
