// Frappe API client configuration
const FRAPPE_URL = process.env.FRAPPE_URL || 'http://mysite.local:8000';

interface FrappeResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  total?: number;
}

interface FrappeCallOptions {
  method: string;
  args?: Record<string, any>;
}

export async function frappeCall<T = any>(options: FrappeCallOptions): Promise<FrappeResponse<T>> {
  try {
    const response = await fetch(`${FRAPPE_URL}/api/method/gov_erp.api.${options.method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(options.args || {}),
      // For development - skip SSL verification
      // In production, use proper authentication
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.message || result;
  } catch (error) {
    console.error('Frappe API Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Tender API functions
export const tenderApi = {
  getAll: (filters?: Record<string, any>, limit?: number, offset?: number) =>
    frappeCall({
      method: 'get_tenders',
      args: { filters, limit_page_length: limit, limit_start: offset }
    }),

  getOne: (name: string) =>
    frappeCall({
      method: 'get_tender',
      args: { name }
    }),

  create: (data: Record<string, any>) =>
    frappeCall({
      method: 'create_tender',
      args: { data: JSON.stringify(data) }
    }),

  update: (name: string, data: Record<string, any>) =>
    frappeCall({
      method: 'update_tender',
      args: { name, data: JSON.stringify(data) }
    }),

  delete: (name: string) =>
    frappeCall({
      method: 'delete_tender',
      args: { name }
    }),

  getStats: () =>
    frappeCall({
      method: 'get_tender_stats'
    }),

  getOrganizations: () =>
    frappeCall({
      method: 'get_organizations'
    }),

  getParties: () =>
    frappeCall({
      method: 'get_parties'
    }),
};

export default tenderApi;
