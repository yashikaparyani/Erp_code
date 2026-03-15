'use client';

import { useRole } from '../context/RoleContext';
import AccountsDashboard from '../components/dashboards/AccountsDashboard';
import ExecutiveDashboard from '../components/dashboards/ExecutiveDashboard';
import ExecutionDashboard from '../components/dashboards/ExecutionDashboard';
import OMDashboard from '../components/dashboards/OMDashboard';
import PresalesDashboard from '../components/dashboards/PresalesDashboard';
import ProcurementDashboard from '../components/dashboards/ProcurementDashboard';
import ProjectHeadDashboard from '../components/dashboards/ProjectHeadDashboard';
import StoresDashboard from '../components/dashboards/StoresDashboard';

export default function Home() {
	const { currentRole } = useRole();

	switch (currentRole) {
		case 'Project Manager':
			return <ProjectHeadDashboard />;
		case 'Presales Tendering Head':
			return <PresalesDashboard />;
		case 'Purchase':
			return <ProcurementDashboard />;
		case 'Stores Logistics Head':
			return <StoresDashboard />;
		case 'Field Technician':
			return <ExecutionDashboard />;
		case 'Accounts':
			return <AccountsDashboard />;
		case 'OM Operator':
			return <OMDashboard />;
		default:
			return <ExecutiveDashboard />;
	}
}
