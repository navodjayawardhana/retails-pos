import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import Select from "react-select";
import { FiDownload, FiFileText } from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { fetchAllDepartments } from "../../../store/action/hrm/hrmActions";
import { fetchAllWarehouses } from "../../../store/action/warehouseAction";
import {
    fetchDailyAttendanceReport,
    fetchMonthlyAttendanceReport,
    exportMonthlyAttendance,
    exportAttendancePdf,
} from "../../../store/action/hrm/attendanceActions";
import { AttendanceStatusBadge, currentMonthString, formatMinutes, todayString } from "./attendanceShared";
import ReportOverview from "../../../shared/report-overview/ReportOverview";

const filterStyles = {
    container: (base) => ({ ...base, minWidth: 190 }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const CODE_CLASS = { P: "p", L: "l", HD: "hd", A: "a", LV: "lv", H: "h", W: "w", "-": "u" };

const AttendanceReports = (props) => {
    const { warehouses, allDepartments, fetchAllWarehouses, fetchAllDepartments, fetchDailyAttendanceReport, fetchMonthlyAttendanceReport, exportMonthlyAttendance, exportAttendancePdf } = props;
    const [tab, setTab] = useState("daily");
    const [date, setDate] = useState(todayString());
    const [month, setMonth] = useState(currentMonthString());
    const [branch, setBranch] = useState(null);
    const [department, setDepartment] = useState(null);
    const [daily, setDaily] = useState(null);
    const [monthly, setMonthly] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAllWarehouses();
        fetchAllDepartments();
    }, []);

    const filters = () => ({
        warehouse_id: branch ? branch.value : undefined,
        department_id: department ? department.value : undefined,
    });

    useEffect(() => {
        setLoading(true);
        const request = tab === "daily"
            ? fetchDailyAttendanceReport({ date, ...filters() }).then(setDaily)
            : fetchMonthlyAttendanceReport({ month, ...filters() }).then(setMonthly);
        request.catch(() => {}).finally(() => setLoading(false));
    }, [tab, date, month, branch, department]);

    const toOptions = (list) => (list || []).map((item) => ({ value: item.id, label: item.attributes.name }));
    const counts = (daily && daily.counts) || {};

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.attendance-reports.title")} />
            <div className="hrm-tabs mb-4">
                {["daily", "monthly"].map((key) => (
                    <button type="button" key={key} className={`hrm-tabs__tab ${tab === key ? "hrm-tabs__tab--active" : ""}`} onClick={() => setTab(key)}>
                        {getFormattedMessage(`hrm.attendance-reports.${key}`)}
                    </button>
                ))}
            </div>
            <div className="hrm-filter-bar">
                {tab === "daily" ? (
                    <input type="date" className="form-control hrm-filter-bar__date" value={date} onChange={(e) => setDate(e.target.value || todayString())} />
                ) : (
                    <input type="month" className="form-control hrm-filter-bar__date" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
                )}
                <Select isClearable options={toOptions(warehouses)} styles={filterStyles} menuPortalTarget={document.body}
                    value={branch} placeholder={placeholderText("hrm.branch.all")} onChange={setBranch} />
                <Select isClearable options={toOptions(allDepartments)} styles={filterStyles} menuPortalTarget={document.body}
                    value={department} placeholder={placeholderText("hrm.department.all")} onChange={setDepartment} />
                <div className="hrm-filter-bar__actions">
                    {tab === "monthly" && (
                        <button type="button" className="btn btn-outline-secondary table-toolbar__btn"
                            onClick={() => exportMonthlyAttendance({ month, ...filters() }).catch(() => {})}>
                            <FiDownload /> {getFormattedMessage("excel.btn.label")}
                        </button>
                    )}
                    <button type="button" className="btn btn-outline-secondary table-toolbar__btn"
                        onClick={() => exportAttendancePdf(tab, tab === "daily" ? { date, ...filters() } : { month, ...filters() }).catch(() => {})}>
                        <FiFileText /> {getFormattedMessage("pdf.btn.label")}
                    </button>
                </div>
            </div>
            <ReportOverview type="attendance" params={{ month: tab === "daily" ? (date || "").slice(0, 7) : month, warehouse_id: branch ? branch.value : undefined, department_id: department ? department.value : undefined }} />

            <div className="card">
                <div className="card-body">
                    {loading ? (
                        <div className="empty-state"><div className="empty-state__text">{getFormattedMessage("globally.loading.label")}</div></div>
                    ) : tab === "daily" ? (
                        daily && daily.rows.length ? (
                            <>
                                <div className="hrm-att-chips mb-4">
                                    {["present", "late", "half_day", "absent", "leave", "holiday", "weekend", "unmarked"].map((key) => (
                                        <div className={`hrm-att-chip hrm-att-chip--${key}`} key={key}>
                                            <span className="hrm-att-chip__value">{counts[key] || 0}</span>
                                            <span className="hrm-att-chip__label">{getFormattedMessage(`hrm.attendance.status.${key}`)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="table-responsive">
                                    <table className="table hrm-simple-table mb-0">
                                        <thead>
                                            <tr>
                                                <th>{getFormattedMessage("hrm.employee.title")}</th>
                                                <th>{getFormattedMessage("hrm.branch.label")}</th>
                                                <th>{getFormattedMessage("hrm.department.title")}</th>
                                                <th>{getFormattedMessage("hrm.attendance.expected")}</th>
                                                <th>{getFormattedMessage("globally.detail.status")}</th>
                                                <th>{getFormattedMessage("hrm.attendance.in")}</th>
                                                <th>{getFormattedMessage("hrm.attendance.out")}</th>
                                                <th>{getFormattedMessage("hrm.attendance.late")}</th>
                                                <th>{getFormattedMessage("hrm.attendance.ot")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {daily.rows.map((row) => (
                                                <tr key={row.employee_id}>
                                                    <td><span className="fw-500">{row.employee_name}</span> <span className="text-gray-600">{row.employee_code}</span></td>
                                                    <td>{row.branch_name || "—"}</td>
                                                    <td>{row.department_name || "—"}</td>
                                                    <td className="text-nowrap">{row.expected_start}–{row.expected_end}</td>
                                                    <td><AttendanceStatusBadge status={row.status} /></td>
                                                    <td>{row.clock_in || "—"}</td>
                                                    <td>{row.clock_out || "—"}</td>
                                                    <td>{formatMinutes(row.late_minutes)}</td>
                                                    <td>{formatMinutes(row.ot_minutes)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="empty-state"><div className="empty-state__text">{getFormattedMessage("hrm.attendance.no-employees")}</div></div>
                        )
                    ) : monthly && monthly.rows.length ? (
                        <>
                            <div className="table-responsive hrm-month-sheet">
                                <table className="table mb-0">
                                    <thead>
                                        <tr>
                                            <th className="hrm-month-sheet__sticky">{getFormattedMessage("hrm.employee.title")}</th>
                                            {monthly.days.map((day) => (
                                                <th key={day.day} className={`text-center ${day.weekday === "Sun" ? "is-sunday" : ""}`}>
                                                    <div>{day.day}</div>
                                                    <div className="hrm-month-sheet__wd">{day.weekday.slice(0, 2)}</div>
                                                </th>
                                            ))}
                                            <th className="text-center">P</th>
                                            <th className="text-center">L</th>
                                            <th className="text-center">HD</th>
                                            <th className="text-center">A</th>
                                            <th className="text-center">LV</th>
                                            <th className="text-center">{getFormattedMessage("hrm.attendance.ot")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthly.rows.map((row) => (
                                            <tr key={row.employee_id}>
                                                <td className="hrm-month-sheet__sticky">
                                                    <div className="fw-600">{row.employee_name}</div>
                                                    <div className="text-gray-600 fs-small">{row.employee_code}</div>
                                                </td>
                                                {monthly.days.map((day) => {
                                                    const code = row.days[day.day] || "";
                                                    return (
                                                        <td key={day.day} className="text-center">
                                                            {code && <span className={`hrm-code hrm-code--${CODE_CLASS[code] || "u"}`}>{code}</span>}
                                                        </td>
                                                    );
                                                })}
                                                <td className="text-center fw-600">{row.totals.present}</td>
                                                <td className="text-center">{row.totals.late}</td>
                                                <td className="text-center">{row.totals.half_day}</td>
                                                <td className="text-center">{row.totals.absent}</td>
                                                <td className="text-center">{row.totals.leave}</td>
                                                <td className="text-center text-nowrap">{formatMinutes(row.totals.ot_minutes)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="hrm-form-hint mt-3 mb-0">{getFormattedMessage("hrm.attendance.codes.legend")}</p>
                        </>
                    ) : (
                        <div className="empty-state"><div className="empty-state__text">{getFormattedMessage("hrm.attendance.no-employees")}</div></div>
                    )}
                </div>
            </div>
        </MasterLayout>
    );
};

const mapStateToProps = (state) => {
    const { warehouses, allDepartments } = state;
    return { warehouses, allDepartments };
};

export default connect(mapStateToProps, {
    fetchAllWarehouses,
    fetchAllDepartments,
    fetchDailyAttendanceReport,
    fetchMonthlyAttendanceReport,
    exportMonthlyAttendance,
    exportAttendancePdf,
})(AttendanceReports);
