import { hrmActionType } from "../../constants";

const listReducer = (fetchType) => (state = [], action) =>
    action.type === fetchType ? action.payload : state;

export const departmentsReducer = listReducer(hrmActionType.FETCH_DEPARTMENTS);
export const allDepartmentsReducer = listReducer(hrmActionType.FETCH_ALL_DEPARTMENTS);
export const designationsReducer = listReducer(hrmActionType.FETCH_DESIGNATIONS);
export const allDesignationsReducer = listReducer(hrmActionType.FETCH_ALL_DESIGNATIONS);
export const employeesReducer = listReducer(hrmActionType.FETCH_EMPLOYEES);
export const employeeAvailableUsersReducer = listReducer(
    hrmActionType.FETCH_EMPLOYEE_AVAILABLE_USERS
);

export const employeeReducer = (state = null, action) =>
    action.type === hrmActionType.FETCH_EMPLOYEE ? action.payload : state;

export const hrSettingsReducer = (state = null, action) =>
    action.type === hrmActionType.FETCH_HR_SETTINGS ? action.payload : state;
