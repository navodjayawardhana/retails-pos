import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import Select from "react-select";
import { FiCheck, FiUpload, FiUserCheck, FiRefreshCw } from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { fetchAllDepartments, fetchHrSettings } from "../../../store/action/hrm/hrmActions";
import { fetchAllWarehouses } from "../../../store/action/warehouseAction";
import { fetchAttendanceSheet, saveAttendanceBulk } from "../../../store/action/hrm/attendanceActions";
import { AttendanceStatusBadge, ATTENDANCE_STATUSES, formatMinutes, todayString } from "./attendanceShared";
import AttendanceImportModal from "./AttendanceImportModal";

const filterStyles = {
    container: (base) => ({ ...base, minWidth: 190 }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const Attendance = (props) => {
    const { warehouses, allDepartments, hrSettings, fetchAllWarehouses, fetchAllDepartments, fetchHrSettings, fetchAttendanceSheet, saveAttendanceBulk } = props;
    const [date, setDate] = useState(todayString());
    const [branch, setBranch] = useState(null);
    const [department, setDepartment] = useState(null);
    const [rows, setRows] = useState([]);
    const [dirty, setDirty] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [importShow, setImportShow] = useState(false);

    useEffect(() => {
        fetchAllWarehouses();
        fetchAllDepartments();
        fetchHrSettings();
    }, []);

    const load = () => {
        setLoading(true);
        fetchAttendanceSheet({
            date,
            warehouse_id: branch ? branch.value : undefined,
            department_id: department ? department.value : undefined,
        })
            .then((data) => {
                setRows(
                    (data.rows || []).map((row) => ({
                        ...row,
                        edit_status: row.attendance_id ? row.status : "",
                        edit_in: row.clock_in || "",
                        edit_out: row.clock_out || "",
                        edit_notes: row.notes || "",
                    }))
                );
                setDirty({});
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(load, [date, branch, department]);

    const update = (employeeId, key, value) => {
        setRows((prev) => prev.map((row) => (row.employee_id === employeeId ? { ...row, [key]: value } : row)));
        setDirty((prev) => ({ ...prev, [employeeId]: true }));
    };

    const markAllPresent = () => {
        const changed = {};
        setRows((prev) =>
            prev.map((row) => {
                if (row.edit_status || row.edit_in) return row;
                if (row.status === "holiday" || row.status === "weekend") return row;
                changed[row.employee_id] = true;
                return { ...row, edit_status: "present" };
            })
        );
        setDirty((prev) => ({ ...prev, ...changed }));
    };

    const save = () => {
        const records = rows
            .filter((row) => dirty[row.employee_id])
            .map((row) => ({
                employee_id: row.employee_id,
                status: row.edit_status || null,
                clock_in: row.edit_in || null,
                clock_out: row.edit_out || null,
                notes: row.edit_notes || null,
            }));
        if (!records.length) return;
        setSaving(true);
        saveAttendanceBulk({ date, records })
            .then(load)
            .catch(() => {})
            .finally(() => setSaving(false));
    };

    const manualOn = !hrSettings || hrSettings.attendance_manual;
    const importOn = !hrSettings || hrSettings.attendance_device_import;
    const dirtyCount = Object.keys(dirty).length;
    const toOptions = (list) => (list || []).map((item) => ({ value: item.id, label: item.attributes.name }));

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.attendance.title")} />
            <div className="hrm-filter-bar">
                <input type="date" className="form-control hrm-filter-bar__date" value={date} max={todayString()}
                    onChange={(e) => setDate(e.target.value || todayString())} />
                <Select isClearable options={toOptions(warehouses)} styles={filterStyles} menuPortalTarget={document.body}
                    value={branch} placeholder={placeholderText("hrm.branch.all")} onChange={setBranch} />
                <Select isClearable options={toOptions(allDepartments)} styles={filterStyles} menuPortalTarget={document.body}
                    value={department} placeholder={placeholderText("hrm.department.all")} onChange={setDepartment} />
                <div className="hrm-filter-bar__actions">
                    <button type="button" className="btn btn-outline-secondary table-toolbar__btn" onClick={load}>
                        <FiRefreshCw /> {getFormattedMessage("hrm.reload.label")}
                    </button>
                    {importOn && (
                        <button type="button" className="btn btn-outline-secondary table-toolbar__btn" onClick={() => setImportShow(true)}>
                            <FiUpload /> {getFormattedMessage("hrm.attendance.import.title")}
                        </button>
                    )}
                    {manualOn && (
                        <>
                            <button type="button" className="btn btn-outline-secondary table-toolbar__btn" onClick={markAllPresent}>
                                <FiUserCheck /> {getFormattedMessage("hrm.attendance.mark-all-present")}
                            </button>
                            <button type="button" className="btn btn-primary table-toolbar__create" disabled={!dirtyCount || saving} onClick={save}>
                                <FiCheck /> {getFormattedMessage("globally.save-btn")}
                                {dirtyCount > 0 && <span className="badge bg-white text-primary ms-1">{dirtyCount}</span>}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {!manualOn && (
                <div className="alert alert-warning mb-4">{getFormattedMessage("hrm.attendance.manual-off")}</div>
            )}

            <div className="card">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="empty-state"><div className="empty-state__text">{getFormattedMessage("globally.loading.label")}</div></div>
                    ) : rows.length === 0 ? (
                        <div className="empty-state"><div className="empty-state__text">{getFormattedMessage("hrm.attendance.no-employees")}</div></div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table hrm-att-grid mb-0">
                                <thead>
                                    <tr>
                                        <th>{getFormattedMessage("hrm.employee.title")}</th>
                                        <th>{getFormattedMessage("hrm.attendance.expected")}</th>
                                        <th style={{ minWidth: 150 }}>{getFormattedMessage("globally.detail.status")}</th>
                                        <th>{getFormattedMessage("hrm.attendance.in")}</th>
                                        <th>{getFormattedMessage("hrm.attendance.out")}</th>
                                        <th>{getFormattedMessage("hrm.attendance.late")}</th>
                                        <th>{getFormattedMessage("hrm.attendance.ot")}</th>
                                        <th style={{ minWidth: 160 }}>{getFormattedMessage("globally.input.notes.label")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => (
                                        <tr key={row.employee_id} className={dirty[row.employee_id] ? "is-dirty" : ""}>
                                            <td>
                                                <div className="fw-600">{row.employee_name}</div>
                                                <div className="text-gray-600 fs-small">{row.employee_code}{row.branch_name ? ` · ${row.branch_name}` : ""}</div>
                                            </td>
                                            <td className="text-nowrap">
                                                {row.status === "holiday" || row.status === "weekend" ? (
                                                    <AttendanceStatusBadge status={row.status} />
                                                ) : (
                                                    <>
                                                        {row.expected_start}–{row.expected_end}
                                                        {row.shift_name && <div className="text-gray-600 fs-small">{row.shift_name}</div>}
                                                    </>
                                                )}
                                            </td>
                                            <td>
                                                <select className="form-select form-select-sm" disabled={!manualOn} value={row.edit_status}
                                                    onChange={(e) => update(row.employee_id, "edit_status", e.target.value)}>
                                                    <option value="">{placeholderText(row.edit_in ? "hrm.attendance.status.auto" : "hrm.attendance.status.unmarked")}</option>
                                                    {ATTENDANCE_STATUSES.map((status) => (
                                                        <option key={status} value={status}>{placeholderText(`hrm.attendance.status.${status}`)}</option>
                                                    ))}
                                                </select>
                                                {row.attendance_id && !dirty[row.employee_id] && (
                                                    <div className="mt-1"><AttendanceStatusBadge status={row.status} /></div>
                                                )}
                                            </td>
                                            <td>
                                                <input type="time" className="form-control form-control-sm" disabled={!manualOn} value={row.edit_in}
                                                    onChange={(e) => update(row.employee_id, "edit_in", e.target.value)} />
                                            </td>
                                            <td>
                                                <input type="time" className="form-control form-control-sm" disabled={!manualOn} value={row.edit_out}
                                                    onChange={(e) => update(row.employee_id, "edit_out", e.target.value)} />
                                            </td>
                                            <td className="text-nowrap">{formatMinutes(row.late_minutes)}</td>
                                            <td className="text-nowrap">{formatMinutes(row.ot_minutes)}</td>
                                            <td>
                                                <input type="text" className="form-control form-control-sm" disabled={!manualOn} value={row.edit_notes}
                                                    onChange={(e) => update(row.employee_id, "edit_notes", e.target.value)} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            <p className="hrm-form-hint mt-3">{getFormattedMessage("hrm.attendance.grid.hint")}</p>
            <AttendanceImportModal show={importShow} handleClose={() => setImportShow(false)} onImported={load} />
        </MasterLayout>
    );
};

const mapStateToProps = (state) => {
    const { warehouses, allDepartments, hrSettings } = state;
    return { warehouses, allDepartments, hrSettings };
};

export default connect(mapStateToProps, {
    fetchAllWarehouses,
    fetchAllDepartments,
    fetchHrSettings,
    fetchAttendanceSheet,
    saveAttendanceBulk,
})(Attendance);
