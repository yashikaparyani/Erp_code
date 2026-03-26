'use client';

import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import AccountsDashboard from '../components/dashboards/AccountsDashboard';
import EngineeringHeadDashboard from '../components/dashboards/EngineeringHeadDashboard';
import ExecutiveDashboard from '../components/dashboards/ExecutiveDashboard';
import ExecutionDashboard from '../components/dashboards/ExecutionDashboard';
import HROverviewDashboard from '../components/dashboards/HROverviewDashboard';
import OMDashboard from '../components/dashboards/OMDashboard';
import PresalesDashboard from '../components/dashboards/PresalesDashboard';
import PresalesExecutiveDashboard from '../components/dashboards/PresalesExecutiveDashboard';
import ProcurementDashboard from '../components/dashboards/ProcurementDashboard';
import ProcurementOverviewDashboard from '../components/dashboards/ProcurementOverviewDashboard';
import ProjectHeadDashboard from '../components/dashboards/ProjectHeadDashboard';
import ProjectManagerDashboard from '../components/dashboards/ProjectManagerDashboard';
import StoresDashboard from '../components/dashboards/StoresDashboard';

export default function Home() {
	const { currentUser, isLoading } = useAuth();
	const { currentRole } = useRole();

	if (isLoading || !currentUser || !currentRole) {
		return null;
	}

	switch (currentRole) {
		case 'Project Head':
			return <ProjectHeadDashboard />;
		case 'Project Manager':
			return <ProjectManagerDashboard />;
		case 'Presales Tendering Head':
			return <PresalesDashboard />;
		case 'Presales Executive':
			return <PresalesExecutiveDashboard />;
		case 'Engineering Head':
			return <EngineeringHeadDashboard />;
		case 'Engineer':
			return <EngineeringHeadDashboard />;
		case 'Procurement Manager':
			return <ProcurementOverviewDashboard />;
		case 'Purchase':
			return <ProcurementDashboard />;
		case 'Store Manager':
		case 'Stores Logistics Head':
			return <StoresDashboard />;
		case 'Field Technician':
			return <ExecutionDashboard />;
		case 'Accounts':
			return <AccountsDashboard />;
		case 'HR Manager':
			return <HROverviewDashboard />;
		case 'OM Operator':
			return <OMDashboard />;
		case 'RMA Manager':
			return (
				<OMDashboard
					title="RMA Dashboard"
					subtitle="Faulty device recovery, SLA-sensitive escalations, and repair pipeline visibility from live service data"
				/>
			);
		default:
			return <ExecutiveDashboard />;
	}
}
