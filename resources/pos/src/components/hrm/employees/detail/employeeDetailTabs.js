import EmployeeProfileTab from "./EmployeeProfileTab";
import EmployeeDocumentsTab from "./EmployeeDocumentsTab";
import EmployeeAttendanceTab from "./EmployeeAttendanceTab";
import EmployeeLeaveTab from "./EmployeeLeaveTab";
import EmployeePayrollTab from "./EmployeePayrollTab";

// Tab registry for the employee detail page. Later HRM phases replace the
// placeholder `component` for attendance / leave / payroll (and may append tabs).
// Each component receives { employee } where employee = { id, ...attributes }.
const employeeDetailTabs = [
    { key: "profile", label: "hrm.tab.profile", component: EmployeeProfileTab },
    { key: "documents", label: "hrm.tab.documents", component: EmployeeDocumentsTab },
    { key: "attendance", label: "hrm.tab.attendance", component: EmployeeAttendanceTab },
    { key: "leave", label: "hrm.tab.leave", component: EmployeeLeaveTab },
    { key: "payroll", label: "hrm.tab.payroll", component: EmployeePayrollTab },
];

export default employeeDetailTabs;
