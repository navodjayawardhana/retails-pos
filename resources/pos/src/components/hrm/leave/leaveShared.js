import React from "react";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";

export const LEAVE_STATUSES = ["pending", "approved", "rejected", "cancelled"];

const STATUS_BADGE = {
    pending: "bg-light-warning",
    approved: "bg-light-success",
    rejected: "bg-light-danger",
    cancelled: "bg-light-dark",
};

export const LeaveStatusBadge = ({ status }) => (
    <span className={`badge ${STATUS_BADGE[status] || "bg-light"}`}>
        {getFormattedMessage(`hrm.leave.status.${status}`)}
    </span>
);

export const leaveStatusOptions = () =>
    LEAVE_STATUSES.map((status) => ({ value: status, label: placeholderText(`hrm.leave.status.${status}`) }));

// Coloured dot + name, colour comes from the leave type
export const LeaveTypeTag = ({ name, color }) => (
    <span className="hrm-leave-tag">
        <span className="hrm-leave-tag__dot" style={{ backgroundColor: color || "#1E3A8A" }} />
        {name}
    </span>
);

// 1 -> "1", 1.5 -> "1.5", null -> "—"
export const formatDays = (value) => {
    if (value === null || value === undefined || value === "") return "—";
    const number = Number(value);
    return Number.isInteger(number) ? String(number) : number.toFixed(1);
};

export const dateRangeLabel = (row) => {
    if (row.is_half_day) {
        return `${row.from_date} · ${placeholderText(`hrm.leave.half.${row.half_session || "first"}`)}`;
    }
    return row.from_date === row.to_date ? row.from_date : `${row.from_date} → ${row.to_date}`;
};

export const yearOptions = () => {
    const year = new Date().getFullYear();
    return [year - 1, year, year + 1].map((y) => ({ value: y, label: String(y) }));
};

// Balance cards (My Leave, employee Leave tab). `balances` from the API.
export const LeaveBalanceCards = ({ balances }) => {
    if (!balances || balances.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state__text">{getFormattedMessage("hrm.leave.no-types")}</div>
            </div>
        );
    }
    return (
        <div className="hrm-leave-balances">
            {balances.map((item) => (
                <div className="hrm-leave-balance" key={item.leave_type_id} style={{ borderTopColor: item.color }}>
                    <div className="hrm-leave-balance__name">
                        <LeaveTypeTag name={item.name} color={item.color} />
                        {!item.is_paid && <span className="badge bg-light-danger ms-2">{getFormattedMessage("hrm.leave.unpaid")}</span>}
                    </div>
                    <div className="hrm-leave-balance__value">
                        {item.is_unlimited ? formatDays(item.used) : formatDays(item.balance)}
                        <span>{getFormattedMessage(item.is_unlimited ? "hrm.leave.days-used" : "hrm.leave.days-left")}</span>
                    </div>
                    {!item.is_unlimited && (
                        <div className="hrm-leave-balance__meta">
                            {getFormattedMessage("hrm.leave.entitled")}: {formatDays(item.entitled)}
                            {Number(item.carried_forward) > 0 && ` (+${formatDays(item.carried_forward)} ${placeholderText("hrm.leave.carried")})`}
                            {" · "}
                            {getFormattedMessage("hrm.leave.used")}: {formatDays(item.used)}
                            {Number(item.pending) > 0 && ` · ${placeholderText("hrm.leave.pending")}: ${formatDays(item.pending)}`}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

// Simple list of requests (My Leave, employee Leave tab)
export const LeaveRequestTable = ({ requests, renderActions }) => {
    if (!requests || requests.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state__text">{getFormattedMessage("hrm.leave.no-requests")}</div>
            </div>
        );
    }
    return (
        <div className="table-responsive">
            <table className="table hrm-simple-table mb-0">
                <thead>
                    <tr>
                        <th>{getFormattedMessage("hrm.leave-type.title")}</th>
                        <th>{getFormattedMessage("hrm.leave.dates")}</th>
                        <th>{getFormattedMessage("hrm.leave.days")}</th>
                        <th>{getFormattedMessage("globally.detail.status")}</th>
                        <th>{getFormattedMessage("hrm.leave.reason")}</th>
                        {renderActions && <th />}
                    </tr>
                </thead>
                <tbody>
                    {requests.map((row) => (
                        <tr key={row.id}>
                            <td><LeaveTypeTag name={row.leave_type_name} color={row.leave_type_color} /></td>
                            <td className="text-nowrap">{dateRangeLabel(row)}</td>
                            <td>{formatDays(row.days)}</td>
                            <td>
                                <LeaveStatusBadge status={row.status} />
                                {row.remarks && <div className="hrm-form-hint mt-1">{row.remarks}</div>}
                            </td>
                            <td className="text-gray-600">{row.reason || "—"}</td>
                            {renderActions && <td className="text-end">{renderActions(row)}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
