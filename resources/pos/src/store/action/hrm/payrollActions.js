import apiConfig from "../../../config/apiConfig";
import { apiBaseURL, hrmActionType, toastType } from "../../../constants";
import requestParam from "../../../shared/requestParam";
import { addToast } from "../toastAction";
import { setTotalRecord } from "../totalRecordAction";
import { setLoading } from "../loadingAction";
import { getFormattedMessage } from "../../../shared/sharedMethod";

// HRM phase 4: payroll. One-off thunks return a promise resolving with the response data
// (or reject after showing the error toast).

const errorMessage = (error) =>
    error && error.response && error.response.data && error.response.data.message
        ? error.response.data.message
        : "Something went wrong";

const fail = (dispatch) => (error) => {
    dispatch(addToast({ text: errorMessage(error), type: toastType.ERROR }));
    return Promise.reject(error);
};

const toastKey = (dispatch, key) => dispatch(addToast({ text: getFormattedMessage(key) }));
const toastText = (dispatch, text) => dispatch(addToast({ text }));

const query = (params = {}) => {
    const parts = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== "0")
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
    return parts.length ? `?${parts.join("&")}` : "";
};

const listUrl = (base, filter, extra = {}) => {
    let url = base;
    if (!_.isEmpty(filter)) {
        url += requestParam(filter, null, null, null, url);
    }
    const rest = query(extra);
    if (rest) url += (url.includes("?") ? "&" : "?") + rest.slice(1);
    return url;
};

const fetchList = (base, type, filter, extra, isLoading) => (dispatch) => {
    if (isLoading) dispatch(setLoading(true));
    return apiConfig
        .get(listUrl(base, filter, extra))
        .then((response) => {
            dispatch({ type, payload: response.data.data });
            dispatch(
                setTotalRecord(
                    response.data.meta && response.data.meta.total >= 0
                        ? response.data.meta.total
                        : response.data.data.length
                )
            );
        })
        .catch((error) => dispatch(addToast({ text: errorMessage(error), type: toastType.ERROR })))
        .finally(() => isLoading && dispatch(setLoading(false)));
};

const openFile = (url) => {
    if (url) window.open(String(url).split("\\").join("/"), "_blank");
};

// ---------- Salary components ----------
export const fetchSalaryComponents = (filter = {}, isLoading = true) =>
    fetchList(apiBaseURL.SALARY_COMPONENTS, hrmActionType.FETCH_SALARY_COMPONENTS, filter, {}, isLoading);

export const fetchAllSalaryComponents = () => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.SALARY_COMPONENTS}?page[size]=0`)
        .then((response) => dispatch({ type: hrmActionType.FETCH_ALL_SALARY_COMPONENTS, payload: response.data.data }))
        .catch(fail(dispatch));

export const saveSalaryComponent = (id, data) => (dispatch) =>
    (id ? apiConfig.put(`${apiBaseURL.SALARY_COMPONENTS}/${id}`, data) : apiConfig.post(apiBaseURL.SALARY_COMPONENTS, data))
        .then(() => {
            toastKey(dispatch, id ? "hrm.salary-component.updated.message" : "hrm.salary-component.created.message");
            dispatch(fetchAllSalaryComponents());
        })
        .catch(fail(dispatch));

export const deleteSalaryComponent = (id) => (dispatch) =>
    apiConfig
        .delete(`${apiBaseURL.SALARY_COMPONENTS}/${id}`)
        .then(() => {
            toastKey(dispatch, "hrm.salary-component.deleted.message");
            dispatch(fetchAllSalaryComponents());
        })
        .catch(fail(dispatch));

// ---------- Employee salary structure ----------
export const fetchSalaryStructure = (employeeId) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.EMPLOYEE_SALARY_COMPONENTS}${query({ employee_id: employeeId })}`)
        .then((response) => response.data.data)
        .catch(fail(dispatch));

export const saveSalaryStructure = (data) => (dispatch) =>
    apiConfig
        .post(apiBaseURL.EMPLOYEE_SALARY_COMPONENTS, data)
        .then(() => toastKey(dispatch, "hrm.salary-structure.saved.message"))
        .catch(fail(dispatch));

export const removeSalaryStructureLine = (id) => (dispatch) =>
    apiConfig
        .delete(`${apiBaseURL.EMPLOYEE_SALARY_COMPONENTS}/${id}`)
        .then((response) => toastText(dispatch, response.data.message))
        .catch(fail(dispatch));

// ---------- Loans & advances ----------
// extra filters: employee_id, status, type, warehouse_id
export const fetchEmployeeLoans = (filter = {}, isLoading = true, extra = {}) =>
    fetchList(apiBaseURL.EMPLOYEE_LOANS, hrmActionType.FETCH_EMPLOYEE_LOANS, filter, extra, isLoading);

