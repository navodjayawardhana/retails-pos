import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Modal } from "react-bootstrap-v5";
import Select from "react-select";
import { FiCheck } from "react-icons/fi";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { saveLeaveType } from "../../../store/action/hrm/leaveActions";

const portal = { menuPortal: (base) => ({ ...base, zIndex: 9999 }) };

const EMPTY = {
    name: "",
    code: "",
    default_days_per_year: "",
    is_unlimited: false,
    is_paid: true,
    allow_half_day: true,
    carry_forward: false,
    max_carry_forward_days: "",
    requires_document: false,
    gender: "",
    color: "#1E3A8A",
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

const LeaveTypeForm = ({ show, handleClose, leaveType, saveLeaveType, onSaved }) => {
    const [form, setForm] = useState(EMPTY);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const genderOptions = [
        { value: "", label: placeholderText("hrm.leave-type.gender.all") },
        { value: "female", label: placeholderText("hrm.gender.female") },
        { value: "male", label: placeholderText("hrm.gender.male") },
    ];

    useEffect(() => {
        if (!show) return;
        setError("");
        if (leaveType) {
            setForm({
                ...EMPTY,
                ...leaveType,
                default_days_per_year: leaveType.is_unlimited ? "" : leaveType.default_days_per_year,
                max_carry_forward_days: leaveType.max_carry_forward_days ?? "",
                gender: leaveType.gender || "",
                description: leaveType.description || "",
            });
        } else {
            setForm(EMPTY);
        }
    }, [show, leaveType]);

    const set = (key) => (value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setError("");
    };

    const onSubmit = () => {
        if (!form.name.trim()) return setError(getFormattedMessage("globally.input.name.validate.label"));
        if (!form.code.trim()) return setError(getFormattedMessage("hrm.leave-type.code.validate"));
        if (!form.is_unlimited && form.default_days_per_year === "") {
            return setError(getFormattedMessage("hrm.leave-type.days.validate"));
        }
        setSaving(true);
        saveLeaveType(leaveType ? leaveType.id : null, {
            ...form,
            name: form.name.trim(),
            code: form.code.trim().toUpperCase(),
            default_days_per_year: form.is_unlimited ? 0 : form.default_days_per_year,
            max_carry_forward_days: form.carry_forward && form.max_carry_forward_days !== "" ? form.max_carry_forward_days : null,
            gender: form.gender || null,
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
                <Modal.Title>{getFormattedMessage(leaveType ? "hrm.leave-type.edit.title" : "hrm.leave-type.create.title")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="row">
                    <div className="col-md-6 mb-4">
                        <label className="form-label">{getFormattedMessage("globally.input.name.label")}:</label>
                        <span className="required" />
                        <input type="text" className="form-control" value={form.name}
                            placeholder={placeholderText("hrm.leave-type.name.placeholder")}
                            onChange={(e) => set("name")(e.target.value)} />
                    </div>
                    <div className="col-md-3 mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.leave-type.code")}:</label>
                        <span className="required" />
                        <input type="text" className="form-control text-uppercase" value={form.code} maxLength={20}
                            placeholder="AL" onChange={(e) => set("code")(e.target.value)} />
                    </div>
                    <div className="col-md-3 mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.leave-type.color")}</label>
                        <input type="color" className="form-control form-control-color w-100" value={form.color}
                            onChange={(e) => set("color")(e.target.value)} />
                    </div>
                    <div className="col-md-6 mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.leave-type.days-per-year")}:</label>
                        {!form.is_unlimited && <span className="required" />}
                        <input type="number" min="0" max="366" step="0.5" className="form-control"
                            disabled={form.is_unlimited} value={form.is_unlimited ? "" : form.default_days_per_year}
                            placeholder={form.is_unlimited ? placeholderText("hrm.leave.unlimited") : "14"}
                            onChange={(e) => set("default_days_per_year")(e.target.value)} />
                        <span className="hrm-form-hint d-block mt-1">{getFormattedMessage("hrm.leave-type.days-per-year.hint")}</span>
                    </div>
                    <div className="col-md-6 mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.leave-type.gender")}</label>
                        <Select options={genderOptions} styles={portal} menuPortalTarget={document.body}
                            value={genderOptions.find((o) => o.value === (form.gender || ""))}
                            onChange={(option) => set("gender")(option.value)} />
                    </div>
                    <div className="col-md-6 mb-4">
                        <Toggle checked={form.is_unlimited} onChange={set("is_unlimited")}
                            label="hrm.leave-type.unlimited" hint="hrm.leave-type.unlimited.hint" />
                    </div>
                    <div className="col-md-6 mb-4">
                        <Toggle checked={form.is_paid} onChange={set("is_paid")}
                            label="hrm.leave-type.paid" hint="hrm.leave-type.paid.hint" />
                    </div>
                    <div className="col-md-6 mb-4">
                        <Toggle checked={form.allow_half_day} onChange={set("allow_half_day")} label="hrm.leave-type.half-day" />
                    </div>
                    <div className="col-md-6 mb-4">
                        <Toggle checked={form.requires_document} onChange={set("requires_document")}
                            label="hrm.leave-type.document" hint="hrm.leave-type.document.hint" />
                    </div>
                    {!form.is_unlimited && (
                        <>
                            <div className="col-md-6 mb-4">
                                <Toggle checked={form.carry_forward} onChange={set("carry_forward")}
                                    label="hrm.leave-type.carry-forward" hint="hrm.leave-type.carry-forward.hint" />
                            </div>
                            {form.carry_forward && (
                                <div className="col-md-6 mb-4">
                                    <label className="form-label">{getFormattedMessage("hrm.leave-type.max-carry")}</label>
                                    <input type="number" min="0" max="366" step="0.5" className="form-control"
                                        value={form.max_carry_forward_days} placeholder={placeholderText("hrm.leave-type.max-carry.placeholder")}
                                        onChange={(e) => set("max_carry_forward_days")(e.target.value)} />
                                </div>
                            )}
                        </>
                    )}
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

export default connect(null, { saveLeaveType })(LeaveTypeForm);
