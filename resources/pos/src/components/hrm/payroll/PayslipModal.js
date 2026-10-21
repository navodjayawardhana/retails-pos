import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Modal } from "react-bootstrap-v5";
import { FiDownload, FiPlus } from "react-icons/fi";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import {
    fetchPayslip,
    downloadPayslip,
    addPayslipAdjustment,
    removePayslipAdjustment,
} from "../../../store/action/hrm/payrollActions";
import { PayrollStatusBadge, PayslipDayFacts, PayslipLines, useMoney } from "./payrollShared";

const EMPTY = { type: "earning", label: "", amount: "", epf_liable: false };

// Shows one payslip. Admin (draft run): add/remove manual adjustments. isSelf: own payslip, read only.
const PayslipModal = ({ payslipId, onHide, onChanged, isSelf = false, fetchPayslip, downloadPayslip, addPayslipAdjustment, removePayslipAdjustment }) => {
    const money = useMoney();
    const [payslip, setPayslip] = useState(null);
    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setPayslip(null);
        setAdding(false);
        setForm(EMPTY);
        if (payslipId) fetchPayslip(payslipId, isSelf).then(setPayslip).catch(onHide);
    }, [payslipId]);

    const editable = !isSelf && payslip && payslip.run_status === "draft";

    const saveAdjustment = () => {
        if (!form.label.trim()) return setError(getFormattedMessage("hrm.payslip.adjustment.label.validate"));
        if (!(Number(form.amount) > 0)) return setError(getFormattedMessage("hrm.payslip.adjustment.amount.validate"));
        setBusy(true);
        addPayslipAdjustment(payslip.id, { ...form, label: form.label.trim() })
            .then((fresh) => {
                setPayslip(fresh);
                setAdding(false);
                setForm(EMPTY);
                onChanged && onChanged(fresh);
            })
            .catch(() => {})
            .finally(() => setBusy(false));
    };

    const removeAdjustment = (item) => {
        setBusy(true);
        removePayslipAdjustment(payslip.id, item.id)
            .then((fresh) => {
                setPayslip(fresh);
                onChanged && onChanged(fresh);
            })
            .catch(() => {})
            .finally(() => setBusy(false));
    };

    return (
        <Modal show={!!payslipId} onHide={onHide} size="xl">
            <Modal.Header closeButton>
                <Modal.Title>
                    {getFormattedMessage("hrm.payslip.title")}
                    {payslip && <span className="hrm-payslip-period">{payslip.month_label}</span>}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {!payslip ? (
                    <div className="text-center py-5 text-muted">{getFormattedMessage("hrm.loading")}</div>
                ) : (
                    <>
                        <div className="hrm-payslip-head">
                            <div>
                                <div className="hrm-payslip-head__name">{payslip.employee_name}</div>
                                <div className="hrm-payslip-head__sub">
                                    {payslip.employee_code}
                                    {payslip.designation_name ? ` · ${payslip.designation_name}` : ""}
                                    {payslip.department_name ? ` · ${payslip.department_name}` : ""}
                                    {payslip.branch_name ? ` · ${payslip.branch_name}` : ""}
                                </div>
                            </div>
                            <div className="text-end">
                                <PayrollStatusBadge status={payslip.run_status} />
                                <div className="hrm-payslip-head__sub mt-1">
                                    {getFormattedMessage(payslip.salary_type === "daily" ? "hrm.salary-type.daily" : "hrm.salary-type.monthly")}
                                    {" · "}
                                    {money(payslip.basic_salary)}
                                </div>
                            </div>
                        </div>
                        <PayslipDayFacts payslip={payslip} />
                        <PayslipLines payslip={payslip} money={money} onRemoveAdjustment={editable && !busy ? removeAdjustment : null} />

                        {editable && (
                            <div className="hrm-payslip-adjust">
                                {!adding ? (
                                    <button type="button" className="btn btn-outline-secondary" onClick={() => setAdding(true)}>
                                        <FiPlus /> {getFormattedMessage("hrm.payslip.adjustment.add")}
                                    </button>
                                ) : (
                                    <div className="row g-3 align-items-end">
                                        <div className="col-md-3">
                                            <label className="form-label">{getFormattedMessage("hrm.payslip.adjustment.type")}</label>
                                            <select className="form-select" value={form.type}
                                                onChange={(e) => setForm({ ...form, type: e.target.value, epf_liable: false })}>
                                                <option value="earning">{placeholderText("hrm.salary-component.type.earning")}</option>
                                                <option value="deduction">{placeholderText("hrm.salary-component.type.deduction")}</option>
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">{getFormattedMessage("hrm.payslip.adjustment.label")}</label>
                                            <input className="form-control" value={form.label} maxLength={191}
                                                placeholder={placeholderText("hrm.payslip.adjustment.label.placeholder")}
                                                onChange={(e) => { setForm({ ...form, label: e.target.value }); setError(""); }} />
                                        </div>
                                        <div className="col-md-2">
                                            <label className="form-label">{getFormattedMessage("hrm.amount")}</label>
                                            <input type="number" min="0" step="0.01" className="form-control" value={form.amount}
                                                onChange={(e) => { setForm({ ...form, amount: e.target.value }); setError(""); }} />
                                        </div>
                                        {form.type === "earning" && (
                                            <div className="col-md-3">
                                                <label className="form-check form-switch mb-2">
                                                    <input type="checkbox" className="form-check-input" checked={form.epf_liable}
                                                        onChange={(e) => setForm({ ...form, epf_liable: e.target.checked })} />
                                                    <span className="form-check-label">{getFormattedMessage("hrm.salary-component.epf-liable")}</span>
                                                </label>
                                            </div>
                                        )}
                                        <div className="col-12 d-flex gap-2">
                                            <button type="button" className="btn btn-primary" disabled={busy} onClick={saveAdjustment}>
                                                {getFormattedMessage("globally.save-btn")}
                                            </button>
                                            <button type="button" className="btn btn-outline-secondary" onClick={() => { setAdding(false); setError(""); }}>
                                                {getFormattedMessage("globally.cancel-btn")}
                                            </button>
                                        </div>
                                        {error && <span className="text-danger fs-small">{error}</span>}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <button type="button" className="btn btn-outline-secondary" onClick={onHide}>
                    {getFormattedMessage("globally.close-btn")}
                </button>
                {payslip && (
                    <button type="button" className="btn btn-primary" onClick={() => downloadPayslip(payslip.id, isSelf)}>
                        <FiDownload /> {getFormattedMessage("hrm.payslip.download")}
                    </button>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default connect(null, { fetchPayslip, downloadPayslip, addPayslipAdjustment, removePayslipAdjustment })(PayslipModal);
