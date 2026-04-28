'use client';

import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { Plus, Search, Building2, Pencil, Trash2 } from 'lucide-react';
import RegisterPage from '@/components/shells/RegisterPage';
import ActionModal from '@/components/ui/ActionModal';

// --- Types ---
type ModalState =
  | { type: 'create' }
  | { type: 'edit'; target: Supplier }
  | { type: 'delete'; target: Supplier }
  | null;

type FormValues = {
  party_name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  address: string;
};

const BLANK_FORM: FormValues = { party_name: '', phone: '', email: '', city: '', state: '', address: '' };

type Supplier = {
  name: string;
  party_name: string;
  party_type?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  address?: string;
  active?: number;
  creation?: string;
};

type State = {
  rows: Supplier[];
  loading: boolean;
  error: string;
  query: string;
  busy: boolean;
  modal: ModalState;
  formValues: FormValues;
  formError: string;
};

type Action =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; payload: Supplier[] }
  | { type: 'LOAD_ERROR'; payload: string }
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'SET_BUSY'; payload: boolean }
  | { type: 'OPEN_MODAL'; payload: ModalState }
  | { type: 'CLOSE_MODAL' }
  | { type: 'SET_FORM_VALUES'; payload: FormValues }
  | { type: 'UPDATE_FORM_VALUE'; payload: { key: keyof FormValues; value: string } }
  | { type: 'SET_FORM_ERROR'; payload: string };

const initialState: State = {
  rows: [],
  loading: true,
  error: '',
  query: '',
  busy: false,
  modal: null,
  formValues: BLANK_FORM,
  formError: '',
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD_START': return { ...state, loading: true, error: '' };
    case 'LOAD_SUCCESS': return { ...state, loading: false, rows: action.payload };
    case 'LOAD_ERROR': return { ...state, loading: false, error: action.payload };
    case 'SET_QUERY': return { ...state, query: action.payload };
    case 'SET_BUSY': return { ...state, busy: action.payload };
    case 'OPEN_MODAL': return { ...state, modal: action.payload, formError: '' };
    case 'CLOSE_MODAL': return { ...state, modal: null, formValues: BLANK_FORM, formError: '' };
    case 'SET_FORM_VALUES': return { ...state, formValues: action.payload };
    case 'UPDATE_FORM_VALUE': return { ...state, formValues: { ...state.formValues, [action.payload.key]: action.payload.value } };
    case 'SET_FORM_ERROR': return { ...state, formError: action.payload };
    default: return state;
  }
}

const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]';

