import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { Modal } from "react-bootstrap-v5";
import DataTable from "react-data-table-component";
import {
    FiCalendar, FiCheck, FiCheckCircle, FiDollarSign, FiDownload, FiFileText, FiHome, FiLayers, FiRefreshCw, FiTrash2, FiUsers,
} from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import HeaderTitle from "../../header/HeaderTitle";
import DeleteModel from "../../../shared/action-buttons/DeleteModel";
import EmptyComponent from "../../empty-component/EmptyComponent";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import {
    fetchPayrollRun,
    recalculatePayrollRun,
    approvePayrollRun,
    payPayrollRun,
    deletePayrollRun,
    downloadRunPayslips,
    downloadRunSummary,
    downloadRunBankSheet,
} from "../../../store/action/hrm/payrollActions";
import PayslipModal from "./PayslipModal";
import { num, PayrollStatusBadge, useMoney } from "./payrollShared";

const ConfirmModal = ({ show, title, body, confirmLabel, onHide, onConfirm, busy, children }) => (
    <Modal show={show} onHide={onHide}>
        <Modal.Header closeButton>
            <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <p className="mb-3">{body}</p>
            {children}
        </Modal.Body>
        <Modal.Footer>
            <button type="button" className="btn btn-outline-secondary" onClick={onHide}>{getFormattedMessage("globally.cancel-btn")}</button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={onConfirm}><FiCheck /> {confirmLabel}</button>
        </Modal.Footer>
    </Modal>
);

