import frappe
# No import needed for raw SQL fixes

def execute():
    """
    Fix missing standard Frappe fields across ALL doctypes.
    Critical fix for 'parent' column error.
    """
    standard_fields = [
        dict(fieldname='parent', label='Parent', fieldtype='Link', options='DocType', 
             hidden=1, no_copy=1, print_hide=1, report_hide=1),
        dict(fieldname='parentfield', label='Parent Field', fieldtype='Data',
             hidden=1, no_copy=1, print_hide=1, report_hide=1),
        dict(fieldname='parenttype', label='Parent Type', fieldtype='Link', options='DocType',
             hidden=1, no_copy=1, print_hide=1, report_hide=1),
        dict(fieldname='idx', label='Idx', fieldtype='Int',
             hidden=1, no_copy=1, print_hide=1, report_hide=1, read_only=1),
        dict(fieldname='docstatus', label='Doc Status', fieldtype='Int', options='0\n1\n2',
             hidden=1, no_copy=1, print_hide=1, report_hide=1, read_only=1)
    ]
    
    gov_erp_doctype = frappe.get_all('DocType', 
                                   filters={'module': 'Gov ERP', 'custom': 0},
                                   fields=['name'])
    
    fixed_count = 0
    
    print("🔧 Fixing Gov ERP doctypes - Adding missing standard Frappe fields...")
    
    for dt in gov_erp_doctype:
        print(f"  Checking {dt.name}...")
        
        # Check if parent field exists
        if not frappe.db.has_column(dt.name, 'parent'):
            print(f"    ➕ Adding missing standard fields to {dt.name}")
            
            # Safe SQL ALTER (bypass ORM)
            frappe.db.sql(f"""
                ALTER TABLE `tab{dt.name}`
                ADD COLUMN IF NOT EXISTS `parent` VARCHAR(140),
                ADD COLUMN IF NOT EXISTS `parentfield` VARCHAR(140),
                ADD COLUMN IF NOT EXISTS `parenttype` VARCHAR(140),
                ADD COLUMN IF NOT EXISTS `idx` INT(11) UNSIGNED NOT NULL DEFAULT '0',
                ADD COLUMN IF NOT EXISTS `docstatus` INT(1) UNSIGNED NOT NULL DEFAULT '0'
            """)
            fixed_count += 1
        else:
            print(f"    ✅ {dt.name} already has standard fields")
    
    # Update field_order for GE Tender specifically (detected issue)
    if frappe.db.exists('DocType', 'GE Tender'):
        frappe.db.sql("""
            UPDATE `tabDocType` 
            SET field_order = JSON_SET(
                field_order, 
                '$[-1]', 'naming_series',
                '$[-1]', 'parent',
                '$[-1]', 'parentfield', 
                '$[-1]', 'parenttype',
                '$[-1]', 'idx',
                '$[-1]', 'docstatus'
            )
            WHERE name = 'GE Tender'
        """)
    
    frappe.db.commit()
    
    print(f"\n✅ FIXED {fixed_count} doctypes. Run 'bench migrate' to sync schema.")
    print("🔍 Verify: DESCRIBE `tabGE Tender` | grep parent")
    
    frappe.msgprint(
        f"Fixed {fixed_count} Gov ERP doctypes. Missing 'parent' column issue RESOLVED.<br>"
        "Run <b>bench migrate</b> then test: <b>GET /api/tenders/[ID]</b>",
        title="Schema Fix Complete",
        indicator="green"
    )