function SupplierForm({ values, onChange }: { values: FormValues; onChange: (key: keyof FormValues, value: string) => void; }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Supplier Name *</label>
        <input className={inputCls} value={values.party_name || ''} onChange={e => onChange('party_name', e.target.value)} placeholder="Supplier name" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
          <input className={inputCls} value={values.phone || ''} onChange={e => onChange('phone', e.target.value)} placeholder="+91-..." />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
          <input className={inputCls} type="email" value={values.email || ''} onChange={e => onChange('email', e.target.value)} placeholder="contact@supplier.com" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">City</label>
          <input className={inputCls} value={values.city || ''} onChange={e => onChange('city', e.target.value)} placeholder="City" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">State</label>
          <input className={inputCls} value={values.state || ''} onChange={e => onChange('state', e.target.value)} placeholder="State" />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Address</label>
        <input className={inputCls} value={values.address || ''} onChange={e => onChange('address', e.target.value)} placeholder="Full address" />
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { rows, loading, error, query, busy, modal, formValues, formError } = state;

  const load = useCallback(async () => {
    dispatch({ type: 'LOAD_START' });
    try {
      const res = await fetch('/api/suppliers', { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to load suppliers');
      dispatch({ type: 'LOAD_SUCCESS', payload: Array.isArray(payload.data) ? payload.data : [] });
    } catch (e) {
      dispatch({ type: 'LOAD_ERROR', payload: e instanceof Error ? e.message : 'Failed to load suppliers' });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.party_name, r.city, r.state, r.email, r.phone].filter(Boolean).some(v => v!.toLowerCase().includes(q))
    );
  }, [rows, query]);

  const handleCreate = async () => {
    if (!formValues.party_name?.trim()) { dispatch({ type: 'SET_FORM_ERROR', payload: 'Supplier name is required' }); return; }
    dispatch({ type: 'SET_BUSY', payload: true }); dispatch({ type: 'SET_FORM_ERROR', payload: '' });
    try {
      const res = await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formValues) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to create supplier');
      dispatch({ type: 'CLOSE_MODAL' });
      await load();
    } catch (e) { dispatch({ type: 'SET_FORM_ERROR', payload: e instanceof Error ? e.message : 'Failed to create supplier' }); }
    finally { dispatch({ type: 'SET_BUSY', payload: false }); }
  };

  const handleEdit = async () => {
    if (modal?.type !== 'edit') return;
    if (!formValues.party_name?.trim()) { dispatch({ type: 'SET_FORM_ERROR', payload: 'Supplier name is required' }); return; }
    dispatch({ type: 'SET_BUSY', payload: true }); dispatch({ type: 'SET_FORM_ERROR', payload: '' });
    try {
      const res = await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', name: modal.target.name, ...formValues }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to update supplier');
      dispatch({ type: 'CLOSE_MODAL' });
      await load();
    } catch (e) { dispatch({ type: 'SET_FORM_ERROR', payload: e instanceof Error ? e.message : 'Failed to update supplier' }); }
    finally { dispatch({ type: 'SET_BUSY', payload: false }); }
  };

  const handleDelete = async () => {
    if (modal?.type !== 'delete') return;
    dispatch({ type: 'SET_BUSY', payload: true });
    dispatch({ type: 'SET_FORM_ERROR', payload: '' });
    try {
      const res = await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', name: modal.target.name }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.success === false) throw new Error(payload.message || 'Failed to delete supplier');
      dispatch({ type: 'CLOSE_MODAL' });
      await load();
    } catch (e) { dispatch({ type: 'SET_FORM_ERROR', payload: e instanceof Error ? e.message : 'Failed to delete supplier' }); }
    finally { dispatch({ type: 'SET_BUSY', payload: false }); }
  };

  return (
    <>
      <RegisterPage
        title="Supplier Management"
        description="Manage vendor and supplier master records used in procurement."
        loading={loading}
        error={error}
        empty={!loading && rows.length === 0}
        emptyTitle="No suppliers"
        emptyDescription="Add your first supplier to enable procurement workflows."
        onRetry={load}
        stats={[
          { label: 'Total', value: rows.length },
          { label: 'Active', value: rows.filter(r => r.active).length, variant: 'success' },
          { label: 'Filtered', value: filtered.length, variant: query ? 'default' : undefined },
        ]}
        headerActions={
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'create' } })}>
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        }
        filterBar={
          <div className="relative min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input className="input pl-9" type="text" value={query} onChange={e => dispatch({ type: 'SET_QUERY', payload: e.target.value })} placeholder="Search supplier, city…" />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="data-table w-full text-sm">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Phone</th>
                <th>Email</th>
                <th>City</th>
                <th>State</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.name}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="font-medium text-gray-900">{r.party_name}</span>
                    </div>
                    {r.address && <div className="text-xs text-gray-500 mt-0.5 pl-6">{r.address}</div>}
                  </td>
                  <td className="text-gray-700">{r.phone || '-'}</td>
                  <td className="text-gray-700">{r.email || '-'}</td>
                  <td className="text-gray-700">{r.city || '-'}</td>
                  <td className="text-gray-700">{r.state || '-'}</td>
                  <td>
                    <span className={`badge ${r.active ? 'badge-success' : 'badge-gray'}`}>
                      {r.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <button
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        onClick={() => {
                          dispatch({ type: 'OPEN_MODAL', payload: { type: 'edit', target: r } });
                          dispatch({ type: 'SET_FORM_VALUES', payload: { party_name: r.party_name, phone: r.phone || '', email: r.email || '', city: r.city || '', state: r.state || '', address: r.address || '' } });
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        className="text-sm font-medium text-rose-600 hover:text-rose-800 flex items-center gap-1"
                        onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'delete', target: r } })}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RegisterPage>

      {/* Create modal */}
      {modal?.type === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Add Supplier</h2>
            {formError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{formError}</div>}
            <SupplierForm values={formValues} onChange={(k, v) => dispatch({ type: 'UPDATE_FORM_VALUE', payload: { key: k, value: v } })} />
            <div className="flex justify-end gap-3 pt-2">
              <button className="btn" onClick={() => dispatch({ type: 'CLOSE_MODAL' })} disabled={busy}>Cancel</button>
              <button className="btn btn-primary" onClick={() => void handleCreate()} disabled={busy}>{busy ? 'Creating…' : 'Create Supplier'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {modal?.type === 'edit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Edit Supplier</h2>
            {formError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{formError}</div>}
            <SupplierForm values={formValues} onChange={(k, v) => dispatch({ type: 'UPDATE_FORM_VALUE', payload: { key: k, value: v } })} />
            <div className="flex justify-end gap-3 pt-2">
              <button className="btn" onClick={() => dispatch({ type: 'CLOSE_MODAL' })} disabled={busy}>Cancel</button>
              <button className="btn btn-primary" onClick={() => void handleEdit()} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      <ActionModal
        open={modal?.type === 'delete'}
        title={`Delete ${modal?.type === 'delete' ? modal.target.party_name : 'Supplier'}`}
        description="This will permanently remove the supplier. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        busy={busy}
        onConfirm={() => void handleDelete()}
        onCancel={() => dispatch({ type: 'CLOSE_MODAL' })}
      >
        {formError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>}
      </ActionModal>
    </>
  );
}
