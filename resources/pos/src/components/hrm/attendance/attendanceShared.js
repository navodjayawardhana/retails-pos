import React from "react";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";

export const ATTENDANCE_STATUSES = ["present", "late", "half_day", "absent", "leave", "holiday", "weekend"];

const BADGE_CLASS = {
    present: "bg-light-success",
    late: "bg-light-warning",
    half_day: "bg-light-info",
    absent: "bg-light-danger",
    leave: "bg-light-primary",
    holiday: "bg-light-dark",
    weekend: "bg-light-dark",
    unmarked: "bg-light",
};

export const AttendanceStatusBadge = ({ status }) =>
    status ? (
        <span className={`badge ${BADGE_CLASS[status] || "bg-light"}`}>
            {getFormattedMessage(`hrm.attendance.status.${status}`)}
        </span>
    ) : (
        <span className="text-gray-500">—</span>
    );

export const statusOptions = (withUnmarked = false) =>
    (withUnmarked ? ["unmarked", ...ATTENDANCE_STATUSES] : ATTENDANCE_STATUSES).map((status) => ({
        value: status,
        label: placeholderText(`hrm.attendance.status.${status}`),
    }));

// 95 -> "1h 35m", 0 -> "—"
export const formatMinutes = (minutes) => {
    const value = Number(minutes) || 0;
    if (value <= 0) return "—";
    const hours = Math.floor(value / 60);
    const rest = value % 60;
    if (!hours) return `${rest}m`;
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

export const todayString = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const currentMonthString = () => todayString().slice(0, 7);

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

// weekday names are the phase-1 keys hrm.day.0 (Sunday) .. hrm.day.6
export const weekdayLabel = (day) => placeholderText(`hrm.day.${day}`);

// Summary chips used by My Attendance and the employee Attendance tab
export const AttendanceSummaryChips = ({ summary }) => {
    if (!summary) return null;
    const chips = [
        ["present", summary.present],
        ["late", summary.late],
        ["half_day", summary.half_day],
        ["absent", summary.absent],
        ["leave", summary.leave],
        ["holiday", summary.holiday],
        ["unmarked", summary.unmarked],
    ];
    return (
        <div className="hrm-att-chips">
            {chips.map(([key, value]) => (
                <div className={`hrm-att-chip hrm-att-chip--${key}`} key={key}>
                    <span className="hrm-att-chip__value">{value || 0}</span>
                    <span className="hrm-att-chip__label">{getFormattedMessage(`hrm.attendance.status.${key}`)}</span>
                </div>
            ))}
            <div className="hrm-att-chip hrm-att-chip--ot">
                <span className="hrm-att-chip__value">{formatMinutes(summary.ot_minutes)}</span>
                <span className="hrm-att-chip__label">{getFormattedMessage("hrm.attendance.ot")}</span>
            </div>
        </div>
    );
};
