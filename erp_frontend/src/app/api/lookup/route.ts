import { NextRequest, NextResponse } from 'next/server';
import { callFrappeMethod, jsonErrorResponse } from '../_lib/frappe';

export const dynamic = 'force-dynamic';

type Entity = 'project' | 'site' | 'item' | 'customer' | 'warehouse' | 'vendor' | 'invoice' | 'estimate' | 'commercial_reference' | 'purchase_order' | 'tender' | 'employee' | 'bid' | 'organization' | 'ip_pool' | 'device' | 'ticket' | 'sla_profile';

const COMMERCIAL_REFERENCE_DOCTYPES = new Set([
  'GE Estimate',
  'GE Proforma Invoice',
  'GE Invoice',
  'GE Payment Follow Up',
]);

/**
 * GET /api/lookup?entity=project|site|item|customer|warehouse|vendor|invoice&q=search
 * Returns [{ value, label, sub? }] for use in LinkPicker.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const entity = sp.get('entity') as Entity | null;
    const q = (sp.get('q') || '').trim();

    if (!entity) {
      return NextResponse.json({ success: false, message: 'entity is required' }, { status: 400 });
    }

    let data: { value: string; label: string; sub?: string }[] = [];

    switch (entity) {
      case 'project': {
        const rows = await callFrappeMethod('get_project_spine_list', {}, request);
        const list = Array.isArray(rows) ? rows : [];
        data = list
          .filter((r: any) => !q || `${r.name} ${r.project_name || ''}`.toLowerCase().includes(q.toLowerCase()))
          .slice(0, 30)
          .map((r: any) => ({ value: r.name, label: r.project_name || r.name, sub: `${r.name} · ${r.status || ''}` }));
        break;
      }

      case 'site': {
        const project = sp.get('project') || undefined;
        const rows = await callFrappeMethod('get_sites', { project }, request);
        const list = Array.isArray(rows) ? rows : [];
        data = list
          .filter((r: any) => !q || `${r.name} ${r.site_name || ''} ${r.site_code || ''}`.toLowerCase().includes(q.toLowerCase()))
          .slice(0, 30)
          .map((r: any) => ({ value: r.name, label: r.site_name || r.site_code || r.name, sub: `${r.name}${r.linked_project ? ` · ${r.linked_project}` : ''}` }));
        break;
      }

      case 'item': {
        const rows = await callFrappeMethod('frappe.client.get_list', {
          doctype: 'Item',
          fields: ['name', 'item_name', 'stock_uom', 'item_group'],
          filters: q ? [['item_name', 'like', `%${q}%`]] : [],
          limit_page_length: 30,
          order_by: 'item_name asc',
        }, request);
        const list = Array.isArray(rows) ? rows : [];
        data = list.map((r: any) => ({ value: r.name, label: r.item_name || r.name, sub: `${r.name}${r.stock_uom ? ` · ${r.stock_uom}` : ''}` }));
        break;
      }

      case 'customer': {
        const rows = await callFrappeMethod('frappe.client.get_list', {
          doctype: 'GE Party',
          fields: ['name', 'party_name', 'party_type', 'city'],
          filters: [
            ['party_type', 'in', ['CLIENT', 'BOTH']],
            ...(q ? [['party_name', 'like', `%${q}%`]] : []),
          ],
          limit_page_length: 30,
          order_by: 'party_name asc',
        }, request);
        const list = Array.isArray(rows) ? rows : [];
        data = list.map((r: any) => ({ value: r.party_name || r.name, label: r.party_name || r.name, sub: `${r.name}${r.city ? ` · ${r.city}` : ''}` }));
        break;
      }

      case 'employee': {
        const rows = await callFrappeMethod('frappe.client.get_list', {
          doctype: 'Employee',
          fields: ['name', 'employee_name', 'designation', 'department', 'status'],
          filters: q ? [['employee_name', 'like', `%${q}%`]] : [],
          limit_page_length: 30,
          order_by: 'employee_name asc',
        }, request);
        const list = Array.isArray(rows) ? rows : [];
        data = list.map((r: any) => ({
          value: r.name,
          label: r.employee_name || r.name,
          sub: [r.name, r.designation, r.department, r.status].filter(Boolean).join(' · '),
        }));
        break;
      }

      case 'ip_pool': {
        const rows = await callFrappeMethod('get_ip_pools', {}, request);
        const list = Array.isArray(rows) ? rows : [];
        data = list
          .filter((r: any) => !q || `${r.name} ${r.network_name || ''} ${r.linked_project || ''} ${r.linked_site || ''}`.toLowerCase().includes(q.toLowerCase()))
          .slice(0, 30)
          .map((r: any) => ({
            value: r.name,
            label: r.network_name || r.name,
            sub: [r.name, r.linked_project, r.linked_site, r.subnet].filter(Boolean).join(' · '),
          }));
        break;
      }

      case 'device': {
        const project = sp.get('project') || '';
        const site = sp.get('site') || '';
        const rows = await callFrappeMethod('get_device_registers', { project, site }, request);
        const list = Array.isArray(rows) ? rows : [];
        data = list
          .filter((r: any) => !q || `${r.name} ${r.device_name || ''} ${r.serial_no || ''} ${r.linked_site || ''}`.toLowerCase().includes(q.toLowerCase()))
          .slice(0, 30)
          .map((r: any) => ({
            value: r.name,
            label: r.device_name || r.name,
            sub: [r.name, r.device_type, r.serial_no, r.linked_site].filter(Boolean).join(' · '),
          }));
        break;
      }

      case 'vendor': {
        const rows = await callFrappeMethod('frappe.client.get_list', {
          doctype: 'GE Party',
          fields: ['name', 'party_name', 'party_type', 'city'],
          filters: [
            ['party_type', 'in', ['VENDOR', 'BOTH']],
            ...(q ? [['party_name', 'like', `%${q}%`]] : []),
          ],
          limit_page_length: 30,
          order_by: 'party_name asc',
        }, request);
        const list = Array.isArray(rows) ? rows : [];
        data = list.map((r: any) => ({ value: r.party_name || r.name, label: r.party_name || r.name, sub: `${r.name}${r.city ? ` · ${r.city}` : ''}` }));
        break;
      }

      case 'warehouse': {
        const rows = await callFrappeMethod('frappe.client.get_list', {
          doctype: 'Warehouse',
          fields: ['name', 'warehouse_name', 'is_group'],
          filters: q ? [['warehouse_name', 'like', `%${q}%`]] : [],
          limit_page_length: 30,
          order_by: 'warehouse_name asc',
        }, request);
        const list = Array.isArray(rows) ? rows : [];
        data = list.map((r: any) => ({ value: r.name, label: r.warehouse_name || r.name, sub: r.is_group ? 'Group' : '' }));
        break;
      }

      case 'invoice': {
        const rows = await callFrappeMethod('frappe.client.get_list', {
          doctype: 'GE Invoice',
          fields: ['name', 'customer', 'total_amount', 'status'],
          filters: q ? [['name', 'like', `%${q}%`]] : [],
          limit_page_length: 30,
          order_by: 'creation desc',
        }, request);
        const list = Array.isArray(rows) ? rows : [];
        data = list.map((r: any) => ({ value: r.name, label: r.name, sub: `${r.customer || ''}${r.total_amount ? ` · ₹${r.total_amount}` : ''}` }));
        break;
      }

      case 'estimate': {
        const rows = await callFrappeMethod('frappe.client.get_list', {
          doctype: 'GE Estimate',
          fields: ['name', 'customer', 'net_amount', 'status'],
          filters: q ? [['name', 'like', `%${q}%`]] : [],
          limit_page_length: 30,
          order_by: 'creation desc',
        }, request);
        const list = Array.isArray(rows) ? rows : [];
        data = list.map((r: any) => ({ value: r.name, label: r.name, sub: `${r.customer || ''}${r.net_amount ? ` · ₹${r.net_amount}` : ''}${r.status ? ` · ${r.status}` : ''}` }));
        break;
      }

      case 'purchase_order': {
        const rows = await callFrappeMethod('frappe.client.get_list', {
          doctype: 'Purchase Order',
          fields: ['name', 'supplier', 'transaction_date', 'status', 'grand_total'],
          filters: q ? [['name', 'like', `%${q}%`]] : [],
          limit_page_length: 30,
          order_by: 'creation desc',
        }, request);
        const list = Array.isArray(rows) ? rows : [];
        data = list.map((r: any) => ({ value: r.name, label: r.name, sub: `${r.supplier || ''}${r.grand_total ? ` · ₹${r.grand_total}` : ''}` }));
        break;
      }

      case 'tender': {
        const rows = await callFrappeMethod('frappe.client.get_list', {
          doctype: 'GE Tender',
          fields: ['name', 'tender_title', 'status'],
          filters: q ? [['name', 'like', `%${q}%`]] : [],
          limit_page_length: 30,
          order_by: 'creation desc',
        }, request);
        const list = Array.isArray(rows) ? rows : [];
        data = list.map((r: any) => ({ value: r.name, label: r.tender_title || r.name, sub: `${r.name}${r.status ? ` · ${r.status}` : ''}` }));
        break;
      }

      case 'ticket': {
        const rows = await callFrappeMethod('frappe.client.get_list', {
          doctype: 'GE Ticket',
          fields: ['name', 'title', 'status', 'priority'],
          filters: q ? [['name', 'like', `%${q}%`]] : [],
          limit_page_length: 30,
          order_by: 'creation desc',
        }, request);
        const list = Array.isArray(rows) ? rows : [];
        data = list.map((r: any) => ({ value: r.name, label: r.title || r.name, sub: [r.name, r.status, r.priority].filter(Boolean).join(' · ') }));
        break;
      }

      case 'sla_profile': {
        const rows = await callFrappeMethod('get_sla_profiles', {}, request);
        const list = Array.isArray(rows) ? rows : Array.isArray(rows?.data) ? rows.data : [];
        data = list
          .filter((r: any) => !q || `${r.name} ${r.profile_name || ''} ${r.linked_project || ''}`.toLowerCase().includes(q.toLowerCase()))
          .slice(0, 30)
          .map((r: any) => ({ value: r.name, label: r.profile_name || r.name, sub: [r.name, r.linked_project].filter(Boolean).join(' · ') }));
        break;
      }

      case 'commercial_reference': {
        const doctype = sp.get('doctype') || '';
        if (!COMMERCIAL_REFERENCE_DOCTYPES.has(doctype)) {
          return NextResponse.json({ success: false, message: `Invalid commercial reference doctype: ${doctype}` }, { status: 400 });
        }
        const rows = await callFrappeMethod('frappe.client.get_list', {
          doctype,
          fields: ['name'],
          filters: q ? [['name', 'like', `%${q}%`]] : [],
          limit_page_length: 30,
          order_by: 'modified desc',
        }, request);
        const list = Array.isArray(rows) ? rows : [];
        data = list.map((r: any) => ({ value: r.name, label: r.name, sub: doctype }));
        break;
      }

      case 'bid': {
        const rows = await callFrappeMethod('frappe.client.get_list', {
          doctype: 'GE Bid',
          fields: ['name', 'tender', 'status', 'bid_amount', 'bid_date', 'is_latest'],
          filters: q ? [['name', 'like', `%${q}%`]] : [],
          limit_page_length: 30,
          order_by: 'creation desc',
        }, request);
        const list = Array.isArray(rows) ? rows : [];
        data = list.map((r: any) => ({ value: r.name, label: r.name, sub: `${r.tender || ''} · ${r.status || ''}${r.bid_amount ? ` · ₹${r.bid_amount}` : ''}` }));
        break;
      }

      case 'organization': {
        const rows = await callFrappeMethod('frappe.client.get_list', {
          doctype: 'GE Organization',
          fields: ['name', 'organization_name', 'city', 'state', 'active'],
          filters: q ? [['organization_name', 'like', `%${q}%`]] : [],
          limit_page_length: 30,
          order_by: 'organization_name asc',
        }, request);
        const list = Array.isArray(rows) ? rows : [];
        data = list.map((r: any) => ({ value: r.name, label: r.organization_name || r.name, sub: [r.name, r.city, r.state].filter(Boolean).join(' · ') }));
        break;
      }

      default:
        return NextResponse.json({ success: false, message: `Unknown entity: ${entity}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return jsonErrorResponse(err, 'Lookup failed');
  }
}
