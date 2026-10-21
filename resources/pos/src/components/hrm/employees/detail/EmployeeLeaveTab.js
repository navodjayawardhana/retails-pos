import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import Select from "react-select";
import { FiCheck, FiEdit2, FiPlus, FiX } from "react-icons/fi";
import { getFormattedMessage, placeholderText } from "../../../../shared/sharedMethod";
import {
    fetchLeaveEntitlements,
    saveLeaveEntitlements,
    fetchAllLeaveTypes,
} from "../../../../store/action/hrm/leaveActions";
import ApplyLeaveModal from "../../leave/ApplyLeaveModal";
import { formatDays, LeaveBalanceCards, LeaveRequestTable, LeaveTypeTag, yearOptions } from "../../leave/leaveShared";

const yearStyles = { container: (base) => ({ ...base, minWidth: 120 }), menuPortal: (base) => ({ ...base, zIndex: 9999 }) };

// Employee detail "Leave" tab: balances, per-employee entitlements (editable) and the year's requests.
const EmployeeLeaveTab = ({ employee, allLeaveTypes, fetchLeaveEntitlements, saveLeaveEntitlements, fetchAllLeaveTypes }) => {
    const years = yearOptions();
    const [year, setYear] = useState(years[1]);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({});
    const [saving, setSaving] = useState(false);
    const [applyShow, setApplyShow] = useState(false);

    const load = () => {
        setLoading(true);
        fetchLeaveEntitlements(employee.id, year.value)
            .then((result) => {
                setData(result);
                setEditing(false);
            })
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchAllLeaveTypes();
    }, []);
    useEffect(load, [employee.id, year]);

    const limited = data ? data.balances.filter((b) => !b.is_unlimited) : [];

    const startEdit = () => {
        const next = {};
        limited.forEach((b) => {
            next[b.leave_type_id] = { days: b.days ?? 0, carried_forward: b.carried_forward ?? 0 };
        });
        setDraft(next);
        setEditing(true);
    };

    const setValue = (typeId, key, value) =>
        setDraft((prev) => ({ ...prev, [typeId]: { ...prev[typeId], [key]: value } }));

    const save = () => {
        setSaving(true);
        saveLeaveEntitlements({
            employee_id: employee.id,
            year: year.value,
            items: Object.entries(draft).map(([typeId, value]) => ({
                leave_type_id: Number(typeId),
                days: value.days === "" ? 0 : value.days,
                carried_forward: value.carried_forward === "" ? 0 : value.carried_forward,
            })),
        })
            .then((result) => {
                setData(result);
                setEditing(false);
            })
            .catch(() => {})
            .finally(() => setSaving(false));
    };

    const leaveTypeList = (allLeaveTypes || []).map((t) => ({ id: t.id, ...t.attributes }))
        .filter((t) => !t.gender || t.gender === employee.gender);
    const employeeOption = [{ value: employee.id, label: `${employee.employee_code} · ${employee.full_name}` }];
    const isActive = employee.status === "active";

    return (
        <div className="hrm-leave-tab">
            <div className="hrm-filter-bar">
                <Select options={years} styles={yearStyles} menuPortalTarget={document.body} value={year} onChange={setYear} />
                {isActive && (
                    <div className="hrm-filter-bar__actions">
                        <button type="button" className="btn btn-primary table-toolbar__create" onClick={() => setApplyShow(true)}>
                            <FiPlus /> {getFormattedMessage("hrm.leave.add.title")}
                        </button>
                    </div>
                )}
            </div>
            {loading && !data ? (
                <div className="empty-state"><div className="empty-state__text">{getFormattedMessage("globally.loading.label")}</div></div>
            ) : !data ? null : (
                <>
                    <LeaveBalanceCards balances={data.balances} />

                    <div className="hrm-section-head mt-5">
                        <h3 className="hrm-section-title mb-0">{getFormattedMessage("hrm.leave.entitlements")}</h3>
                        {limited.length > 0 && !editing && (
                            <button type="button" className="btn btn-outline-secondary table-toolbar__btn" onClick={startEdit}>
                                <FiEdit2 /> {getFormattedMessage("hrm.leave.entitlements.edit")}
                            </button>
                        )}
                    </div>
                    <p className="hrm-form-hint">{getFormattedMessage("hrm.leave.entitlements.hint")}</p>
                    <div className="table-responsive">
                        <table className="table hrm-simple-table mb-0">
                            <thead>
                                <tr>
                                    <th>{getFormattedMessage("hrm.leave-type.title")}</th>
                                    <th>{getFormattedMessage("hrm.leave.allowed")}</th>
                                    <th>{getFormattedMessage("hrm.leave.carried")}</th>
                                    <th>{getFormattedMessage("hrm.leave.entitled")}</th>
                                    <th>{getFormattedMessage("hrm.leave.source")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {limited.map((b) => (
                                    <tr key={b.leave_type_id}>
                                        <td><LeaveTypeTag name={b.name} color={b.color} /></td>
                                        <td>
                                            {editing ? (
                                                <input type="number" min="0" max="366" step="0.5" className="form-control hrm-num-input"
                                                    value={draft[b.leave_type_id]?.days ?? ""}
                                                    onChange={(e) => setValue(b.leave_type_id, "days", e.target.value)} />
                                            ) : formatDays(b.days)}
                                        </td>
                                        <td>
                                            {editing ? (
                                                <input type="number" min="0" max="366" step="0.5" className="form-control hrm-num-input"
                                                    value={draft[b.leave_type_id]?.carried_forward ?? ""}
                                                    onChange={(e) => setValue(b.leave_type_id, "carried_forward", e.target.value)} />
                                            ) : formatDays(b.carried_forward)}
                                        </td>
                                        <td className="fw-600">{formatDays(b.entitled)}</td>
                                        <td>
                                            <span className={`badge ${b.is_custom ? "bg-light-warning" : b.has_row ? "bg-light-primary" : "bg-light"}`}>
                                                {getFormattedMessage(b.is_custom ? "hrm.leave.source.custom" : b.has_row ? "hrm.leave.source.year" : "hrm.leave.source.default")}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {editing && (
                        <div className="d-flex justify-content-end gap-2 mt-3">
                            <button type="button" className="btn btn-outline-secondary" onClick={() => setEditing(false)}>
                                <FiX /> {getFormattedMessage("globally.cancel-btn")}
                            </button>
                            <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
                                <FiCheck /> {getFormattedMessage("globally.save-btn")}
                            </button>
                        </div>
                    )}

                    <h3 className="hrm-section-title mt-5">{getFormattedMessage("hrm.leave.history")} {year.value}</h3>
                    <LeaveRequestTable requests={data.requests} />
                </>
            )}
            <ApplyLeaveModal
                show={applyShow}
                onHide={() => setApplyShow(false)}
                onSaved={load}
                isSelf={false}
                employeeOptions={employeeOption}
                defaultEmployeeId={employee.id}
                leaveTypes={leaveTypeList}
            />
        </div>
    );
};

const mapStateToProps = (state) => {
    const { allLeaveTypes } = state;
    return { allLeaveTypes };
};

export default connect(mapStateToProps, { fetchLeaveEntitlements, saveLeaveEntitlements, fetchAllLeaveTypes })(EmployeeLeaveTab);
