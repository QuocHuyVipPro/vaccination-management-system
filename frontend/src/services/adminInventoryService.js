import { authenticatedRequest } from './authService.js';


function withQuery(path, filters = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return query.size ? `${path}?${query}` : path;
}

export function getAdminBatches(filters = {}) {
  return authenticatedRequest(withQuery('/admin/inventory/batches', filters));
}

export function getAdminBatch(batchId) {
  return authenticatedRequest(`/admin/inventory/batches/${batchId}`);
}

export function createAdminBatch(payload) {
  return authenticatedRequest('/admin/inventory/batches', { method: 'POST', body: payload });
}

export function updateAdminBatch(batchId, payload) {
  return authenticatedRequest(`/admin/inventory/batches/${batchId}`, { method: 'PATCH', body: payload });
}

export function restockAdminBatch(batchId, payload) {
  return authenticatedRequest(`/admin/inventory/batches/${batchId}/restock`, { method: 'POST', body: payload });
}

export function adjustAdminBatch(batchId, payload) {
  return authenticatedRequest(`/admin/inventory/batches/${batchId}/adjust`, { method: 'POST', body: payload });
}

export function getAdminInventoryTransactions(filters = {}) {
  return authenticatedRequest(withQuery('/admin/inventory/transactions', filters));
}

export function getAdminBatchTransactions(batchId) {
  return authenticatedRequest(`/admin/inventory/batches/${batchId}/transactions`);
}
