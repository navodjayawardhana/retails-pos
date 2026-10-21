import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Button, Modal } from "react-bootstrap-v5";
import Select from "react-select";
import { FiArrowRight, FiCheck, FiPlus } from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import ReactDataTable from "../../../shared/table/ReactDataTable";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { fetchPayrollRuns, createPayrollRun } from "../../../store/action/hrm/payrollActions";
import { fetchAllDepartments } from "../../../store/action/hrm/hrmActions";
import { fetchAllWarehouses } from "../../../store/action/warehouseAction";
import { PayrollStatusBadge, portalStyles, previousMonth, toOptions, useMoney, yearOptions } from "./payrollShared";

const MoneyCell = ({ value, strong }) => {
    const money = useMoney();
    return strong ? <strong className="text-nowrap">{money(value)}</strong> : <span className="text-nowrap">{money(value)}</span>;
};

const NewRunModal = ({ show, onHide, warehouses, departments, onCreate }) => {
    const [month, setMonth] = useState(previousMonth());
    const [warehouse, setWarehouse] = useState(null);
    const [department, setDepartment] = useState(null);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (show) {
            setMonth(previousMonth());
            setWarehouse(null);
            setDepartment(null);
            setNotes("");
        }
    }, [show]);

    const submit = () => {
        setSaving(true);
        onCreate({ month, warehouse_id: warehouse?.value || null, department_id: department?.value || null, notes })
            .finally(() => setSaving(false));
    };

    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>{getFormattedMessage("hrm.payroll.new.title")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p className="hrm-form-hint">{getFormattedMessage("hrm.payroll.new.hint")}</p>
                <div className="mb-4">
                    <label className="form-label">{getFormattedMessage("hrm.payroll.month")}:</label>
                    <span className="required" />
                    <input type="month" className="form-control" value={month} onChange={(e) => setMonth(e.target.value)} />
                </div>
                <div className="mb-4">
                    <label className="form-label">{getFormattedMessage("hrm.branch.label")}</label>
                    <Select isClearable styles={portalStyles} menuPortalTarget={document.body} options={toOptions(warehouses)}
                        value={warehouse} placeholder={placeholderText("hrm.branch.all")} onChange={setWarehouse} />
                </div>
                <div className="mb-4">
                    <label className="form-label">{getFormattedMessage("hrm.department.label")}</label>
                    <Select isClearable styles={portalStyles} menuPortalTarget={document.body} options={toOptions(departments)}
                        value={department} placeholder={placeholderText("hrm.department.all")} onChange={setDepartment} />
                </div>
                <div className="mb-2">
                    <label className="form-label">{getFormattedMessage("globally.input.notes.label")}</label>
                    <textarea className="form-control" rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
            </Modal.Body>
            <Modal.Footer>
                <button type="button" className="btn btn-outline-secondary" onClick={onHide}>
                    {getFormattedMessage("globally.cancel-btn")}
                </button>
                <button type="button" className="btn btn-primary" disabled={saving || !month} onClick={submit}>
                    <FiCheck /> {getFormattedMessage(saving ? "hrm.payroll.calculating" : "hrm.payroll.calculate")}
                </button>
            </Modal.Footer>
        </Modal>
    );
};

