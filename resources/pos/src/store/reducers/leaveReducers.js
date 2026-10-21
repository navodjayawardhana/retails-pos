import { hrmActionType } from "../../constants";

const listReducer = (fetchType) => (state = [], action) =>
    action.type === fetchType ? action.payload : state;

export const leaveTypesReducer = listReducer(hrmActionType.FETCH_LEAVE_TYPES);
export const allLeaveTypesReducer = listReducer(hrmActionType.FETCH_ALL_LEAVE_TYPES);
export const leaveRequestsReducer = listReducer(hrmActionType.FETCH_LEAVE_REQUESTS);
