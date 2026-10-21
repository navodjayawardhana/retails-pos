import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Modal } from "react-bootstrap-v5";
import { FiCheck } from "react-icons/fi";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { settleEmployeeLoan } from "../../../store/action/hrm/payrollActions";
import { useMoney } from "./payrollShared";

// Manual (early) repayment of a loan/advance, outside payroll.
const LoanSettleModal = ({ loan, onHide, onSaved, settleEmployeeLoan }) => {
    const money = useMoney();
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState("");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!loan) return;
        setAmount(loan.balance);
        setDate(new Date().toISOString().slice(0, 10));
        setNotes("");
        setError("");
    }, [loan]);

    const onSubmit = () => {
        const value = Number(amount);
        if (!(value > 0) || value > Number(loan.balance) + 0.001) {
            return setError(`${placeholderText("hrm.loan.settle.amount.validate")} ${money(loan.balance)}`);
        }
        setSaving(true);
        settleEmployeeLoan(loan.id, { amount: value, date, notes })
            .then(() => {
                onHide();
                onSaved && onSaved();
            })
            .catch(() => {})
            .finally(() => setSaving(false));
    };

    return (
        <Modal show={!!loan} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>{getFormattedMessage("hrm.loan.settle.title")}</Modal.Title>
            </Modal.Header>
            {loan && (
                <Modal.Body>
                    <p className="hrm-form-hint">
                        {loan.employee_name} · {getFormattedMessage(`hrm.loan.type.${loan.type}`)} · {placeholderText("hrm.loan.balance")}: <strong>{money(loan.balance)}</strong>
                    </p>
                    <div className="mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.amount")}</label>
                        <input type="number" min="0.01" step="0.01" className="form-control" value={amount}
                            onChange={(e) => { setAmount(e.target.value); setError(""); }} />
                    </div>
                    <div className="mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.date")}</label>
                        <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div className="mb-2">
                        <label className="form-label">{getFormattedMessage("globally.input.notes.label")}</label>
                        <textarea className="form-control" rows={2} value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                    {error && <span className="text-danger fs-small">{error}</span>}
                </Modal.Body>
            )}
            <Modal.Footer>
                <button type="button" className="btn btn-outline-secondary" onClick={onHide}>
                    {getFormattedMessage("globally.cancel-btn")}
                </button>
                <button type="button" className="btn btn-primary" disabled={saving} onClick={onSubmit}>
                    <FiCheck /> {getFormattedMessage("hrm.loan.settle.save")}
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default connect(null, { settleEmployeeLoan })(LoanSettleModal);
