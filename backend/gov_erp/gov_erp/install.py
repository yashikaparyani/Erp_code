from gov_erp.role_utils import ensure_business_roles


def after_install():
	ensure_business_roles()


def after_migrate():
	ensure_business_roles()
