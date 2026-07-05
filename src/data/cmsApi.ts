import {
  exportStoreSnapshot,
  getStoreSnapshot,
  importStoreSnapshot,
  resetStoreSnapshot,
  saveStoreSnapshot,
  submitOrderRequest,
  type OrderInput,
  type StoreSnapshot,
} from './store';

export type CmsApi = {
  getSnapshot: () => StoreSnapshot;
  saveSnapshot: (snapshot: StoreSnapshot) => void;
  importSnapshot: (snapshot: StoreSnapshot) => void;
  reset: () => void;
  exportSnapshot: () => string;
  submitOrder: (request: OrderInput) => Promise<{ reference: string }>;
};

export function createCmsApi(): CmsApi {
  return {
    getSnapshot: getStoreSnapshot,
    saveSnapshot: saveStoreSnapshot,
    importSnapshot: importStoreSnapshot,
    reset: resetStoreSnapshot,
    exportSnapshot: exportStoreSnapshot,
    submitOrder: submitOrderRequest,
  };
}
