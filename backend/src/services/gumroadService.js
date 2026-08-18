const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

function client() {
  return axios.create({
    baseURL: 'https://api.gumroad.com/v2',
    timeout: 15000,
  });
}

async function getProducts() {
  if (!config.isConfigured('gumroad')) {
    return [
      { name: 'Backend Architecture Blueprint', downloads: 342, price: 0, sample: true },
      { name: 'Automation Cost Calculator', downloads: 128, price: 0, sample: true },
    ];
  }
  try {
    const { data } = await client().get('/products', { params: { access_token: config.gumroadAccessToken } });
    return (data.products || []).map((p) => ({ name: p.name, downloads: p.sales_count, price: p.price }));
  } catch (e) {
    logger.error('gumroadService.getProducts failed', { error: e.message });
    throw Object.assign(new Error(`Gumroad products fetch failed: ${e.message}`), { status: 502 });
  }
}

async function getSales() {
  if (!config.isConfigured('gumroad')) {
    return [{ email: 'lead1@startup.example', product: 'Backend Architecture Blueprint', price: 0, created_at: new Date().toISOString(), sample: true }];
  }
  try {
    const { data } = await client().get('/sales', { params: { access_token: config.gumroadAccessToken } });
    return (data.sales || []).map((s) => ({ email: s.email, product: s.product_name, price: s.price, created_at: s.created_at }));
  } catch (e) {
    logger.error('gumroadService.getSales failed', { error: e.message });
    throw Object.assign(new Error(`Gumroad sales fetch failed: ${e.message}`), { status: 502 });
  }
}

module.exports = { getProducts, getSales };
