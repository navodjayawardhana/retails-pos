import apiConfig from "../../../config/apiConfig";
import apiConfigFormData from "../../../config/apiConfigWthFormData";
import { apiBaseURL, hrmActionType, toastType } from "../../../constants";
import requestParam from "../../../shared/requestParam";
import { addToast } from "../toastAction";
import { setTotalRecord } from "../totalRecordAction";
import { setLoading } from "../loadingAction";
import { getFormattedMessage } from "../../../shared/sharedMethod";

// HRM phase 2: shifts, holidays, attendance. Thunks for one-off screens return a promise
// that resolves with the response data (or rejects after showing the error toast).

const errorMessage = (error) =>
    error && error.response && error.response.data && error.response.data.message
        ? error.response.data.message
        : "Something went wrong";

const fail = (dispatch) => (error) => {
    dispatch(addToast({ text: errorMessage(error), type: toastType.ERROR }));
    return Promise.reject(error);
};

const toast = (dispatch, text, isKey = true) =>
    dispatch(addToast({ text: isKey ? getFormattedMessage(text) : text }));

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

// ---------- Shifts ----------
export const fetchShifts = (filter = {}, isLoading = true) =>
    fetchList(apiBaseURL.SHIFTS, hrmActionType.FETCH_SHIFTS, filter, {}, isLoading);

export const fetchAllShifts = () => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.SHIFTS}?page[size]=0`)
        .then((response) => dispatch({ type: hrmActionType.FETCH_ALL_SHIFTS, payload: response.data.data }))
        .catch(fail(dispatch));

export const saveShift = (id, data) => (dispatch) =>
    (id ? apiConfig.put(`${apiBaseURL.SHIFTS}/${id}`, data) : apiConfig.post(apiBaseURL.SHIFTS, data))
        .then(() => {
            toast(dispatch, id ? "hrm.shift.updated.message" : "hrm.shift.created.message");
            dispatch(fetchAllShifts());
        })
        .catch(fail(dispatch));

export const deleteShift = (id) => (dispatch) =>
    apiConfig
        .delete(`${apiBaseURL.SHIFTS}/${id}`)
        .then(() => {
            toast(dispatch, "hrm.shift.deleted.message");
            dispatch(fetchAllShifts());
        })
        .catch(fail(dispatch));

export const fetchShiftAssignments = (params = {}) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.SHIFT_ASSIGNMENTS}${query(params)}`)
        .then((response) => response.data.data)
        .catch(fail(dispatch));

export const assignShift = (data) => (dispatch) =>
    apiConfig
        .post(apiBaseURL.SHIFT_ASSIGNMENTS, data)
        .then(() => toast(dispatch, "hrm.shift.assigned.message"))
        .catch(fail(dispatch));

export const removeShiftAssignment = (id) => (dispatch) =>
    apiConfig
        .delete(`${apiBaseURL.SHIFT_ASSIGNMENTS}/${id}`)
        .then(() => toast(dispatch, "hrm.shift.assignment-removed.message"))
        .catch(fail(dispatch));