export const fetchLoansFor = (employeeId) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.EMPLOYEE_LOANS}?page[size]=0&employee_id=${employeeId}`)
        .then((response) => response.data.data.map((loan) => ({ id: loan.id, ...loan.attributes })))
        .catch(fail(dispatch));

export const saveEmployeeLoan = (id, data) => (dispatch) =>
    (id ? apiConfig.put(`${apiBaseURL.EMPLOYEE_LOANS}/${id}`, data) : apiConfig.post(apiBaseURL.EMPLOYEE_LOANS, data))
        .then((response) => {
            toastKey(dispatch, id ? "hrm.loan.updated.message" : "hrm.loan.created.message");
            return response.data;
        })
        .catch(fail(dispatch));

export const deleteEmployeeLoan = (id) => (dispatch) =>
    apiConfig
        .delete(`${apiBaseURL.EMPLOYEE_LOANS}/${id}`)
        .then(() => toastKey(dispatch, "hrm.loan.deleted.message"))
        .catch(fail(dispatch));

export const settleEmployeeLoan = (id, data) => (dispatch) =>
    apiConfig
        .post(`${apiBaseURL.EMPLOYEE_LOANS}/${id}/settle`, data)
        .then((response) => {
            toastText(dispatch, response.data.message);
            return response.data.data;
        })
        .catch(fail(dispatch));

export const cancelEmployeeLoan = (id) => (dispatch) =>
    apiConfig
        .post(`${apiBaseURL.EMPLOYEE_LOANS}/${id}/cancel`)
        .then((response) => {
            toastText(dispatch, response.data.message);
            return response.data.data;
        })
        .catch(fail(dispatch));

// ---------- Payroll runs ----------
// extra filters: status, year, warehouse_id, department_id
export const fetchPayrollRuns = (filter = {}, isLoading = true, extra = {}) =>
    fetchList(apiBaseURL.PAYROLL_RUNS, hrmActionType.FETCH_PAYROLL_RUNS, filter, extra, isLoading);

export const createPayrollRun = (data) => (dispatch) =>
    apiConfig
        .post(apiBaseURL.PAYROLL_RUNS, data)
        .then((response) => {
            toastKey(dispatch, "hrm.payroll.created.message");
            return response.data.data;
        })
        .catch(fail(dispatch));

export const fetchPayrollRun = (id) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.PAYROLL_RUNS}/${id}`)
        .then((response) => response.data.data)
        .catch(fail(dispatch));

const runAction = (action, id, body) => (dispatch) =>
    apiConfig
        .post(`${apiBaseURL.PAYROLL_RUNS}/${id}/${action}`, body || {})
        .then((response) => {
            toastText(dispatch, response.data.message);
            return response.data.data;
        })
        .catch(fail(dispatch));

export const recalculatePayrollRun = (id) => runAction("recalculate", id);
export const approvePayrollRun = (id) => runAction("approve", id);
export const payPayrollRun = (id, body) => runAction("pay", id, body);

export const deletePayrollRun = (id) => (dispatch) =>
    apiConfig
        .delete(`${apiBaseURL.PAYROLL_RUNS}/${id}`)
        .then(() => toastKey(dispatch, "hrm.payroll.deleted.message"))
        .catch(fail(dispatch));

const download = (url, key) => (dispatch) =>
    apiConfig
        .get(url)
        .then((response) => openFile(response.data.data[key]))
        .catch(fail(dispatch));

export const downloadRunPayslips = (id) => download(`${apiBaseURL.PAYROLL_RUNS}/${id}/pdf`, "payslip_pdf_url");
export const downloadRunSummary = (id) => download(`${apiBaseURL.PAYROLL_RUNS}/${id}/summary-excel`, "payroll_excel_url");
export const downloadRunBankSheet = (id) => download(`${apiBaseURL.PAYROLL_RUNS}/${id}/bank-excel`, "payroll_excel_url");
export const downloadRunSummaryPdf = (id) => download(`${apiBaseURL.PAYROLL_RUNS}/${id}/summary-pdf`, "payroll_pdf_url");
export const downloadRunBankSheetPdf = (id) => download(`${apiBaseURL.PAYROLL_RUNS}/${id}/bank-pdf`, "payroll_pdf_url");

// ---------- Payslips ----------
export const fetchPayslip = (id, isSelf = false) => (dispatch) =>
    apiConfig
        .get(`${isSelf ? apiBaseURL.MY_PAYSLIPS : apiBaseURL.PAYSLIPS}/${id}`)
        .then((response) => ({ id: response.data.data.id, ...response.data.data.attributes }))
        .catch(fail(dispatch));

export const fetchEmployeePayslips = (employeeId) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.PAYSLIPS}?page[size]=0&employee_id=${employeeId}`)
        .then((response) => response.data.data.map((p) => ({ id: p.id, ...p.attributes })))
        .catch(fail(dispatch));

export const downloadPayslip = (id, isSelf = false) =>
    download(`${isSelf ? apiBaseURL.MY_PAYSLIPS : apiBaseURL.PAYSLIPS}/${id}/pdf`, "payslip_pdf_url");

export const addPayslipAdjustment = (id, data) => (dispatch) =>
    apiConfig
        .post(`${apiBaseURL.PAYSLIPS}/${id}/adjustments`, data)
        .then((response) => {
            toastKey(dispatch, "hrm.payslip.adjustment-added.message");
            return { id: response.data.data.id, ...response.data.data.attributes };
        })
        .catch(fail(dispatch));

export const removePayslipAdjustment = (id, itemId) => (dispatch) =>
    apiConfig
        .delete(`${apiBaseURL.PAYSLIPS}/${id}/adjustments/${itemId}`)
        .then((response) => {
            toastKey(dispatch, "hrm.payslip.adjustment-removed.message");
            return { id: response.data.data.id, ...response.data.data.attributes };
        })
        .catch(fail(dispatch));

// ---------- Reports ----------
export const fetchEpfReport = (params) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.PAYROLL_REPORTS}/epf${query(params)}`)
        .then((response) => response.data.data)
        .catch(fail(dispatch));

export const exportEpfReport = (params) =>
    download(`${apiBaseURL.PAYROLL_REPORTS}/epf-excel${query(params)}`, "payroll_excel_url");
export const exportEpfReportPdf = (params) =>
    download(`${apiBaseURL.PAYROLL_REPORTS}/epf-pdf${query(params)}`, "payroll_pdf_url");

// ---------- Self service ----------
export const fetchMyPayslips = () => (dispatch) =>
    apiConfig
        .get(apiBaseURL.MY_PAYSLIPS)
        .then((response) => response.data.data)
        .catch(fail(dispatch));
