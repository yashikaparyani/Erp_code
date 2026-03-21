frappe.ui.form.on('GE Presales Color Config', {
	refresh(frm) {
		frm.set_intro(
			'Configure the 6 custom color slots for the Pre-Sales Funnel Dashboard. ' +
			'Changes are applied immediately across all tenders using each slot.',
			'blue'
		);
	}
});
