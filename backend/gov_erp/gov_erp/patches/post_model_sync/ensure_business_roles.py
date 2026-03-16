from gov_erp.role_utils import ensure_business_roles, grant_director_full_access


def execute():
	ensure_business_roles()
	grant_director_full_access()
