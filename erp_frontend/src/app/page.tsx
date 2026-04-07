'use client';

import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import AccountsDashboard from '../components/dashboards/AccountsDashboard';
import DirectorDashboard from '../components/dashboards/DirectorDashboard';
import EngineerDashboard from '../components/dashboards/EngineerDashboard';
import EngineeringHeadDashboard from '../components/dashboards/EngineeringHeadDashboard';
import ExecutiveDashboard from '../components/dashboards/ExecutiveDashboard';
import ExecutionDashboard from '../components/dashboards/ExecutionDashboard';
import HROverviewDashboard from '../components/dashboards/HROverviewDashboard';
import OMDashboard from '../components/dashboards/OMDashboard';
import PresalesDashboard from '../components/dashboards/PresalesDashboard';
import PresalesExecutiveDashboard from '../components/dashboards/PresalesExecutiveDashboard';
import ProcurementOverviewDashboard from '../components/dashboards/ProcurementOverviewDashboard';
import PurchaseDashboard from '../components/dashboards/PurchaseDashboard';
import ProjectHeadDashboard from '../components/dashboards/ProjectHeadDashboard';
import ProjectManagerDashboard from '../components/dashboards/ProjectManagerDashboard';
import StoresDashboard from '../components/dashboards/StoresDashboard';
import StoresLogisticsHeadDashboard from '../components/dashboards/StoresLogisticsHeadDashboard';

export default function Home() {
	const { currentUser, isLoading } = useAuth();
	const { currentRole } = useRole();

	if (isLoading || !currentUser || !currentRole) {
		return null;
	}

	switch (currentRole) {
		case 'Director':
			return <DirectorDashboard />;
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
			return <EngineerDashboard />;
		case 'Procurement Manager':
			return <ProcurementOverviewDashboard />;
		case 'Purchase':
			return <PurchaseDashboard />;
		case 'Store Manager':
			return <StoresDashboard />;
		case 'Stores Logistics Head':
			return <StoresLogisticsHeadDashboard />;
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
