import apiConfig from "../../../config/apiConfig";
import apiConfigFormData from "../../../config/apiConfigWthFormData";
import { apiBaseURL, hrmActionType, toastType } from "../../../constants";
import requestParam from "../../../shared/requestParam";
import { addToast } from "../toastAction";
import { setTotalRecord } from "../totalRecordAction";
import { setLoading } from "../loadingAction";
import { getFormattedMessage } from "../../../shared/sharedMethod";

// HRM phase 3: leave. Thunks for one-off screens return a promise that resolves with the
// response data (or rejects after showing the error toast).

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

const toFormData = (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        if (typeof value === "boolean") {
            formData.append(key, value ? "1" : "0");
        } else {
            formData.append(key, value);
        }
    });
    return formData;
};

// ---------- Leave types ----------
export const fetchLeaveTypes = (filter = {}, isLoading = true) =>
    fetchList(apiBaseURL.LEAVE_TYPES, hrmActionType.FETCH_LEAVE_TYPES, filter, {}, isLoading);

export const fetchAllLeaveTypes = () => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.LEAVE_TYPES}?page[size]=0`)
        .then((response) => dispatch({ type: hrmActionType.FETCH_ALL_LEAVE_TYPES, payload: response.data.data }))
        .catch(fail(dispatch));

export const saveLeaveType = (id, data) => (dispatch) =>
    (id ? apiConfig.put(`${apiBaseURL.LEAVE_TYPES}/${id}`, data) : apiConfig.post(apiBaseURL.LEAVE_TYPES, data))
        .then(() => {
            toastKey(dispatch, id ? "hrm.leave-type.updated.message" : "hrm.leave-type.created.message");
            dispatch(fetchAllLeaveTypes());
        })
        .catch(fail(dispatch));

export const deleteLeaveType = (id) => (dispatch) =>
    apiConfig
        .delete(`${apiBaseURL.LEAVE_TYPES}/${id}`)
        .then(() => {
            toastKey(dispatch, "hrm.leave-type.deleted.message");
            dispatch(fetchAllLeaveTypes());
        })
        .catch(fail(dispatch));

// ---------- Leave requests ----------
// extra filters: status, leave_type_id, employee_id, warehouse_id, department_id, date_from, date_to
export const fetchLeaveRequests = (filter = {}, isLoading = true, extra = {}) =>
    fetchList(apiBaseURL.LEAVE_REQUESTS, hrmActionType.FETCH_LEAVE_REQUESTS, filter, extra, isLoading);

export const applyLeave = (data, isSelf = false) => (dispatch) =>
    apiConfigFormData
        .post(isSelf ? apiBaseURL.MY_LEAVE : apiBaseURL.LEAVE_REQUESTS, toFormData(data))
        .then((response) => {
            toastKey(dispatch, isSelf ? "hrm.leave.sent.message" : "hrm.leave.saved.message");
            return response.data;
        })
        .catch(fail(dispatch));

export const previewLeave = (params, isSelf = false) => () =>
    apiConfig
        .get(`${isSelf ? `${apiBaseURL.MY_LEAVE}/preview` : apiBaseURL.LEAVE_PREVIEW}${query(params)}`)
        .then((response) => response.data.data)
        .catch(() => null);

const leaveAction = (action, id, remarks) => (dispatch) =>
    apiConfig
        .post(`${apiBaseURL.LEAVE_REQUESTS}/${id}/${action}`, { remarks })
        .then((response) => {
            toastText(dispatch, response.data.message);
            return response.data.data;
        })
        .catch(fail(dispatch));

export const approveLeave = (id, remarks) => leaveAction("approve", id, remarks);
export const rejectLeave = (id, remarks) => leaveAction("reject", id, remarks);
export const cancelLeave = (id, remarks) => leaveAction("cancel", id, remarks);

export const deleteLeaveRequest = (id) => (dispatch) =>
    apiConfig
        .delete(`${apiBaseURL.LEAVE_REQUESTS}/${id}`)
        .then(() => toastKey(dispatch, "hrm.leave.deleted.message"))
        .catch(fail(dispatch));

// ---------- Entitlements / balances ----------
export const fetchLeaveEntitlements = (employeeId, year) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.LEAVE_ENTITLEMENTS}${query({ employee_id: employeeId, year })}`)
        .then((response) => response.data.data)
        .catch(fail(dispatch));

export const saveLeaveEntitlements = (data) => (dispatch) =>
    apiConfig
        .post(apiBaseURL.LEAVE_ENTITLEMENTS, data)
        .then((response) => {
            toastKey(dispatch, "hrm.leave.entitlements-saved.message");
            return response.data.data;
        })
        .catch(fail(dispatch));

export const initialiseLeaveYear = (data) => (dispatch) =>
    apiConfig
        .post(`${apiBaseURL.LEAVE_ENTITLEMENTS}/initialise`, data)
        .then((response) => {
            toastText(dispatch, response.data.message);
            return response.data.data;
        })
        .catch(fail(dispatch));

// ---------- Calendar / reports ----------
export const fetchLeaveCalendar = (params) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.LEAVE_CALENDAR}${query(params)}`)
        .then((response) => response.data.data)
        .catch(fail(dispatch));

export const fetchLeaveBalanceReport = (params) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.LEAVE_REPORTS}/balances${query(params)}`)
        .then((response) => response.data.data)
        .catch(fail(dispatch));

export const exportLeaveBalances = (params) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.LEAVE_REPORTS}/balances-excel${query(params)}`)
        .then((response) => {
            window.open(response.data.data.leave_excel_url, "_blank");
        })
        .catch(fail(dispatch));

export const exportLeaveBalancesPdf = (params) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.LEAVE_REPORTS}/balances-pdf${query(params)}`)
        .then((response) => {
            window.open(response.data.data.leave_pdf_url, "_blank");
        })
        .catch(fail(dispatch));

// ---------- Self service ----------
export const fetchMyLeave = (year) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.MY_LEAVE}${query({ year })}`)
        .then((response) => response.data.data)
        .catch(fail(dispatch));

export const cancelMyLeave = (id) => (dispatch) =>
    apiConfig
        .post(`${apiBaseURL.MY_LEAVE}/${id}/cancel`)
        .then((response) => {
            toastText(dispatch, response.data.message);
            return response.data.data;
        })
        .catch(fail(dispatch));
