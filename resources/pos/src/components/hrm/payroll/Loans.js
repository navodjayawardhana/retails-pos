import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Button } from "react-bootstrap-v5";
import Select from "react-select";
import { FiCheckCircle, FiEdit2, FiPlus, FiSlash, FiTrash2 } from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import ReactDataTable from "../../../shared/table/ReactDataTable";
import DeleteModel from "../../../shared/action-buttons/DeleteModel";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { fetchEmployeeLoans, deleteEmployeeLoan, cancelEmployeeLoan } from "../../../store/action/hrm/payrollActions";
import { fetchActiveEmployeeOptions } from "../../../store/action/hrm/attendanceActions";
import { fetchAllWarehouses } from "../../../store/action/warehouseAction";
import LoanForm from "./LoanForm";
import LoanSettleModal from "./LoanSettleModal";
import { PayrollStatusBadge, portalStyles, toOptions, useMoney } from "./payrollShared";

// Row actions as their own component so they read fresh handlers (the shared table memoizes columns).
export const LoanActions = ({ loan, onEdit, onSettle, onCancel, onDelete }) => {
    const untouched = (loan.repayments || []).length === 0;
    return (
        <div className="action-btn-group">
            {loan.status === "active" && (
                <button type="button" className="action-btn action-btn--view" title={placeholderText("hrm.loan.settle.title")} onClick={() => onSettle(loan)}>
                    <FiCheckCircle />
                </button>
            )}
            {loan.status === "active" && untouched && (
                <button type="button" className="action-btn action-btn--edit" title={placeholderText("globally.edit.tooltip.label")} onClick={() => onEdit(loan)}>
                    <FiEdit2 />
                </button>
            )}
            {loan.status === "active" && !untouched && (
                <button type="button" className="action-btn action-btn--delete" title={placeholderText("hrm.loan.cancel")} onClick={() => onCancel(loan)}>
                    <FiSlash />
                </button>
            )}
            {untouched && (
                <button type="button" className="action-btn action-btn--delete" title={placeholderText("globally.delete.tooltip.label")} onClick={() => onDelete(loan)}>
                    <FiTrash2 />
                </button>
            )}
        </div>
    );
};

const Loans = (props) => {
    const {
        employeeLoans, totalRecord, isLoading, warehouses,
        fetchEmployeeLoans, deleteEmployeeLoan, cancelEmployeeLoan, fetchActiveEmployeeOptions, fetchAllWarehouses,
    } = props;
    const [filters, setFilters] = useState({});
    const [employeeOptions, setEmployeeOptions] = useState([]);
    const [formShow, setFormShow] = useState(false);
    const [editing, setEditing] = useState(null);
    const [settling, setSettling] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const lastFilter = useRef({});
    const firstRun = useRef(true);
    const extraRef = useRef({});

    useEffect(() => {
        fetchAllWarehouses();
        fetchActiveEmployeeOptions().then((options) => setEmployeeOptions(options || [])).catch(() => {});
    }, []);

    extraRef.current = {
        status: filters.status?.value,
        type: filters.type?.value,
        warehouse_id: filters.warehouse_id?.value,
    };

    useEffect(() => {
        if (firstRun.current) {
            firstRun.current = false;
            return;
        }
        fetchEmployeeLoans({ ...lastFilter.current, page: 1 }, true, extraRef.current);
    }, [filters]);

    const onChange = (filter) => {
        lastFilter.current = filter;
        fetchEmployeeLoans(filter, true, extraRef.current);
    };
    const refreshRef = useRef();
    refreshRef.current = () => fetchEmployeeLoans(lastFilter.current, false, extraRef.current);
    const refresh = () => refreshRef.current();

    const filterSelect = (key, options, placeholderKey) => (
        <Select isClearable styles={portalStyles} menuPortalTarget={document.body} options={options}
            value={filters[key] || null} placeholder={placeholderText(placeholderKey)}
            onChange={(option) => setFilters((prev) => ({ ...prev, [key]: option }))} />
    );

    const itemsValue = employeeLoans.map((loan) => ({ id: loan.id, ...loan.attributes }));

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
        { name: getFormattedMessage("hrm.loan.type"), cell: (row) => getFormattedMessage(`hrm.loan.type.${row.type}`) },
        { name: getFormattedMessage("hrm.amount"), cell: (row) => <MoneyCell value={row.amount} /> },
        { name: getFormattedMessage("hrm.loan.monthly-installment"), cell: (row) => <MoneyCell value={row.monthly_installment} /> },
        { name: getFormattedMessage("hrm.loan.start-month"), cell: (row) => row.start_month },
        { name: getFormattedMessage("hrm.loan.balance"), cell: (row) => <strong><MoneyCell value={row.balance} /></strong> },
        { name: getFormattedMessage("globally.detail.status"), cell: (row) => <PayrollStatusBadge status={row.status} /> },
        {
            name: getFormattedMessage("react-data-table.action.column.label"),
            right: true,
            ignoreRowClick: true,
            allowOverflow: true,
            button: true,
            width: "140px",
            cell: (row) => (
                <LoanActions
                    loan={row}
                    onEdit={(loan) => { setEditing(loan); setFormShow(true); }}
                    onSettle={setSettling}
                    onCancel={(loan) => cancelEmployeeLoan(loan.id).then(refresh).catch(() => {})}
                    onDelete={setDeleting}
                />
            ),
        },
    ];

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.loans.title")} />
            <div className="hrm-filter-bar">
                {filterSelect("status", ["active", "completed", "cancelled"].map((s) => ({ value: s, label: placeholderText(`hrm.payroll.status.${s}`) })), "hrm.leave.status.all")}
                {filterSelect("type", ["advance", "loan"].map((t) => ({ value: t, label: placeholderText(`hrm.loan.type.${t}`) })), "hrm.loan.type.all")}
                {filterSelect("warehouse_id", toOptions(warehouses), "hrm.branch.all")}
            </div>
            <ReactDataTable
                columns={columns}
                items={itemsValue}
                onChange={onChange}
                isLoading={isLoading}
                totalRows={totalRecord}
                AddButton={
                    <Button variant="primary" className="table-toolbar__create" onClick={() => { setEditing(null); setFormShow(true); }}>
                        <FiPlus /> {getFormattedMessage("hrm.loan.create.title")}
                    </Button>
                }
            />
            <LoanForm show={formShow} loan={editing} employeeOptions={employeeOptions}
                handleClose={() => setFormShow(false)} onSaved={refresh} />
            <LoanSettleModal loan={settling} onHide={() => setSettling(null)} onSaved={refresh} />
            {deleting && (
                <DeleteModel
                    deleteModel={!!deleting}
                    onClickDeleteModel={() => setDeleting(null)}
                    deleteUserClick={() => {
                        deleteEmployeeLoan(deleting.id).then(refresh).catch(() => {});
                        setDeleting(null);
                    }}
                    name={getFormattedMessage("hrm.loan.title")}
                />
            )}
        </MasterLayout>
    );
};

const MoneyCell = ({ value }) => {
    const money = useMoney();
    return <span className="text-nowrap">{money(value)}</span>;
};

const mapStateToProps = (state) => {
    const { employeeLoans, totalRecord, isLoading, warehouses } = state;
    return { employeeLoans, totalRecord, isLoading, warehouses };
};

export default connect(mapStateToProps, {
    fetchEmployeeLoans, deleteEmployeeLoan, cancelEmployeeLoan, fetchActiveEmployeeOptions, fetchAllWarehouses,
})(Loans);
