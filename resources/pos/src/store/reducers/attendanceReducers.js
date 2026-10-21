import { hrmActionType } from "../../constants";

const listReducer = (fetchType) => (state = [], action) =>
    action.type === fetchType ? action.payload : state;

export const shiftsReducer = listReducer(hrmActionType.FETCH_SHIFTS);
export const allShiftsReducer = listReducer(hrmActionType.FETCH_ALL_SHIFTS);
export const holidaysReducer = listReducer(hrmActionType.FETCH_HOLIDAYS);
