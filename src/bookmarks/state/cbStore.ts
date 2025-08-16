import { create } from 'zustand';
import { Cb } from '../types/cb';

/**
 * CBストアの状態型
 */
interface CbStoreState {
  cbs: Cb[];
  selectedCbId: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * CBストアのアクション型
 */
interface CbStoreActions {
  setCbs: (cbs: Cb[]) => void;
  selectCb: (id: string) => void;
  clearSelection: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addCb: (cb: Cb) => void;
  updateCb: (id: string, updates: Partial<Cb>) => void;
  removeCb: (id: string) => void;
}

/**
 * CBストアの型
 */
type CbStore = CbStoreState & CbStoreActions & {
  selectedCb: Cb | undefined;
};

/**
 * CBストアの作成
 */
export const useCbStore = create<CbStore>((set, get) => ({
  // 初期状態
  cbs: [],
  selectedCbId: null,
  loading: false,
  error: null,

  // Computed properties
  get selectedCb() {
    const { cbs, selectedCbId } = get();
    return cbs.find(cb => cb.id === selectedCbId);
  },

  // アクション
  setCbs: (cbs) => set({ cbs }),
  
  selectCb: (id) => set({ selectedCbId: id }),
  
  clearSelection: () => set({ selectedCbId: null }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  addCb: (cb) => set((state) => ({ 
    cbs: [...state.cbs, cb] 
  })),
  
  updateCb: (id, updates) => set((state) => ({
    cbs: state.cbs.map(cb => 
      cb.id === id ? { ...cb, ...updates } : cb
    )
  })),
  
  removeCb: (id) => set((state) => ({
    cbs: state.cbs.filter(cb => cb.id !== id),
    selectedCbId: state.selectedCbId === id ? null : state.selectedCbId
  }))
}));

/**
 * 選択中のCBを取得するセレクター
 */
export const useSelectedCb = () => {
  const { cbs, selectedCbId } = useCbStore();
  return cbs.find(cb => cb.id === selectedCbId) || null;
};
