import React from "react";
import { getFormattedMessage } from "../../../shared/sharedMethod";
import { AttendanceStatusBadge, AttendanceSummaryChips, formatMinutes } from "./attendanceShared";

// Month header (picker + current shift), summary chips and the record list.
// `data` is the payload of GET attendance-summary / my-attendance.
const AttendanceMonthView = ({ data, month, onMonthChange, loading }) => (
    <div className="hrm-att-month">
        <div className="hrm-att-month__head">
            <input type="month" className="form-control hrm-filter-bar__date" value={month}
                onChange={(e) => e.target.value && onMonthChange(e.target.value)} />
            {data && (
                <span className="hrm-att-month__shift">
                    {data.current_shift
                        ? `${getFormattedMessage("hrm.shift.title")}: ${data.current_shift.shift_name} (${data.current_shift.start_time}–${data.current_shift.end_time})`
                        : `${getFormattedMessage("hrm.attendance.working-hours")}: ${data.today_schedule.start}–${data.today_schedule.end}`}
                </span>
            )}
        </div>
        {loading || !data ? (
            <div className="empty-state"><div className="empty-state__text">{getFormattedMessage("globally.loading.label")}</div></div>
        ) : (
            <>
                <AttendanceSummaryChips summary={data.summary} />
                {data.records.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state__text">{getFormattedMessage("hrm.attendance.no-records")}</div>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table hrm-simple-table mb-0">
                            <thead>
                                <tr>
                                    <th>{getFormattedMessage("hrm.holiday.date.label")}</th>
                                    <th>{getFormattedMessage("globally.detail.status")}</th>
                                    <th>{getFormattedMessage("hrm.attendance.in")}</th>
                                    <th>{getFormattedMessage("hrm.attendance.out")}</th>
                                    <th>{getFormattedMessage("hrm.attendance.worked")}</th>
                                    <th>{getFormattedMessage("hrm.attendance.late")}</th>
                                    <th>{getFormattedMessage("hrm.attendance.ot")}</th>
                                    <th>{getFormattedMessage("hrm.attendance.source")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.records.map((record) => (
                                    <tr key={record.id}>
                                        <td className="text-nowrap">{record.date}</td>
                                        <td><AttendanceStatusBadge status={record.status} /></td>
                                        <td>{record.clock_in || "—"}</td>
                                        <td>{record.clock_out || "—"}</td>
                                        <td>{formatMinutes(record.worked_minutes)}</td>
                                        <td>{formatMinutes(record.late_minutes)}</td>
                                        <td>{formatMinutes(record.ot_minutes)}</td>
                                        <td className="text-gray-600">{getFormattedMessage(`hrm.attendance.source.${record.source}`)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </>
        )}
    </div>
);

export default AttendanceMonthView;
