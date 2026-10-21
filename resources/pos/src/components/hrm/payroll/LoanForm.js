import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Modal } from "react-bootstrap-v5";
import Select from "react-select";
import { FiCheck } from "react-icons/fi";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { saveEmployeeLoan } from "../../../store/action/hrm/payrollActions";
import { currentMonth, useMoney } from "./payrollShared";

const portal = { menuPortal: (base) => ({ ...base, zIndex: 9999 }) };

const today = () => new Date().toISOString().slice(0, 10);

// Create / edit a loan or salary advance. `employeeId` fixes the employee (employee detail tab).
const LoanForm = ({ show, handleClose, loan, employeeId, employeeOptions = [], saveEmployeeLoan, onSaved }) => {
    const money = useMoney();
    const [form, setForm] = useState({});
    const [mode, setMode] = useState("installments");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!show) return;
        setError("");
        if (loan) {
            setForm({
                employee_id: loan.employee_id,
                type: loan.type,
                amount: loan.amount,
                installments: loan.installments,
                monthly_installment: loan.monthly_installment,
                issued_date: loan.issued_date,
                start_month: loan.start_month,
                reason: loan.reason || "",
            });
            setMode("installments");
        } else {
            setForm({
                employee_id: employeeId || null,
                type: "advance",
                amount: "",
                installments: 1,
                monthly_installment: "",
                issued_date: today(),
                start_month: currentMonth(),
                reason: "",
            });
            setMode("installments");
        }
    }, [show, loan, employeeId]);

    const set = (key) => (value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setError("");
    };

    const amount = Number(form.amount || 0);
    const perMonth = mode === "installments"
        ? (Number(form.installments) > 0 ? amount / Number(form.installments) : 0)
        : Number(form.monthly_installment || 0);
    const months = mode === "installments" ? Number(form.installments || 0) : (perMonth > 0 ? Math.ceil(amount / perMonth) : 0);

    const onSubmit = () => {
        if (!form.employee_id) return setError(getFormattedMessage("hrm.loan.employee.validate"));
        if (!(amount > 0)) return setError(getFormattedMessage("hrm.loan.amount.validate"));
        if (!form.start_month) return setError(getFormattedMessage("hrm.loan.start.validate"));
        if (mode === "installments" && !(Number(form.installments) >= 1)) return setError(getFormattedMessage("hrm.loan.installments.validate"));
        if (mode === "monthly" && !(Number(form.monthly_installment) > 0)) return setError(getFormattedMessage("hrm.loan.monthly.validate"));
        setSaving(true);
        saveEmployeeLoan(loan ? loan.id : null, {
            employee_id: form.employee_id,
            type: form.type,
            amount,
            installments: mode === "installments" ? Number(form.installments) : null,
            monthly_installment: mode === "monthly" ? Number(form.monthly_installment) : null,
            issued_date: form.issued_date,
            start_month: form.start_month,
            reason: form.reason,
        })
            .then(() => {
                handleClose();
                onSaved && onSaved();
            })
            .catch(() => {})
            .finally(() => setSaving(false));
    };

    return (
        <Modal show={show} onHide={handleClose} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>{getFormattedMessage(loan ? "hrm.loan.edit.title" : "hrm.loan.create.title")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="row">
                    {!employeeId && (
                        <div className="col-md-8 mb-4">
                            <label className="form-label">{getFormattedMessage("hrm.employee.title")}:</label>
                            <span className="required" />
                            <Select options={employeeOptions} styles={portal} menuPortalTarget={document.body}
                                value={employeeOptions.find((o) => Number(o.value) === Number(form.employee_id)) || null}
                                placeholder={placeholderText("hrm.employee.select.placeholder")}
                                onChange={(option) => set("employee_id")(option ? option.value : null)} />
                        </div>
                    )}
                    <div className={`${employeeId ? "col-md-6" : "col-md-4"} mb-4`}>
                        <label className="form-label">{getFormattedMessage("hrm.loan.type")}</label>
                        <select className="form-select" value={form.type || "advance"} onChange={(e) => set("type")(e.target.value)}>
                            <option value="advance">{placeholderText("hrm.loan.type.advance")}</option>
                            <option value="loan">{placeholderText("hrm.loan.type.loan")}</option>
                        </select>
                    </div>
                    <div className="col-md-6 mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.amount")}:</label>
                        <span className="required" />
                        <input type="number" min="1" step="0.01" className="form-control" value={form.amount ?? ""}
                            onChange={(e) => set("amount")(e.target.value)} />
                    </div>
                    <div className="col-md-6 mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.loan.issued-date")}</label>
                        <input type="date" className="form-control" value={form.issued_date || ""}
                            onChange={(e) => set("issued_date")(e.target.value)} />
                    </div>
                    <div className="col-md-6 mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.loan.start-month")}:</label>
                        <span className="required" />
                        <input type="month" className="form-control" value={form.start_month || ""}
                            onChange={(e) => set("start_month")(e.target.value)} />
                        <span className="hrm-form-hint d-block mt-1">{getFormattedMessage("hrm.loan.start-month.hint")}</span>
                    </div>
                    <div className="col-md-6 mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.loan.repay-by")}</label>
                        <select className="form-select" value={mode} onChange={(e) => setMode(e.target.value)}>
                            <option value="installments">{placeholderText("hrm.loan.repay-by.installments")}</option>
                            <option value="monthly">{placeholderText("hrm.loan.repay-by.monthly")}</option>
                        </select>
                    </div>
                    {mode === "installments" ? (
                        <div className="col-md-6 mb-4">
                            <label className="form-label">{getFormattedMessage("hrm.loan.installments")}:</label>
                            <span className="required" />
                            <input type="number" min="1" max="120" step="1" className="form-control" value={form.installments ?? ""}
                                onChange={(e) => set("installments")(e.target.value)} />
                        </div>
                    ) : (
                        <div className="col-md-6 mb-4">
                            <label className="form-label">{getFormattedMessage("hrm.loan.monthly-installment")}:</label>
                            <span className="required" />
                            <input type="number" min="1" step="0.01" className="form-control" value={form.monthly_installment ?? ""}
                                onChange={(e) => set("monthly_installment")(e.target.value)} />
                        </div>
                    )}
                    <div className="col-12 mb-4">
                        <div className="hrm-leave-preview">
                            {amount > 0 && months > 0
                                ? `${placeholderText("hrm.loan.plan")}: ${money(perMonth)} × ${months}`
                                : placeholderText("hrm.loan.plan.empty")}
                        </div>
                    </div>
                    <div className="col-12 mb-2">
                        <label className="form-label">{getFormattedMessage("hrm.loan.reason")}</label>
                        <textarea className="form-control" rows={2} value={form.reason || ""} maxLength={1000}
                            onChange={(e) => set("reason")(e.target.value)} />
                    </div>
                    {error && <span className="text-danger d-block fw-400 fs-small mt-2">{error}</span>}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <button type="button" className="btn btn-outline-secondary" onClick={handleClose}>
                    {getFormattedMessage("globally.cancel-btn")}
                </button>
                <button type="button" className="btn btn-primary" disabled={saving} onClick={onSubmit}>
                    <FiCheck /> {getFormattedMessage("globally.save-btn")}
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default connect(null, { saveEmployeeLoan })(LoanForm);
