import {smsApiActionType} from '../../constants';

export default (state = {}, action) => {
    switch (action.type) {
        case smsApiActionType.FETCH_SMS_SETTINGS:
        case smsApiActionType.EDIT_SMS_SETTING:
            return action.payload;
        default:
            return state;
    }
};

export const smsLogsReducer = (state = [], action) => {
    switch (action.type) {
        case smsApiActionType.FETCH_SMS_LOGS:
            return action.payload;
        default:
            return state;
    }
};
