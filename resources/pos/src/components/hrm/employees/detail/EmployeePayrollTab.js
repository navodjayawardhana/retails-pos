import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import Select from "react-select";
import { FiFileText, FiPlus, FiTrash2 } from "react-icons/fi";
import { getFormattedMessage, placeholderText } from "../../../../shared/sharedMethod";
import {
    fetchAllSalaryComponents,
    fetchSalaryStructure,
    saveSalaryStructure,
    removeSalaryStructureLine,
    fetchLoansFor,
    cancelEmployeeLoan,
    deleteEmployeeLoan,
    fetchEmployeePayslips,
} from "../../../../store/action/hrm/payrollActions";
import LoanForm from "../../payroll/LoanForm";
import LoanSettleModal from "../../payroll/LoanSettleModal";
import PayslipModal from "../../payroll/PayslipModal";
import { LoanActions } from "../../payroll/Loans";
import { num, PayrollStatusBadge, useMoney } from "../../payroll/payrollShared";

const portal = { menuPortal: (base) => ({ ...base, zIndex: 9999 }) };
const today = () => new Date().toISOString().slice(0, 10);

// Employee detail "Payroll" tab: salary structure, loans/advances and payslip history.
const EmployeePayrollTab = (props) => {
    const {
        employee, allSalaryComponents, fetchAllSalaryComponents, fetchSalaryStructure, saveSalaryStructure,
        removeSalaryStructureLine, fetchLoansFor, cancelEmployeeLoan, deleteEmployeeLoan, fetchEmployeePayslips,
    } = props;
    const money = useMoney();
    const [structure, setStructure] = useState(null);
    const [loans, setLoans] = useState([]);
    const [payslips, setPayslips] = useState([]);
    const [adding, setAdding] = useState(false);
    const [line, setLine] = useState({ component: null, value: "", effective_from: today() });
    const [error, setError] = useState("");
    const [loanForm, setLoanForm] = useState(false);
    const [settling, setSettling] = useState(null);
    const [openPayslip, setOpenPayslip] = useState(null);

    const loadStructure = () => fetchSalaryStructure(employee.id).then(setStructure).catch(() => setStructure({ current: [], history: [] }));
    const loadLoans = () => fetchLoansFor(employee.id).then(setLoans).catch(() => {});
    const loadPayslips = () => fetchEmployeePayslips(employee.id).then(setPayslips).catch(() => {});

    useEffect(() => {
        fetchAllSalaryComponents();
    }, []);
    useEffect(() => {
        loadStructure();
        loadLoans();
        loadPayslips();
    }, [employee.id]);

    const components = (allSalaryComponents || []).map((c) => ({ id: c.id, ...c.attributes })).filter((c) => c.is_active);
    const componentOptions = components.map((c) => ({
        value: c.id,
        label: `${c.name} (${placeholderText(`hrm.salary-component.type.${c.type}`)})`,
        component: c,
    }));

    const saveLine = () => {
        if (!line.component) return setError(getFormattedMessage("hrm.salary-structure.component.validate"));
        if (!line.effective_from) return setError(getFormattedMessage("hrm.salary-structure.date.validate"));
        saveSalaryStructure({
            employee_id: employee.id,
            items: [{ salary_component_id: line.component.value, value: line.value === "" ? null : line.value, effective_from: line.effective_from }],
        })
            .then(() => {
                setAdding(false);
                setLine({ component: null, value: "", effective_from: today() });
                loadStructure();
            })
            .catch(() => {});
    };

    const selected = line.component && line.component.component;

    return (
        <div className="hrm-payroll-tab">
            <div className="card mb-5">
                <div className="card-body">
                    <div className="hrm-section-head">
                        <h3 className="hrm-section-title mb-0">{getFormattedMessage("hrm.salary-structure.title")}</h3>
                        {!adding && (
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setAdding(true); setError(""); }}>
                                <FiPlus /> {getFormattedMessage("hrm.salary-structure.add")}
                            </button>
                        )}
                    </div>
                    <p className="hrm-form-hint">
                        {getFormattedMessage(employee.salary_type === "daily" ? "hrm.daily-rate.label" : "hrm.basic-salary.label")}: <strong>{money(employee.basic_salary)}</strong>
                        {employee.commission_percent ? ` · ${placeholderText("hrm.commission-percent.label")}: ${num(employee.commission_percent)}%` : ""}
                    </p>

                    {adding && (
                        <div className="row g-3 align-items-end mb-4">
                            <div className="col-md-5">
                                <label className="form-label">{getFormattedMessage("hrm.salary-component.title")}</label>
                                <Select options={componentOptions} styles={portal} menuPortalTarget={document.body} value={line.component}
                                    placeholder={placeholderText("hrm.salary-structure.component.placeholder")}
                                    onChange={(option) => { setLine({ ...line, component: option }); setError(""); }} />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">
                                    {getFormattedMessage(selected && selected.calculation === "percent_of_basic" ? "hrm.salary-component.default-percent" : "hrm.amount")}
                                </label>
                                <input type="number" min="0" step="0.01" className="form-control" value={line.value}
                                    placeholder={selected ? `${placeholderText("hrm.salary-structure.default")} ${num(selected.default_value)}` : ""}
                                    onChange={(e) => setLine({ ...line, value: e.target.value })} />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label">{getFormattedMessage("hrm.salary-structure.effective-from")}</label>
                                <input type="date" className="form-control" value={line.effective_from}
                                    onChange={(e) => setLine({ ...line, effective_from: e.target.value })} />
                            </div>
                            <div className="col-md-2 d-flex gap-2">
                                <button type="button" className="btn btn-primary" onClick={saveLine}>{getFormattedMessage("globally.save-btn")}</button>
                                <button type="button" className="btn btn-outline-secondary" onClick={() => setAdding(false)}>×</button>
                            </div>
                            {error && <span className="text-danger fs-small">{error}</span>}
                        </div>
                    )}

                    {!structure ? (
                        <div className="text-muted">{getFormattedMessage("hrm.loading")}</div>
                    ) : structure.current.length === 0 ? (
                        <div className="hrm-form-hint">{getFormattedMessage("hrm.salary-structure.empty")}</div>
                    ) : (
                        <table className="table hrm-simple-table mb-0">
                            <thead>
                                <tr>
                                    <th>{getFormattedMessage("hrm.salary-component.title")}</th>
                                    <th>{getFormattedMessage("hrm.salary-component.type")}</th>
                                    <th>{getFormattedMessage("hrm.salary-structure.value")}</th>
                                    <th>{getFormattedMessage("hrm.salary-structure.monthly-amount")}</th>
                                    <th>{getFormattedMessage("hrm.salary-structure.effective-from")}</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {structure.current.map((row) => (
                                    <tr key={row.id}>
                                        <td>
                                            {row.name}
                                            {row.epf_liable && <span className="badge bg-light-info ms-2">EPF</span>}
                                        </td>
                                        <td>
                                            <span className={`badge ${row.type === "earning" ? "bg-light-success" : "bg-light-danger"}`}>
                                                {getFormattedMessage(`hrm.salary-component.type.${row.type}`)}
                                            </span>
                                        </td>
                                        <td>
                                            {row.calculation === "percent_of_basic" ? `${num(row.effective_value)}%` : num(row.effective_value)}
                                            {row.value === null && <span className="hrm-person__code ms-2">({placeholderText("hrm.salary-structure.default")})</span>}
                                        </td>
                                        <td>{money(row.amount)}</td>
                                        <td>{row.effective_from}</td>
                                        <td className="text-end">
                                            <button type="button" className="action-btn action-btn--delete" title={placeholderText("globally.delete.tooltip.label")}
                                                onClick={() => removeSalaryStructureLine(row.id).then(loadStructure).catch(() => {})}>
                                                <FiTrash2 />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    <p className="hrm-form-hint mt-3 mb-0">{getFormattedMessage("hrm.salary-structure.hint")}</p>
                </div>
            </div>

            <div className="card mb-5">
                <div className="card-body">
                    <div className="hrm-section-head">
                        <h3 className="hrm-section-title mb-0">{getFormattedMessage("hrm.loans.title")}</h3>
                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setLoanForm(true)}>
                            <FiPlus /> {getFormattedMessage("hrm.loan.create.title")}
                        </button>
                    </div>
                    {loans.length === 0 ? (
                        <div className="hrm-form-hint">{getFormattedMessage("hrm.loan.empty")}</div>
                    ) : (
                        <table className="table hrm-simple-table mb-0">
                            <thead>
                                <tr>
                                    <th>{getFormattedMessage("hrm.loan.type")}</th>
                                    <th>{getFormattedMessage("hrm.amount")}</th>
                                    <th>{getFormattedMessage("hrm.loan.monthly-installment")}</th>
                                    <th>{getFormattedMessage("hrm.loan.start-month")}</th>
                                    <th>{getFormattedMessage("hrm.loan.balance")}</th>
                                    <th>{getFormattedMessage("globally.detail.status")}</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {loans.map((loan) => (
                                    <tr key={loan.id}>
                                        <td>{getFormattedMessage(`hrm.loan.type.${loan.type}`)}</td>
                                        <td>{money(loan.amount)}</td>
                                        <td>{money(loan.monthly_installment)}</td>
                                        <td>{loan.start_month}</td>
                                        <td><strong>{money(loan.balance)}</strong></td>
                                        <td><PayrollStatusBadge status={loan.status} /></td>
                                        <td className="text-end">
                                            <LoanActions
                                                loan={loan}
                                                onEdit={() => setLoanForm(loan)}
                                                onSettle={setSettling}
                                                onCancel={(l) => cancelEmployeeLoan(l.id).then(loadLoans).catch(() => {})}
                                                onDelete={(l) => deleteEmployeeLoan(l.id).then(loadLoans).catch(() => {})}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <div className="card">
                <div className="card-body">
                    <h3 className="hrm-section-title">{getFormattedMessage("hrm.payslip.history")}</h3>
                    {payslips.length === 0 ? (
                        <div className="hrm-form-hint">{getFormattedMessage("hrm.payslip.history.empty")}</div>
                    ) : (
                        <table className="table hrm-simple-table mb-0">
                            <thead>
                                <tr>
                                    <th>{getFormattedMessage("hrm.payroll.month")}</th>
                                    <th>{getFormattedMessage("hrm.payslip.gross")}</th>
                                    <th>{getFormattedMessage("hrm.payslip.total-deductions")}</th>
                                    <th>{getFormattedMessage("hrm.payslip.net-pay")}</th>
                                    <th>{getFormattedMessage("globally.detail.status")}</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {payslips.map((p) => (
                                    <tr key={p.id}>
                                        <td>{p.month_label}</td>
                                        <td>{money(p.gross_earnings)}</td>
                                        <td>{money(p.total_deductions)}</td>
                                        <td><strong>{money(p.net_pay)}</strong></td>
                                        <td><PayrollStatusBadge status={p.run_status} /></td>
                                        <td className="text-end">
                                            <button type="button" className="action-btn action-btn--view" title={placeholderText("globally.view.tooltip.label")}
                                                onClick={() => setOpenPayslip(p.id)}>
                                                <FiFileText />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <LoanForm show={!!loanForm} loan={loanForm && loanForm !== true ? loanForm : null} employeeId={employee.id}
                handleClose={() => setLoanForm(false)} onSaved={loadLoans} />
            <LoanSettleModal loan={settling} onHide={() => setSettling(null)} onSaved={loadLoans} />
            <PayslipModal payslipId={openPayslip} onHide={() => setOpenPayslip(null)} onChanged={loadPayslips} />
        </div>
    );
};

const mapStateToProps = (state) => ({ allSalaryComponents: state.allSalaryComponents });

export default connect(mapStateToProps, {
    fetchAllSalaryComponents, fetchSalaryStructure, saveSalaryStructure, removeSalaryStructureLine,
    fetchLoansFor, cancelEmployeeLoan, deleteEmployeeLoan, fetchEmployeePayslips,
})(EmployeePayrollTab);
