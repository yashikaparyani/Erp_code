frappe.ui.form.on('GE LOI Tracker', {
	refresh(frm) {
		// auto-fill tender from linked bid
		if (frm.doc.bid && !frm.doc.tender) {
			frappe.db.get_value('GE Bid', frm.doc.bid, 'tender', (r) => {
				if (r && r.tender) frm.set_value('tender', r.tender);
			});
		}
	}
});