// All active employees as select options (label "EMP-0001 · Name"), filtered client side.
export const fetchActiveEmployeeOptions = () => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.EMPLOYEES}?page[size]=0`)
        .then((response) =>
            response.data.data
                .filter((employee) => employee.attributes.status === "active")
                .map((employee) => ({
                    value: employee.id,
                    label: `${employee.attributes.employee_code} · ${employee.attributes.full_name}`,
                    warehouse_id: employee.attributes.warehouse_id,
                    department_id: employee.attributes.department_id,
                }))
        )
        .catch(fail(dispatch));

// ---------- Holidays ----------
// extra filters: year, month, type, warehouse_id
export const fetchHolidays = (filter = {}, isLoading = true, extra = {}) =>
    fetchList(apiBaseURL.HOLIDAYS, hrmActionType.FETCH_HOLIDAYS, filter, extra, isLoading);

export const saveHoliday = (id, data) => (dispatch) =>
    apiConfig
        .put(`${apiBaseURL.HOLIDAYS}/${id}`, data)
        .then(() => toast(dispatch, "hrm.holiday.updated.message"))
        .catch(fail(dispatch));

export const bulkCreateHolidays = (data) => (dispatch) =>
    apiConfig
        .post(`${apiBaseURL.HOLIDAYS}/bulk`, data)
        .then((response) => toast(dispatch, response.data.message, false))
        .catch(fail(dispatch));

export const deleteHoliday = (id) => (dispatch) =>
    apiConfig
        .delete(`${apiBaseURL.HOLIDAYS}/${id}`)
        .then(() => toast(dispatch, "hrm.holiday.deleted.message"))
        .catch(fail(dispatch));

// ---------- Attendance ----------
export const fetchAttendanceSheet = (params) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.ATTENDANCE_SHEET}${query(params)}`)
        .then((response) => response.data.data)
        .catch(fail(dispatch));

export const saveAttendanceBulk = (data) => (dispatch) =>
    apiConfig
        .post(`${apiBaseURL.ATTENDANCES}/bulk`, data)
        .then((response) => {
            toast(dispatch, "hrm.attendance.saved.message");
            return response.data.data;
        })
        .catch(fail(dispatch));

export const deleteAttendance = (id) => (dispatch) =>
    apiConfig
        .delete(`${apiBaseURL.ATTENDANCES}/${id}`)
        .then(() => toast(dispatch, "hrm.attendance.deleted.message"))
        .catch(fail(dispatch));

export const previewAttendanceImport = (file) => (dispatch) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiConfigFormData
        .post(`${apiBaseURL.ATTENDANCE_IMPORT}/preview`, formData)
        .then((response) => response.data.data)
        .catch(fail(dispatch));
};

export const commitAttendanceImport = (records) => (dispatch) =>
    apiConfig
        .post(`${apiBaseURL.ATTENDANCE_IMPORT}/commit`, { records })
        .then((response) => {
            toast(dispatch, response.data.message, false);
            return response.data.data;
        })
        .catch(fail(dispatch));

export const fetchAttendanceSummary = (employeeId, month) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.ATTENDANCE_SUMMARY}${query({ employee_id: employeeId, month })}`)
        .then((response) => response.data.data)
        .catch(fail(dispatch));

export const fetchDailyAttendanceReport = (params) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.ATTENDANCE_REPORTS}/daily${query(params)}`)
        .then((response) => response.data.data)
        .catch(fail(dispatch));

export const fetchMonthlyAttendanceReport = (params) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.ATTENDANCE_REPORTS}/monthly${query(params)}`)
        .then((response) => response.data.data)
        .catch(fail(dispatch));

export const exportMonthlyAttendance = (params) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.ATTENDANCE_REPORTS}/monthly-excel${query(params)}`)
        .then((response) => {
            window.open(response.data.data.attendance_excel_url, "_blank");
        })
        .catch(fail(dispatch));

// ---------- Self service / POS ----------
export const fetchMyAttendance = (month) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.MY_ATTENDANCE}${query({ month })}`)
        .then((response) => response.data.data)
        .catch((error) => Promise.reject(error));

export const myClockIn = (source) => (dispatch) =>
    apiConfig
        .post(`${apiBaseURL.MY_ATTENDANCE}/clock-in`, source ? { source } : {})
        .then((response) => {
            toast(dispatch, response.data.message, false);
            return response.data.data;
        })
        .catch(fail(dispatch));

export const myClockOut = (source) => (dispatch) =>
    apiConfig
        .post(`${apiBaseURL.MY_ATTENDANCE}/clock-out`, source ? { source } : {})
        .then((response) => {
            toast(dispatch, response.data.message, false);
            return response.data.data;
        })
        .catch(fail(dispatch));
