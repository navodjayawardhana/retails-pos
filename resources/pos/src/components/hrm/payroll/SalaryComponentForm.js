import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Modal } from "react-bootstrap-v5";
import { FiCheck } from "react-icons/fi";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { saveSalaryComponent } from "../../../store/action/hrm/payrollActions";

const EMPTY = {
    name: "",
    code: "",
    type: "earning",
    calculation: "fixed",
    default_value: "",
    epf_liable: false,
    taxable: false,
    is_active: true,
    description: "",
};

const Toggle = ({ checked, onChange, label, hint }) => (
    <label className="form-check form-switch hrm-toggle mb-0">
        <input type="checkbox" className="form-check-input" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span>
            <span className="hrm-toggle__label">{getFormattedMessage(label)}</span>
            {hint && <span className="hrm-toggle__hint">{getFormattedMessage(hint)}</span>}
        </span>
    </label>
);

const SalaryComponentForm = ({ show, handleClose, component, saveSalaryComponent, onSaved }) => {
    const [form, setForm] = useState(EMPTY);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!show) return;
        setError("");
        setForm(component ? { ...EMPTY, ...component, description: component.description || "" } : EMPTY);
    }, [show, component]);

    const set = (key) => (value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setError("");
    };

    const onSubmit = () => {
        if (!form.name.trim()) return setError(getFormattedMessage("globally.input.name.validate.label"));
        if (!form.code.trim()) return setError(getFormattedMessage("hrm.salary-component.code.validate"));
        if (form.default_value === "" || Number(form.default_value) < 0) {
            return setError(getFormattedMessage("hrm.salary-component.value.validate"));
        }
        setSaving(true);
        saveSalaryComponent(component ? component.id : null, {
            ...form,
            name: form.name.trim(),
            code: form.code.trim().toUpperCase(),
            epf_liable: form.type === "earning" && form.epf_liable,
        })
            .then(() => {
                handleClose();
                onSaved && onSaved();
            })
            .catch(() => {})
            .finally(() => setSaving(false));
    };

    const percent = form.calculation === "percent_of_basic";

    return (
        <Modal show={show} onHide={handleClose} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>{getFormattedMessage(component ? "hrm.salary-component.edit.title" : "hrm.salary-component.create.title")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="row">
                    <div className="col-md-8 mb-4">
                        <label className="form-label">{getFormattedMessage("globally.input.name.label")}:</label>
                        <span className="required" />
                        <input type="text" className="form-control" value={form.name}
                            placeholder={placeholderText("hrm.salary-component.name.placeholder")}
                            onChange={(e) => set("name")(e.target.value)} />
                    </div>
                    <div className="col-md-4 mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.leave-type.code")}:</label>
                        <span className="required" />
                        <input type="text" className="form-control text-uppercase" value={form.code} maxLength={20}
                            placeholder="TRA" onChange={(e) => set("code")(e.target.value)} />
                    </div>
                    <div className="col-md-4 mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.salary-component.type")}</label>
                        <select className="form-select" value={form.type} onChange={(e) => set("type")(e.target.value)}>
                            <option value="earning">{placeholderText("hrm.salary-component.type.earning")}</option>
                            <option value="deduction">{placeholderText("hrm.salary-component.type.deduction")}</option>
                        </select>
                    </div>
                    <div className="col-md-4 mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.salary-component.calculation")}</label>
                        <select className="form-select" value={form.calculation} onChange={(e) => set("calculation")(e.target.value)}>
                            <option value="fixed">{placeholderText("hrm.salary-component.calc.fixed")}</option>
                            <option value="percent_of_basic">{placeholderText("hrm.salary-component.calc.percent")}</option>
                        </select>
                    </div>
                    <div className="col-md-4 mb-4">
                        <label className="form-label">
                            {getFormattedMessage(percent ? "hrm.salary-component.default-percent" : "hrm.salary-component.default-amount")}:
                        </label>
                        <span className="required" />
                        <div className="input-group">
                            <input type="number" min="0" step="0.01" className="form-control" value={form.default_value}
                                onChange={(e) => set("default_value")(e.target.value)} />
                            {percent && <span className="input-group-text">%</span>}
                        </div>
                        <span className="hrm-form-hint d-block mt-1">{getFormattedMessage("hrm.salary-component.default.hint")}</span>
                    </div>
                    {form.type === "earning" && (
                        <div className="col-md-6 mb-4">
                            <Toggle checked={form.epf_liable} onChange={set("epf_liable")}
                                label="hrm.salary-component.epf-liable" hint="hrm.salary-component.epf-liable.hint" />
                        </div>
                    )}
                    <div className="col-md-6 mb-4">
                        <Toggle checked={form.taxable} onChange={set("taxable")}
                            label="hrm.salary-component.taxable" hint="hrm.salary-component.taxable.hint" />
                    </div>
                    <div className="col-md-6 mb-4">
                        <Toggle checked={form.is_active} onChange={set("is_active")} label="hrm.leave-type.active" />
                    </div>
                    <div className="col-12 mb-2">
                        <label className="form-label">{getFormattedMessage("globally.input.notes.label")}</label>
                        <textarea className="form-control" rows={2} value={form.description} maxLength={1000}
                            onChange={(e) => set("description")(e.target.value)} />
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

export default connect(null, { saveSalaryComponent })(SalaryComponentForm);
