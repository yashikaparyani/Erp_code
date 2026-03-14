# ITMS ERP — Demo Login Credentials

> **City Surveillance ITMS ERP Platform**  
> All accounts are for demo/testing purposes only.

---

## Login URL
`http://localhost:3000/login`

---

## Demo Accounts

| # | Role | Username | Password | Name | Email |
|---|------|----------|----------|------|-------|
| 1 | Director | `director` | `Director@123` | Rajesh Sharma | rajesh.sharma@itms.in |
| 2 | Department Head | `dept.head` | `DeptHead@123` | Priya Mehta | priya.mehta@itms.in |
| 3 | HR Head | `hr.head` | `HRHead@123` | Anjali Rao | anjali.rao@itms.in |
| 4 | Presales Tendering Head | `presales.head` | `Presales@123` | Amit Verma | amit.verma@itms.in |
| 5 | Engineering Head | `eng.head` | `EngHead@123` | Suresh Nair | suresh.nair@itms.in |
| 6 | Engineer | `engineer` | `Engineer@123` | Neha Singh | neha.singh@itms.in |
| 7 | Purchase | `purchase` | `Purchase@123` | Vikram Desai | vikram.desai@itms.in |
| 8 | Stores Logistics Head | `stores.head` | `Stores@123` | Kavita Joshi | kavita.joshi@itms.in |
| 9 | Project Manager | `proj.manager` | `ProjMgr@123` | Ravi Kumar | ravi.kumar@itms.in |
| 10 | Accounts | `accounts` | `Accounts@123` | Sunita Patel | sunita.patel@itms.in |
| 11 | Field Technician | `field.tech` | `FieldTech@123` | Rohit Gupta | rohit.gupta@itms.in |
| 12 | OM Operator | `om.operator` | `OMOper@123` | Deepak Mali | deepak.mali@itms.in |

---

## Role-wise Sidebar Access

| Role | Accessible Modules |
|------|--------------------|
| **Director** | Dashboard, Pre-Sales, Engineering (Survey + BOQ), Procurement, Inventory, Execution, O&M, Finance (Costing + Billing), Reports, Documents, Master Data |
| **Department Head** | Dashboard, Pre-Sales, Engineering, Procurement, Inventory, Execution, O&M, Finance, Reports, Documents |
| **HR Head** | Dashboard, Reports, Documents, Master Data |
| **Presales Tendering Head** | Dashboard, Pre-Sales, Engineering (Survey), Finance, Reports, Documents |
| **Engineering Head** | Dashboard, Engineering (Survey + BOQ), Procurement, Inventory, Execution, Reports, Documents |
| **Engineer** | Dashboard, Engineering (Survey + BOQ), Execution, Documents |
| **Purchase** | Dashboard, Procurement, Inventory, Finance, Reports, Documents |
| **Stores Logistics Head** | Dashboard, Procurement, Inventory, Execution, Reports, Documents |
| **Project Manager** | Dashboard, Pre-Sales, Engineering, Procurement, Inventory, Execution, O&M, Finance, Reports, Documents |
| **Accounts** | Dashboard, Pre-Sales, Procurement, Finance, Reports, Documents |
| **Field Technician** | Dashboard, Engineering (Survey), Inventory, Execution, O&M, Documents |
| **OM Operator** | Dashboard, Inventory, O&M, Reports, Documents |

---

## Notes

- Sessions are stored in **sessionStorage** — closing the browser tab will require re-login.
- The **"Demo Accounts"** section on the login page allows one-click quick login for any role.
- Role permissions control which sidebar items are visible after login.
