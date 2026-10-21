import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { FiLogIn, FiLogOut, FiClock } from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { fetchMyAttendance, myClockIn, myClockOut } from "../../../store/action/hrm/attendanceActions";
import AttendanceMonthView from "./AttendanceMonthView";
import { AttendanceStatusBadge, currentMonthString } from "./attendanceShared";

const MyAttendance = ({ fetchMyAttendance, myClockIn, myClockOut }) => {
    const [month, setMonth] = useState(currentMonthString());
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const load = (target = month) => {
        setLoading(true);
        fetchMyAttendance(target)
            .then((result) => {
                setData(result);
                setError("");
            })
            .catch((err) => setError(err?.response?.data?.message || "Something went wrong"))
            .finally(() => setLoading(false));
    };

    useEffect(() => load(month), [month]);

    const clock = (action) => {
        setBusy(true);
        action()
            .then(() => load())
            .catch(() => {})
            .finally(() => setBusy(false));
    };

    const today = data && data.today;

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.my-attendance.title")} />
            {error ? (
                <div className="card">
                    <div className="empty-state">
                        <span className="empty-state__icon"><FiClock /></span>
                        <div className="empty-state__text">{error}</div>
                    </div>
                </div>
            ) : (
                <>
                    {data && (
                        <div className="card hrm-clock-card mb-5">
                            <div className="hrm-clock-card__body">
                                <div>
                                    <div className="hrm-clock-card__name">{data.employee.full_name}</div>
                                    <div className="text-gray-600">{data.employee.employee_code}</div>
                                </div>
                                <div className="hrm-clock-card__today">
                                    <span className="text-gray-600">{getFormattedMessage("hrm.attendance.today")}</span>
                                    {today ? (
                                        <span>
                                            <AttendanceStatusBadge status={today.status} />
                                            <span className="ms-2">{today.clock_in || "—"} → {today.clock_out || "—"}</span>
                                        </span>
                                    ) : data.today_schedule.holiday ? (
                                        <span className="badge bg-light-dark">{data.today_schedule.holiday}</span>
                                    ) : (
                                        <span>{getFormattedMessage("hrm.attendance.not-clocked-in")}</span>
                                    )}
                                </div>
                                {data.can_self_clock && (
                                    <div className="hrm-clock-card__actions">
                                        <button type="button" className="btn btn-primary" disabled={busy || (today && today.clock_in)}
                                            onClick={() => clock(() => myClockIn())}>
                                            <FiLogIn /> {getFormattedMessage("hrm.attendance.clock-in")}
                                        </button>
                                        <button type="button" className="btn btn-outline-secondary" disabled={busy || !today || !today.clock_in || today.clock_out}
                                            onClick={() => clock(() => myClockOut())}>
                                            <FiLogOut /> {getFormattedMessage("hrm.attendance.clock-out")}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="card">
                        <div className="card-body">
                            <AttendanceMonthView data={data} month={month} onMonthChange={setMonth} loading={loading} />
                        </div>
                    </div>
                </>
            )}
        </MasterLayout>
    );
};

export default connect(null, { fetchMyAttendance, myClockIn, myClockOut })(MyAttendance);
