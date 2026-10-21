import _ from 'lodash';
import apiConfig from '../../config/apiConfig';
import { apiBaseURL, toastType, smsApiActionType } from '../../constants';
import { getFormattedMessage } from '../../shared/sharedMethod';
import requestParam from '../../shared/requestParam';
import { addToast } from './toastAction';
import { setTotalRecord } from './totalRecordAction';
import { setLoading } from './loadingAction';

const errorText = (error) =>
    (error && error.response && error.response.data && error.response.data.message) || 'Something went wrong';

export const fetchSmsApiSetting = () => async (dispatch) => {
    await apiConfig.get(apiBaseURL.SMS_SETTING)
        .then((response) => {
            dispatch({ type: smsApiActionType.FETCH_SMS_SETTINGS, payload: response.data.data });
        })
        .catch((error) => {
            dispatch(addToast({ text: errorText(error), type: toastType.ERROR }));
        });
};

// resolves true on success so the page can reset its dirty state
export const updateSmsApiSetting = (smsData) => async (dispatch) =>
    apiConfig.post(apiBaseURL.SMS_SETTING, smsData)
        .then((response) => {
            dispatch({ type: smsApiActionType.EDIT_SMS_SETTING, payload: response.data.data });
            dispatch(addToast({ text: getFormattedMessage('sms.api.update.success.message') }));
            return true;
        })
        .catch((error) => {
            dispatch(addToast({ text: errorText(error), type: toastType.ERROR }));
            return false;
        });

// test + balance results are shown inline on the page, so return them instead of toasting
export const sendTestSms = (data) => async () =>
    apiConfig.post(apiBaseURL.SMS_SETTING_TEST, data)
        .then((response) => response.data)
        .catch((error) => ({ success: false, message: errorText(error) }));

export const checkSmsBalance = () => async () =>
    apiConfig.get(apiBaseURL.SMS_SETTING_BALANCE)
        .then((response) => response.data)
        .catch((error) => ({ success: false, message: errorText(error) }));

export const fetchSmsLogs = (filter = {}, isLoading = true, status = '') => async (dispatch) => {
    if (isLoading) dispatch(setLoading(true));
    let url = apiBaseURL.SMS_LOGS;
    if (!_.isEmpty(filter)) {
        url += requestParam(filter, null, null, null, url);
    }
    if (status) {
        url += (url.includes('?') ? '&' : '?') + 'log_status=' + encodeURIComponent(status);
    }
    await apiConfig.get(url)
        .then((response) => {
            dispatch({ type: smsApiActionType.FETCH_SMS_LOGS, payload: response.data.data });
            dispatch(setTotalRecord(response.data.meta ? response.data.meta.total : response.data.data.length));
        })
        .catch((error) => dispatch(addToast({ text: errorText(error), type: toastType.ERROR })))
        .finally(() => isLoading && dispatch(setLoading(false)));
};
