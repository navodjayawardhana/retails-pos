import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Button } from "react-bootstrap-v5";
import Select from "react-select";
import { FiCheck, FiPaperclip, FiPlus, FiSlash, FiTrash2, FiX } from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import ReactDataTable from "../../../shared/table/ReactDataTable";
import DeleteModel from "../../../shared/action-buttons/DeleteModel";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import {
    fetchLeaveRequests,
    fetchAllLeaveTypes,
    approveLeave,
    rejectLeave,
    cancelLeave,
    deleteLeaveRequest,
} from "../../../store/action/hrm/leaveActions";
import { fetchActiveEmployeeOptions } from "../../../store/action/hrm/attendanceActions";
import { fetchAllDepartments } from "../../../store/action/hrm/hrmActions";
import { fetchAllWarehouses } from "../../../store/action/warehouseAction";
import ApplyLeaveModal from "./ApplyLeaveModal";
import LeaveDecisionModal from "./LeaveDecisionModal";
import { dateRangeLabel, formatDays, leaveStatusOptions, LeaveStatusBadge, LeaveTypeTag } from "./leaveShared";

const filterStyles = {
    container: (base) => ({ ...base, minWidth: 160 }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const LeaveRequests = (props) => {
    const {
        leaveRequests, totalRecord, isLoading, allLeaveTypes, warehouses, allDepartments,
        fetchLeaveRequests, fetchAllLeaveTypes, fetchAllWarehouses, fetchAllDepartments, fetchActiveEmployeeOptions,
        approveLeave, rejectLeave, cancelLeave, deleteLeaveRequest,
    } = props;
    const [filters, setFilters] = useState({ status: { value: "pending", label: placeholderText("hrm.leave.status.pending") } });
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [applyShow, setApplyShow] = useState(false);
    const [employeeOptions, setEmployeeOptions] = useState([]);
    const [decision, setDecision] = useState({ request: null, action: null });
    const [deleting, setDeleting] = useState(null);
    const lastFilter = useRef({});
    const firstRun = useRef(true);

    useEffect(() => {
        fetchAllLeaveTypes();
        fetchAllWarehouses();
        fetchAllDepartments();
        fetchActiveEmployeeOptions().then((options) => setEmployeeOptions(options || [])).catch(() => {});
    }, []);

    const extra = () => ({
        status: filters.status?.value,
        leave_type_id: filters.leave_type_id?.value,
        warehouse_id: filters.warehouse_id?.value,
        department_id: filters.department_id?.value,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
    });

    useEffect(() => {
        if (firstRun.current) {
            firstRun.current = false;
            return;
        }
        fetchLeaveRequests({ ...lastFilter.current, page: 1 }, true, extra());
    }, [filters, dateFrom, dateTo]);

    const onChange = (filter) => {
        lastFilter.current = filter;
        fetchLeaveRequests(filter, true, extra());
    };
    const refresh = () => fetchLeaveRequests(lastFilter.current, false, extra());

    const toOptions = (list) => (list || []).map((item) => ({ value: item.id, label: item.attributes.name }));
    const filterSelect = (key, options, placeholderKey) => (
        <Select isClearable styles={filterStyles} menuPortalTarget={document.body} options={options}
            value={filters[key] || null} placeholder={placeholderText(placeholderKey)}
            onChange={(option) => setFilters((prev) => ({ ...prev, [key]: option }))} />
    );

    const leaveTypeList = (allLeaveTypes || []).map((t) => ({ id: t.id, ...t.attributes }));

    const runDecision = (remarks) => {
        const { request, action } = decision;
        const call = action === "approve" ? approveLeave : action === "reject" ? rejectLeave : cancelLeave;
        return call(request.id, remarks)
            .then(() => {
                setDecision({ request: null, action: null });
                refresh();
            })
            .catch(() => {});
    };

    const itemsValue = leaveRequests.map((item) => ({ id: item.id, ...item.attributes }));

    const columns = [
        {
            name: getFormattedMessage("hrm.employee.title"),
            minWidth: "200px",
            cell: (row) => (
                <span>
                    <span className="hrm-person__name d-block">{row.employee_name}</span>
                    <span className="hrm-person__code">{row.employee_code}{row.branch_name ? ` · ${row.branch_name}` : ""}</span>
                </span>
            ),
        },
        {
            name: getFormattedMessage("hrm.leave-type.title"),
            cell: (row) => <LeaveTypeTag name={row.leave_type_name} color={row.leave_type_color} />,
        },
        {
            name: getFormattedMessage("hrm.leave.dates"),
            sortField: "from_date",
            sortable: true,
            minWidth: "190px",
            cell: (row) => <span className="text-nowrap">{dateRangeLabel(row)}</span>,
        },
        { name: getFormattedMessage("hrm.leave.days"), sortField: "days", sortable: true, cell: (row) => formatDays(row.days) },
        {
            name: getFormattedMessage("globally.detail.status"),
            minWidth: "150px",
            cell: (row) => (
                <span>
                    <LeaveStatusBadge status={row.status} />
                    {row.conflict_dates && row.conflict_dates.length > 0 && (
                        <span className="hrm-form-hint d-block mt-1" title={row.conflict_dates.join(", ")}>
                            {placeholderText("hrm.leave.conflicts")}: {row.conflict_dates.length}
                        </span>
                    )}
                    {row.approver_name && row.status !== "pending" && (
                        <span className="hrm-form-hint d-block">{row.approver_name}</span>
                    )}
                </span>
            ),
        },
        {
            name: getFormattedMessage("hrm.leave.reason"),
            minWidth: "180px",
            cell: (row) => <span className="text-gray-600">{row.reason || "—"}</span>,
        },
        {
            name: getFormattedMessage("react-data-table.action.column.label"),
            right: true,
            ignoreRowClick: true,
            allowOverflow: true,
            button: true,
            width: "170px",
            cell: (row) => (
                <div className="action-btn-group">
                    {row.attachments && row.attachments.length > 0 && (
                        <a className="action-btn action-btn--edit" href={row.attachments[0].url} target="_blank" rel="noreferrer"
                            title={placeholderText("hrm.leave.document")}>
                            <FiPaperclip />
                        </a>
                    )}
                    {row.status === "pending" && (
                        <>
                            <button type="button" className="action-btn action-btn--view" title={placeholderText("hrm.leave.approve")}
                                onClick={() => setDecision({ request: row, action: "approve" })}>
                                <FiCheck />
                            </button>
                            <button type="button" className="action-btn action-btn--delete" title={placeholderText("hrm.leave.reject")}
                                onClick={() => setDecision({ request: row, action: "reject" })}>
                                <FiX />
                            </button>
                        </>
                    )}
                    {row.status === "approved" && (
                        <button type="button" className="action-btn action-btn--delete" title={placeholderText("hrm.leave.cancel")}
                            onClick={() => setDecision({ request: row, action: "cancel" })}>
                            <FiSlash />
                        </button>
                    )}
                    {row.status !== "approved" && (
                        <button type="button" className="action-btn action-btn--delete" title={placeholderText("globally.delete.tooltip.label")}
                            onClick={() => setDeleting(row)}>
                            <FiTrash2 />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.leave-requests.title")} />
            <div className="hrm-filter-bar">
                {filterSelect("status", leaveStatusOptions(), "hrm.leave.status.all")}
                {filterSelect("leave_type_id", leaveTypeList.map((t) => ({ value: t.id, label: t.name })), "hrm.leave.type.all")}
                {filterSelect("warehouse_id", toOptions(warehouses), "hrm.branch.all")}
                {filterSelect("department_id", toOptions(allDepartments), "hrm.department.all")}
                <input type="date" className="form-control hrm-filter-bar__date" value={dateFrom}
                    title={placeholderText("hrm.leave.from")} onChange={(e) => setDateFrom(e.target.value)} />
                <input type="date" className="form-control hrm-filter-bar__date" value={dateTo}
                    title={placeholderText("hrm.leave.to")} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <ReactDataTable
                columns={columns}
                items={itemsValue}
                onChange={onChange}
                isLoading={isLoading}
                totalRows={totalRecord}
                AddButton={
                    <Button variant="primary" className="table-toolbar__create" onClick={() => setApplyShow(true)}>
                        <FiPlus /> {getFormattedMessage("hrm.leave.add.title")}
                    </Button>
                }
            />
            <ApplyLeaveModal
                show={applyShow}
                onHide={() => setApplyShow(false)}
                onSaved={refresh}
                isSelf={false}
                employeeOptions={employeeOptions}
                leaveTypes={leaveTypeList}
            />
            <LeaveDecisionModal
                request={decision.request}
                action={decision.action}
                onHide={() => setDecision({ request: null, action: null })}
                onConfirm={runDecision}
            />
            {deleting && (
                <DeleteModel
                    deleteModel={!!deleting}
                    onClickDeleteModel={() => setDeleting(null)}
                    deleteUserClick={() => {
                        deleteLeaveRequest(deleting.id).then(refresh).catch(() => {});
                        setDeleting(null);
                    }}
                    name={getFormattedMessage("hrm.leave.request.title")}
                />
            )}
        </MasterLayout>
    );
};

const mapStateToProps = (state) => {
    const { leaveRequests, totalRecord, isLoading, allLeaveTypes, warehouses, allDepartments } = state;
    return { leaveRequests, totalRecord, isLoading, allLeaveTypes, warehouses, allDepartments };
};

export default connect(mapStateToProps, {
    fetchLeaveRequests,
    fetchAllLeaveTypes,
    fetchAllWarehouses,
    fetchAllDepartments,
    fetchActiveEmployeeOptions,
    approveLeave,
    rejectLeave,
    cancelLeave,
    deleteLeaveRequest,
})(LeaveRequests);
