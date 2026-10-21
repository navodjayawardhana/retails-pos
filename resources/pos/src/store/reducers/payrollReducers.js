import { hrmActionType } from "../../constants";

const listReducer = (fetchType) => (state = [], action) =>
    action.type === fetchType ? action.payload : state;

export const salaryComponentsReducer = listReducer(hrmActionType.FETCH_SALARY_COMPONENTS);
export const allSalaryComponentsReducer = listReducer(hrmActionType.FETCH_ALL_SALARY_COMPONENTS);
export const employeeLoansReducer = listReducer(hrmActionType.FETCH_EMPLOYEE_LOANS);
export const payrollRunsReducer = listReducer(hrmActionType.FETCH_PAYROLL_RUNS);