const PayrollRuns = (props) => {
    const { payrollRuns, totalRecord, isLoading, warehouses, allDepartments, fetchPayrollRuns, createPayrollRun, fetchAllWarehouses, fetchAllDepartments } = props;
    const navigate = useNavigate();
    const [filters, setFilters] = useState({});
    const [newShow, setNewShow] = useState(false);
    const lastFilter = useRef({});
    const firstRun = useRef(true);
    const extraRef = useRef({});

    useEffect(() => {
        fetchAllWarehouses();
        fetchAllDepartments();
    }, []);

    extraRef.current = {
        status: filters.status?.value,
        year: filters.year?.value,
        warehouse_id: filters.warehouse_id?.value,
    };

    useEffect(() => {
        if (firstRun.current) {
            firstRun.current = false;
            return;
        }
        fetchPayrollRuns({ ...lastFilter.current, page: 1 }, true, extraRef.current);
    }, [filters]);

    const onChange = (filter) => {
        lastFilter.current = filter;
        fetchPayrollRuns(filter, true, extraRef.current);
    };

    const create = (data) =>
        createPayrollRun(data)
            .then((run) => {
                setNewShow(false);
                navigate(`/app/payroll-runs/${run.id}`);
            })
            .catch(() => {});

    const filterSelect = (key, options, placeholderKey) => (
        <Select isClearable styles={portalStyles} menuPortalTarget={document.body} options={options}
            value={filters[key] || null} placeholder={placeholderText(placeholderKey)}
            onChange={(option) => setFilters((prev) => ({ ...prev, [key]: option }))} />
    );

    const itemsValue = payrollRuns.map((run) => ({ id: run.id, ...run.attributes }));

    const columns = [
        {
            name: getFormattedMessage("hrm.payroll.month"),
            minWidth: "170px",
            cell: (row) => (
                <Link to={`/app/payroll-runs/${row.id}`} className="text-decoration-none">
                    <span className="hrm-person__name d-block">{row.month_label}</span>
                    <span className="hrm-person__code">
                        {[row.branch_name, row.department_name].filter(Boolean).join(" · ") || placeholderText("hrm.payroll.scope.all")}
                    </span>
                </Link>
            ),
        },
        { name: getFormattedMessage("hrm.payroll.employees"), cell: (row) => row.employee_count },
        { name: getFormattedMessage("hrm.payslip.gross"), cell: (row) => <MoneyCell value={row.gross_total} /> },
        { name: getFormattedMessage("hrm.payslip.total-deductions"), cell: (row) => <MoneyCell value={row.deduction_total} /> },
        { name: getFormattedMessage("hrm.payslip.net-pay"), cell: (row) => <MoneyCell value={row.net_total} strong /> },
        { name: getFormattedMessage("hrm.payroll.employer-cost"), cell: (row) => <MoneyCell value={row.epf_employer_total + row.etf_total} /> },
        { name: getFormattedMessage("globally.detail.status"), cell: (row) => <PayrollStatusBadge status={row.status} /> },
        {
            name: getFormattedMessage("react-data-table.action.column.label"),
            right: true,
            ignoreRowClick: true,
            button: true,
            width: "90px",
            cell: (row) => (
                <Link to={`/app/payroll-runs/${row.id}`} className="action-btn action-btn--view" title={placeholderText("globally.view.tooltip.label")}>
                    <FiArrowRight />
                </Link>
            ),
        },
    ];

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.payroll-runs.title")} />
            <div className="hrm-filter-bar">
                {filterSelect("status", ["draft", "approved", "paid"].map((s) => ({ value: s, label: placeholderText(`hrm.payroll.status.${s}`) })), "hrm.leave.status.all")}
                {filterSelect("year", yearOptions(), "hrm.payroll.year.all")}
                {filterSelect("warehouse_id", toOptions(warehouses), "hrm.branch.all")}
            </div>
            <ReactDataTable
                columns={columns}
                items={itemsValue}
                onChange={onChange}
                isLoading={isLoading}
                totalRows={totalRecord}
                isShowSearch
                AddButton={
                    <Button variant="primary" className="table-toolbar__create" onClick={() => setNewShow(true)}>
                        <FiPlus /> {getFormattedMessage("hrm.payroll.new.title")}
                    </Button>
                }
            />
            <NewRunModal show={newShow} onHide={() => setNewShow(false)} warehouses={warehouses}
                departments={allDepartments} onCreate={create} />
        </MasterLayout>
    );
};

const mapStateToProps = (state) => {
    const { payrollRuns, totalRecord, isLoading, warehouses, allDepartments } = state;
    return { payrollRuns, totalRecord, isLoading, warehouses, allDepartments };
};

export default connect(mapStateToProps, { fetchPayrollRuns, createPayrollRun, fetchAllWarehouses, fetchAllDepartments })(PayrollRuns);
