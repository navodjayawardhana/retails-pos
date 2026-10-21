import apiConfig from "../../../config/apiConfig";
import { apiBaseURL, toastType } from "../../../constants";
import { addToast } from "../toastAction";

// HRM phase 5: HR dashboard data (returns a promise with the response data).
export const fetchHrDashboard = (warehouseId) => (dispatch) =>
    apiConfig
        .get(`${apiBaseURL.HR_DASHBOARD}${warehouseId ? `?warehouse_id=${warehouseId}` : ""}`)
        .then((response) => response.data.data)
        .catch((error) => {
            const message =
                error && error.response && error.response.data && error.response.data.message
                    ? error.response.data.message
                    : "Something went wrong";
            dispatch(addToast({ text: message, type: toastType.ERROR }));
            return Promise.reject(error);
        });