const PayrollRunDetail = (props) => {
    const {
        fetchPayrollRun, recalculatePayrollRun, approvePayrollRun, payPayrollRun, deletePayrollRun,
        downloadRunPayslips, downloadRunSummary, downloadRunBankSheet,
    } = props;
    const { id } = useParams();
    const navigate = useNavigate();
    const money = useMoney();
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(false);
    const [openPayslip, setOpenPayslip] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [createExpense, setCreateExpense] = useState(true);
    const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
    const [deleting, setDeleting] = useState(false);

    const load = () => fetchPayrollRun(id).then(setData).catch(() => navigate("/app/payroll-runs"));
    useEffect(() => {
        load();
    }, [id]);

    const run = data && data.run;
    const isDraft = run && run.status === "draft";

    const act = (promise) => {
        setBusy(true);
        return promise.then(load).catch(() => {}).finally(() => {
            setBusy(false);
            setConfirm(null);
        });
    };

    const columns = [
        {
            name: getFormattedMessage("hrm.employee.title"),
            minWidth: "210px",
            cell: (row) => (
                <span>
                    <span className="hrm-person__name d-block">{row.employee_name}</span>
                    <span className="hrm-person__code">{row.employee_code}{row.designation_name ? ` · ${row.designation_name}` : ""}</span>
                </span>
            ),
        },
        { name: getFormattedMessage("hrm.payslip.payable-days"), cell: (row) => num(row.payable_days, 1) },
        { name: getFormattedMessage("hrm.payslip.absent"), cell: (row) => num(row.absent_days, 1) },
        { name: getFormattedMessage("hrm.payslip.ot-hours"), cell: (row) => num(row.ot_hours) },
        { name: getFormattedMessage("hrm.payslip.gross"), cell: (row) => <span className="text-nowrap">{money(row.gross_earnings)}</span> },
        { name: getFormattedMessage("hrm.payslip.total-deductions"), cell: (row) => <span className="text-nowrap">{money(row.total_deductions)}</span> },
        { name: getFormattedMessage("hrm.payslip.net-pay"), cell: (row) => <strong className="text-nowrap">{money(row.net_pay)}</strong> },
        {
            name: "",
            right: true,
            width: "70px",
            cell: (row) => (
                <button type="button" className="action-btn action-btn--view" title={placeholderText("globally.view.tooltip.label")}
                    onClick={() => setOpenPayslip(row.id)}>
                    <FiFileText />
                </button>
            ),
        },
    ];

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.payroll-run.title")} />
            <HeaderTitle title={run ? `${placeholderText("hrm.payroll-run.title")} · ${run.month_label}` : placeholderText("hrm.payroll-run.title")}
                to="/app/payroll-runs" />
            {!run ? (
                <div className="text-center py-5 text-muted">{getFormattedMessage("hrm.loading")}</div>
            ) : (
                <>
                    <div className="detail-summary">
                        <div className="detail-summary__items">
                            {[
                                [<FiCalendar />, "hrm.payroll.month", run.month_label],
                                [<FiHome />, "hrm.branch.label", run.branch_name || placeholderText("hrm.branch.all")],
                                [<FiLayers />, "hrm.department.label", run.department_name || placeholderText("hrm.department.all")],
                                [<FiUsers />, "hrm.payroll.employees", run.employee_count],
                            ].map(([icon, label, value]) => (
                                <div className="detail-summary__item" key={label}>
                                    <span className="detail-summary__icon">{icon}</span>
                                    <div>
                                        <div className="detail-summary__label">{getFormattedMessage(label)}</div>
                                        <div className="detail-summary__value">{value}</div>
                                    </div>
                                </div>
                            ))}
                            <div className="detail-summary__item">
                                <span className="detail-summary__icon"><FiCheckCircle /></span>
                                <div>
                                    <div className="detail-summary__label">{getFormattedMessage("globally.detail.status")}</div>
                                    <div className="detail-summary__value"><PayrollStatusBadge status={run.status} /></div>
                                </div>
                            </div>
                        </div>
                        <div className="detail-summary__total">
                            <div className="detail-summary__label">{getFormattedMessage("hrm.payslip.net-pay")}</div>
                            <div className="detail-summary__amount">{money(run.net_total)}</div>
                        </div>
                    </div>

                    <div className="hrm-payroll-totals">
                        {[
                            ["hrm.payslip.gross", run.gross_total],
                            ["hrm.payslip.total-deductions", run.deduction_total],
                            ["hrm.payroll.epf-employee", run.epf_employee_total],
                            ["hrm.payroll.epf-employer", run.epf_employer_total],
                            ["hrm.payroll.etf", run.etf_total],
                            ["hrm.payroll.employer-cost", run.epf_employer_total + run.etf_total],
                        ].map(([label, value]) => (
                            <div className="hrm-payroll-total" key={label}>
                                <span className="hrm-payroll-total__label">{getFormattedMessage(label)}</span>
                                <span className="hrm-payroll-total__value">{money(value)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="hrm-payroll-actions">
                        {isDraft && (
                            <>
                                <button type="button" className="btn btn-outline-secondary" disabled={busy}
                                    onClick={() => act(recalculatePayrollRun(run.id))}>
                                    <FiRefreshCw /> {getFormattedMessage("hrm.payroll.recalculate")}
                                </button>
                                <button type="button" className="btn btn-primary" disabled={busy || !run.employee_count}
                                    onClick={() => setConfirm("approve")}>
                                    <FiCheck /> {getFormattedMessage("hrm.payroll.approve")}
                                </button>
                                <button type="button" className="btn btn-outline-danger" disabled={busy} onClick={() => setDeleting(true)}>
                                    <FiTrash2 /> {getFormattedMessage("globally.delete.tooltip.label")}
                                </button>
                            </>
                        )}
                        {run.status === "approved" && (
                            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => setConfirm("pay")}>
                                <FiDollarSign /> {getFormattedMessage("hrm.payroll.mark-paid")}
                            </button>
                        )}
                        <span className="flex-grow-1" />
                        <button type="button" className="btn btn-outline-secondary" disabled={!run.employee_count} onClick={() => downloadRunPayslips(run.id)}>
                            <FiDownload /> {getFormattedMessage("hrm.payroll.payslips-pdf")}
                        </button>
                        <button type="button" className="btn btn-outline-secondary" onClick={() => downloadRunSummary(run.id)}>
                            <FiDownload /> {getFormattedMessage("hrm.payroll.summary-excel")}
                        </button>
                        <button type="button" className="btn btn-outline-secondary" onClick={() => downloadRunBankSheet(run.id)}>
                            <FiDownload /> {getFormattedMessage("hrm.payroll.bank-excel")}
                        </button>
                    </div>

                    {isDraft && <p className="hrm-form-hint">{getFormattedMessage("hrm.payroll.draft.hint")}</p>}
                    {run.status !== "draft" && run.approved_by_name && (
                        <p className="hrm-form-hint">
                            {placeholderText("hrm.payroll.approved-by")} {run.approved_by_name}
                            {run.paid_at ? ` · ${placeholderText("hrm.payroll.status.paid")}` : ""}
                            {run.expense_id ? ` · ${placeholderText("hrm.payroll.expense-recorded")}` : ""}
                        </p>
                    )}
                    {run.skipped && run.skipped.length > 0 && (
                        <div className="alert alert-warning">
                            <strong>{getFormattedMessage("hrm.payroll.skipped")}</strong>
                            <ul className="mb-0 mt-1">
                                {run.skipped.map((s) => (
                                    <li key={s.employee_id}>{s.employee_code} · {s.employee_name}: {s.reason}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="card">
                        <div className="card-body">
                            <DataTable
                                columns={columns}
                                data={data.payslips}
                                noDataComponent={<EmptyComponent />}
                                pagination={data.payslips.length > 25}
                                paginationPerPage={25}
                                highlightOnHover
                                pointerOnHover
                                onRowClicked={(row) => setOpenPayslip(row.id)}
                            />
                        </div>
                    </div>
                </>
            )}

            <PayslipModal payslipId={openPayslip} onHide={() => setOpenPayslip(null)} onChanged={load} />

            <ConfirmModal
                show={confirm === "approve"}
                title={getFormattedMessage("hrm.payroll.approve")}
                body={getFormattedMessage("hrm.payroll.approve.confirm")}
                confirmLabel={getFormattedMessage("hrm.payroll.approve")}
                busy={busy}
                onHide={() => setConfirm(null)}
                onConfirm={() => act(approvePayrollRun(run.id))}
            />
            <ConfirmModal
                show={confirm === "pay"}
                title={getFormattedMessage("hrm.payroll.mark-paid")}
                body={getFormattedMessage("hrm.payroll.pay.confirm")}
                confirmLabel={getFormattedMessage("hrm.payroll.mark-paid")}
                busy={busy}
                onHide={() => setConfirm(null)}
                onConfirm={() => act(payPayrollRun(run.id, { create_expense: createExpense, paid_date: paidDate }))}
            >
                <div className="mb-3">
                    <label className="form-label">{getFormattedMessage("hrm.payroll.paid-date")}</label>
                    <input type="date" className="form-control" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
                </div>
                <label className="form-check form-switch hrm-toggle">
                    <input type="checkbox" className="form-check-input" checked={createExpense} onChange={(e) => setCreateExpense(e.target.checked)} />
                    <span>
                        <span className="hrm-toggle__label">{getFormattedMessage("hrm.payroll.create-expense")}</span>
                        <span className="hrm-toggle__hint">{getFormattedMessage("hrm.payroll.create-expense.hint")}</span>
                    </span>
                </label>
            </ConfirmModal>
            {deleting && (
                <DeleteModel
                    deleteModel={deleting}
                    onClickDeleteModel={() => setDeleting(false)}
                    deleteUserClick={() => {
                        setDeleting(false);
                        deletePayrollRun(run.id).then(() => navigate("/app/payroll-runs")).catch(() => {});
                    }}
                    name={getFormattedMessage("hrm.payroll-run.title")}
                />
            )}
        </MasterLayout>
    );
};

export default connect(null, {
    fetchPayrollRun, recalculatePayrollRun, approvePayrollRun, payPayrollRun, deletePayrollRun,
    downloadRunPayslips, downloadRunSummary, downloadRunBankSheet,
})(PayrollRunDetail);
