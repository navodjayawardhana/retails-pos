import React, { useCallback, useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Button } from "react-bootstrap-v5";
import { FiPlus, FiUsers, FiTrash2 } from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import ReactDataTable from "../../../shared/table/ReactDataTable";
import ActionButton from "../../../shared/action-buttons/ActionButton";
import DeleteModel from "../../../shared/action-buttons/DeleteModel";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import {
    fetchShifts,
    fetchAllShifts,
    deleteShift,
    fetchShiftAssignments,
    removeShiftAssignment,
} from "../../../store/action/hrm/attendanceActions";
import { fetchAllWarehouses } from "../../../store/action/warehouseAction";
import ShiftForm from "./ShiftForm";
import AssignShiftModal from "./AssignShiftModal";
import { weekdayLabel } from "../attendance/attendanceShared";

const Shifts = (props) => {
    const {
        shifts, allShifts, warehouses, totalRecord, isLoading,
        fetchShifts, fetchAllShifts, deleteShift, fetchShiftAssignments, removeShiftAssignment, fetchAllWarehouses,
    } = props;
    const [formShow, setFormShow] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [assignShow, setAssignShow] = useState(false);
    const [assignments, setAssignments] = useState([]);
    const lastFilter = useRef({});

    const loadAssignments = useCallback(
        () => fetchShiftAssignments({ current: 1 }).then((rows) => setAssignments(rows || [])).catch(() => {}),
        []
    );

    useEffect(() => {
        fetchAllShifts();
        fetchAllWarehouses();
        loadAssignments();
    }, []);

    const onChange = (filter) => {
        lastFilter.current = filter;
        fetchShifts(filter, true);
    };
    const refresh = () => {
        fetchShifts(lastFilter.current, false);
        loadAssignments();
    };

    const offDays = (days) =>
        Array.isArray(days) ? (days.length ? days.map(weekdayLabel).join(", ") : "—") : getFormattedMessage("hrm.use-default.label");

    const itemsValue = shifts.map((shift) => ({ id: shift.id, ...shift.attributes }));

    const columns = [
        { name: getFormattedMessage("globally.input.name.label"), selector: (row) => row.name, sortField: "name", sortable: true },
        {
            name: getFormattedMessage("hrm.shift.time"),
            cell: (row) => (
                <span>
                    {row.start_time} – {row.end_time}
                    {row.is_night_shift && <span className="badge bg-light-dark ms-2">{getFormattedMessage("hrm.shift.night.badge")}</span>}
                </span>
            ),
        },
        { name: getFormattedMessage("hrm.shift.break"), selector: (row) => `${row.break_minutes || 0} min` },
        {
            name: getFormattedMessage("hrm.shift.grace"),
            selector: (row) => (row.late_grace_minutes === null ? getFormattedMessage("hrm.use-default.label") : `${row.late_grace_minutes} min`),
        },
        { name: getFormattedMessage("hrm.shift.off-days"), selector: (row) => offDays(row.weekly_off_days) },
        {
            name: getFormattedMessage("hrm.employees.title"),
            cell: (row) => <span className="badge bg-light-primary">{row.employees_count}</span>,
        },
        {
            name: getFormattedMessage("react-data-table.action.column.label"),
            right: true,
            ignoreRowClick: true,
            allowOverflow: true,
            button: true,
            width: "120px",
            cell: (row) => (
                <ActionButton
                    item={row}
                    goToEditProduct={(item) => { setEditing(item); setFormShow(true); }}
                    isEditMode={true}
                    onClickDeleteModel={(item) => setDeleting(item)}
                />
            ),
        },
    ];

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.shifts.title")} />
            <ReactDataTable
                columns={columns}
                items={itemsValue}
                onChange={onChange}
                isLoading={isLoading}
                totalRows={totalRecord}
                AddButton={
                    <>
                        <Button variant="outline-secondary" className="table-toolbar__btn" onClick={() => setAssignShow(true)}>
                            <FiUsers /> {getFormattedMessage("hrm.shift.assign.title")}
                        </Button>
                        <Button variant="primary" className="table-toolbar__create" onClick={() => { setEditing(null); setFormShow(true); }}>
                            <FiPlus /> {getFormattedMessage("hrm.shift.create.title")}
                        </Button>
                    </>
                }
            />

            <div className="card hrm-form-section mt-6">
                <div className="card-header">
                    <div>
                        <h3 className="mb-0">{getFormattedMessage("hrm.shift.current-assignments")}</h3>
                        <p className="hrm-form-hint mb-0 mt-1">{getFormattedMessage("hrm.shift.current-assignments.hint")}</p>
                    </div>
                </div>
                <div className="card-body pt-2">
                    {assignments.length === 0 ? (
                        <div className="empty-state py-6">
                            <div className="empty-state__text">{getFormattedMessage("hrm.shift.no-assignments")}</div>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table hrm-simple-table mb-0">
                                <thead>
                                    <tr>
                                        <th>{getFormattedMessage("hrm.employee.title")}</th>
                                        <th>{getFormattedMessage("hrm.shift.title")}</th>
                                        <th>{getFormattedMessage("hrm.from-date.label")}</th>
                                        <th>{getFormattedMessage("hrm.to-date.label")}</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {assignments.map((row) => (
                                        <tr key={row.id}>
                                            <td>
                                                <span className="fw-500">{row.employee_name}</span>
                                                <span className="text-gray-600 ms-2">{row.employee_code}</span>
                                            </td>
                                            <td>{row.shift_name} <span className="text-gray-600">({row.start_time}–{row.end_time})</span></td>
                                            <td>{row.from_date}</td>
                                            <td>{row.to_date || getFormattedMessage("hrm.open-ended.label")}</td>
                                            <td className="text-end">
                                                <button type="button" className="action-btn action-btn--delete"
                                                    title={placeholderText("globally.delete.tooltip.label")}
                                                    onClick={() => removeShiftAssignment(row.id).then(refresh).catch(() => {})}>
                                                    <FiTrash2 />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <ShiftForm show={formShow} shift={editing} handleClose={() => setFormShow(false)} onSaved={refresh} />
            <AssignShiftModal show={assignShow} handleClose={() => setAssignShow(false)} shifts={allShifts}
                warehouses={warehouses} onSaved={refresh} />
            {deleting && (
                <DeleteModel
                    deleteModel={!!deleting}
                    onClickDeleteModel={() => setDeleting(null)}
                    deleteUserClick={() => {
                        deleteShift(deleting.id).then(refresh).catch(() => {});
                        setDeleting(null);
                    }}
                    name={getFormattedMessage("hrm.shift.title")}
                />
            )}
        </MasterLayout>
    );
};

const mapStateToProps = (state) => {
    const { shifts, allShifts, warehouses, totalRecord, isLoading } = state;
    return { shifts, allShifts, warehouses, totalRecord, isLoading };
};

export default connect(mapStateToProps, {
    fetchShifts,
    fetchAllShifts,
    deleteShift,
    fetchShiftAssignments,
    removeShiftAssignment,
    fetchAllWarehouses,
})(Shifts);
