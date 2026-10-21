import React, { useRef, useState } from "react";
import { connect } from "react-redux";
import { Button } from "react-bootstrap-v5";
import { FiPlus } from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import ReactDataTable from "../../../shared/table/ReactDataTable";
import ActionButton from "../../../shared/action-buttons/ActionButton";
import DeleteModel from "../../../shared/action-buttons/DeleteModel";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { fetchLeaveTypes, deleteLeaveType } from "../../../store/action/hrm/leaveActions";
import LeaveTypeForm from "./LeaveTypeForm";
import { formatDays, LeaveTypeTag } from "./leaveShared";

const YesNo = ({ value, positive = "bg-light-success" }) => (
    <span className={`badge ${value ? positive : "bg-light"}`}>{getFormattedMessage(value ? "hrm.yes" : "hrm.no")}</span>
);

const LeaveTypes = ({ leaveTypes, totalRecord, isLoading, fetchLeaveTypes, deleteLeaveType }) => {
    const [formShow, setFormShow] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const lastFilter = useRef({});

    const onChange = (filter) => {
        lastFilter.current = filter;
        fetchLeaveTypes(filter, true);
    };
    const refresh = () => fetchLeaveTypes(lastFilter.current, false);

    const itemsValue = leaveTypes.map((type) => ({ id: type.id, ...type.attributes }));

    const columns = [
        {
            name: getFormattedMessage("globally.input.name.label"),
            sortField: "name",
            sortable: true,
            minWidth: "200px",
            cell: (row) => (
                <span>
                    <LeaveTypeTag name={row.name} color={row.color} />
                    <span className="hrm-person__code d-block">{row.code}</span>
                </span>
            ),
        },
        {
            name: getFormattedMessage("hrm.leave-type.days-per-year"),
            sortField: "default_days_per_year",
            sortable: true,
            cell: (row) => (row.is_unlimited ? getFormattedMessage("hrm.leave.unlimited") : formatDays(row.default_days_per_year)),
        },
        { name: getFormattedMessage("hrm.leave-type.paid"), cell: (row) => <YesNo value={row.is_paid} /> },
        { name: getFormattedMessage("hrm.leave-type.half-day"), cell: (row) => <YesNo value={row.allow_half_day} positive="bg-light-info" /> },
        {
            name: getFormattedMessage("hrm.leave-type.carry-forward"),
            cell: (row) =>
                row.carry_forward ? (
                    <span className="badge bg-light-primary">
                        {row.max_carry_forward_days !== null
                            ? `${placeholderText("hrm.leave-type.max")} ${formatDays(row.max_carry_forward_days)}`
                            : getFormattedMessage("hrm.yes")}
                    </span>
                ) : (
                    <YesNo value={false} />
                ),
        },
        { name: getFormattedMessage("hrm.leave-type.document"), cell: (row) => <YesNo value={row.requires_document} positive="bg-light-warning" /> },
        {
            name: getFormattedMessage("hrm.leave-type.gender"),
            cell: (row) => (row.gender ? getFormattedMessage(`hrm.gender.${row.gender}`) : getFormattedMessage("hrm.leave-type.gender.all")),
        },
        {
            name: getFormattedMessage("globally.detail.status"),
            cell: (row) => (
                <span className={`badge ${row.is_active ? "bg-light-success" : "bg-light-dark"}`}>
                    {getFormattedMessage(row.is_active ? "hrm.leave-type.active" : "hrm.leave-type.inactive")}
                </span>
            ),
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
            <TabTitle title={placeholderText("hrm.leave-types.title")} />
            <ReactDataTable
                columns={columns}
                items={itemsValue}
                onChange={onChange}
                isLoading={isLoading}
                totalRows={totalRecord}
                AddButton={
                    <Button variant="primary" className="table-toolbar__create" onClick={() => { setEditing(null); setFormShow(true); }}>
                        <FiPlus /> {getFormattedMessage("hrm.leave-type.create.title")}
                    </Button>
                }
            />
            <LeaveTypeForm show={formShow} leaveType={editing} handleClose={() => setFormShow(false)} onSaved={refresh} />
            {deleting && (
                <DeleteModel
                    deleteModel={!!deleting}
                    onClickDeleteModel={() => setDeleting(null)}
                    deleteUserClick={() => {
                        deleteLeaveType(deleting.id).then(refresh).catch(() => {});
                        setDeleting(null);
                    }}
                    name={getFormattedMessage("hrm.leave-type.title")}
                />
            )}
        </MasterLayout>
    );
};

const mapStateToProps = (state) => {
    const { leaveTypes, totalRecord, isLoading } = state;
    return { leaveTypes, totalRecord, isLoading };
};

export default connect(mapStateToProps, { fetchLeaveTypes, deleteLeaveType })(LeaveTypes);
