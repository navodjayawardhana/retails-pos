import apiConfig from "../../../config/apiConfig";
import apiConfigFormData from "../../../config/apiConfigWthFormData";
import { apiBaseURL, hrmActionType, toastType } from "../../../constants";
import requestParam from "../../../shared/requestParam";
import { addToast } from "../toastAction";
import { setTotalRecord } from "../totalRecordAction";
import { setLoading } from "../loadingAction";
import { setSavingButton } from "../saveButtonAction";
import { getFormattedMessage } from "../../../shared/sharedMethod";

const errorToast = (dispatch) => (error) => {
    const message =
        error && error.response && error.response.data
            ? error.response.data.message
            : "Something went wrong";
    dispatch(addToast({ text: message, type: toastType.ERROR }));
};

const successToast = (dispatch, key) =>
    dispatch(addToast({ text: getFormattedMessage(key) }));

const buildListUrl = (base, filter, extra = {}) => {
    let url = base;
    if (!_.isEmpty(filter)) {
        url += requestParam(filter, null, null, null, url);
    }
    const params = Object.entries(extra)
        .filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== "0")
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
    if (params.length) {
        url += (url.includes("?") ? "&" : "?") + params.join("&");
    }
    return url;
};

const fetchPaginated = (base, type, filter, extra, isLoading) => (dispatch) => {
    if (isLoading) dispatch(setLoading(true));
    return apiConfig
        .get(buildListUrl(base, filter, extra))
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
        .catch(errorToast(dispatch))
        .finally(() => isLoading && dispatch(setLoading(false)));
};

// ---------- Departments ----------
export const fetchDepartments = (filter = {}, isLoading = true) =>
    fetchPaginated(apiBaseURL.DEPARTMENTS, hrmActionType.FETCH_DEPARTMENTS, filter, {}, isLoading);

export const fetchAllDepartments = () => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.DEPARTMENTS}?page[size]=0`)
        .then((response) =>
            dispatch({ type: hrmActionType.FETCH_ALL_DEPARTMENTS, payload: response.data.data })
        )
        .catch(errorToast(dispatch));

export const saveDepartment = (id, data, onDone) => (dispatch) =>
    (id
        ? apiConfig.put(`${apiBaseURL.DEPARTMENTS}/${id}`, data)
        : apiConfig.post(apiBaseURL.DEPARTMENTS, data)
    )
        .then(() => {
            successToast(dispatch, id ? "hrm.department.updated.message" : "hrm.department.created.message");
            dispatch(fetchAllDepartments());
            onDone && onDone();
        })
        .catch(errorToast(dispatch));

export const deleteDepartment = (id, onDone) => (dispatch) =>
    apiConfig
        .delete(`${apiBaseURL.DEPARTMENTS}/${id}`)
        .then(() => {
            successToast(dispatch, "hrm.department.deleted.message");
            dispatch(fetchAllDepartments());
            onDone && onDone();
        })
        .catch(errorToast(dispatch));

// ---------- Designations ----------
export const fetchDesignations = (filter = {}, isLoading = true, extra = {}) =>
    fetchPaginated(apiBaseURL.DESIGNATIONS, hrmActionType.FETCH_DESIGNATIONS, filter, extra, isLoading);

export const fetchAllDesignations = () => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.DESIGNATIONS}?page[size]=0`)
        .then((response) =>
            dispatch({ type: hrmActionType.FETCH_ALL_DESIGNATIONS, payload: response.data.data })
        )
        .catch(errorToast(dispatch));

export const saveDesignation = (id, data, onDone) => (dispatch) =>
    (id
        ? apiConfig.put(`${apiBaseURL.DESIGNATIONS}/${id}`, data)
        : apiConfig.post(apiBaseURL.DESIGNATIONS, data)
    )
        .then(() => {
            successToast(dispatch, id ? "hrm.designation.updated.message" : "hrm.designation.created.message");
            dispatch(fetchAllDesignations());
            onDone && onDone();
        })
        .catch(errorToast(dispatch));

export const deleteDesignation = (id, onDone) => (dispatch) =>
    apiConfig
        .delete(`${apiBaseURL.DESIGNATIONS}/${id}`)
        .then(() => {
            successToast(dispatch, "hrm.designation.deleted.message");
            dispatch(fetchAllDesignations());
            onDone && onDone();
        })
        .catch(errorToast(dispatch));

// ---------- Employees ----------
// extra filters: department_id, designation_id, warehouse_id (branch), status
export const fetchEmployees = (filter = {}, isLoading = true, extra = {}) =>
    fetchPaginated(apiBaseURL.EMPLOYEES, hrmActionType.FETCH_EMPLOYEES, filter, extra, isLoading);

export const fetchEmployee = (id) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.EMPLOYEES}/${id}`)
        .then((response) =>
            dispatch({ type: hrmActionType.FETCH_EMPLOYEE, payload: response.data.data })
        )
        .catch(errorToast(dispatch));

export const clearEmployee = () => ({ type: hrmActionType.FETCH_EMPLOYEE, payload: null });

export const saveEmployee = (id, formData, navigate) => (dispatch) => {
    dispatch(setSavingButton(true));
    return apiConfigFormData
        .post(id ? `${apiBaseURL.EMPLOYEES}/${id}` : apiBaseURL.EMPLOYEES, formData)
        .then((response) => {
            successToast(dispatch, id ? "hrm.employee.updated.message" : "hrm.employee.created.message");
            navigate && navigate(`/app/employees/detail/${response.data.data.id}`);
        })
        .catch(errorToast(dispatch))
        .finally(() => dispatch(setSavingButton(false)));
};

export const deleteEmployee = (id, onDone) => (dispatch) =>
    apiConfig
        .delete(`${apiBaseURL.EMPLOYEES}/${id}`)
        .then(() => {
            successToast(dispatch, "hrm.employee.deleted.message");
            onDone && onDone();
        })
        .catch(errorToast(dispatch));

export const uploadEmployeeDocument = (id, formData) => (dispatch) =>
    apiConfigFormData
        .post(`${apiBaseURL.EMPLOYEES}/${id}/documents`, formData)
        .then((response) => {
            dispatch({ type: hrmActionType.FETCH_EMPLOYEE, payload: response.data.data });
            successToast(dispatch, "hrm.document.uploaded.message");
        })
        .catch(errorToast(dispatch));

export const deleteEmployeeDocument = (id, mediaId) => (dispatch) =>
    apiConfig
        .delete(`${apiBaseURL.EMPLOYEES}/${id}/documents/${mediaId}`)
        .then(() => {
            successToast(dispatch, "hrm.document.deleted.message");
            dispatch(fetchEmployee(id));
        })
        .catch(errorToast(dispatch));

export const unlinkEmployeeUser = (id) => (dispatch) =>
    apiConfig
        .post(`${apiBaseURL.EMPLOYEES}/${id}/unlink-user`)
        .then((response) => {
            dispatch({ type: hrmActionType.FETCH_EMPLOYEE, payload: response.data.data });
            successToast(dispatch, "hrm.employee.login-unlinked.message");
        })
        .catch(errorToast(dispatch));

export const fetchEmployeeAvailableUsers = (employeeId) => (dispatch) =>
    apiConfig
        .get(
            apiBaseURL.EMPLOYEE_AVAILABLE_USERS +
                (employeeId ? `?employee_id=${employeeId}` : "")
        )
        .then((response) =>
            dispatch({
                type: hrmActionType.FETCH_EMPLOYEE_AVAILABLE_USERS,
                payload: response.data.data,
            })
        )
        .catch(errorToast(dispatch));

// ---------- HR settings ----------
export const fetchHrSettings = () => (dispatch) =>
    apiConfig
        .get(apiBaseURL.HR_SETTINGS)
        .then((response) =>
            dispatch({ type: hrmActionType.FETCH_HR_SETTINGS, payload: response.data.data })
        )
        .catch(errorToast(dispatch));

export const saveHrSettings = (settings) => (dispatch) => {
    dispatch(setSavingButton(true));
    return apiConfig
        .post(apiBaseURL.HR_SETTINGS, settings)
        .then((response) => {
            dispatch({ type: hrmActionType.FETCH_HR_SETTINGS, payload: response.data.data });
            successToast(dispatch, "hrm.settings.saved.message");
        })
        .catch(errorToast(dispatch))
        .finally(() => dispatch(setSavingButton(false)));
};
