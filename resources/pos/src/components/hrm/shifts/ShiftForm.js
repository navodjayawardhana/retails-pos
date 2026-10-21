import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Form, Modal } from "react-bootstrap-v5";
import ModelFooter from "../../../shared/components/modelFooter";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { saveShift } from "../../../store/action/hrm/attendanceActions";
import { WEEKDAYS, weekdayLabel } from "../attendance/attendanceShared";

const emptyValue = {
    name: "",
    start_time: "08:30",
    end_time: "17:30",
    break_minutes: 60,
    late_grace_minutes: "",
    half_day_hours: "",
    is_night_shift: false,
    use_custom_off_days: false,
    weekly_off_days: [0],
    description: "",
};

const ShiftForm = ({ show, handleClose, shift, saveShift, onSaved }) => {
    const [value, setValue] = useState(emptyValue);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setValue(
            shift
                ? {
                      name: shift.name || "",
                      start_time: shift.start_time || "08:30",
                      end_time: shift.end_time || "17:30",
                      break_minutes: shift.break_minutes ?? 0,
                      late_grace_minutes: shift.late_grace_minutes ?? "",
                      half_day_hours: shift.half_day_hours ?? "",
                      is_night_shift: !!shift.is_night_shift,
                      use_custom_off_days: Array.isArray(shift.weekly_off_days),
                      weekly_off_days: Array.isArray(shift.weekly_off_days) ? shift.weekly_off_days : [0],
                      description: shift.description || "",
                  }
                : emptyValue
        );
        setError("");
    }, [shift, show]);

    const set = (key) => (e) => {
        const next = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setValue((prev) => ({ ...prev, [key]: next }));
        setError("");
    };

    const toggleDay = (day) =>
        setValue((prev) => ({
            ...prev,
            weekly_off_days: prev.weekly_off_days.includes(day)
                ? prev.weekly_off_days.filter((d) => d !== day)
                : [...prev.weekly_off_days, day].sort(),
        }));

    const onSubmit = (event) => {
        event.preventDefault();
        if (!value.name.trim()) {
            setError(getFormattedMessage("globally.input.name.validate.label"));
            return;
        }
        if (!value.start_time || !value.end_time) {
            setError(getFormattedMessage("hrm.shift.times.validate"));
            return;
        }
        const payload = {
            name: value.name.trim(),
            start_time: value.start_time,
            end_time: value.end_time,
            break_minutes: value.break_minutes === "" ? 0 : Number(value.break_minutes),
            late_grace_minutes: value.late_grace_minutes === "" ? null : Number(value.late_grace_minutes),
            half_day_hours: value.half_day_hours === "" ? null : Number(value.half_day_hours),
            is_night_shift: value.is_night_shift,
            weekly_off_days: value.use_custom_off_days ? value.weekly_off_days : null,
            description: value.description,
        };
        setSaving(true);
        saveShift(shift ? shift.id : null, payload)
            .then(() => {
                handleClose();
                onSaved && onSaved();
            })
            .catch(() => {})
            .finally(() => setSaving(false));
    };

    return (
        <Modal show={show} onHide={handleClose} size="lg" keyboard={true}>
            <Form onSubmit={onSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {getFormattedMessage(shift ? "hrm.shift.edit.title" : "hrm.shift.create.title")}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="row">
                        <div className="col-md-12 mb-4">
                            <label className="form-label">{getFormattedMessage("globally.input.name.label")}:</label>
                            <span className="required" />
                            <input type="text" className="form-control" autoFocus value={value.name}
                                placeholder={placeholderText("hrm.shift.name.placeholder")} onChange={set("name")} />
                        </div>
                        <div className="col-md-6 mb-4">
                            <label className="form-label">{getFormattedMessage("hrm.shift.start")}:</label>
                            <span className="required" />
                            <input type="time" className="form-control" value={value.start_time} onChange={set("start_time")} />
                        </div>
                        <div className="col-md-6 mb-4">
                            <label className="form-label">{getFormattedMessage("hrm.shift.end")}:</label>
                            <span className="required" />
                            <input type="time" className="form-control" value={value.end_time} onChange={set("end_time")} />
                        </div>
                        <div className="col-md-4 mb-4">
                            <label className="form-label">{getFormattedMessage("hrm.shift.break")}</label>
                            <input type="number" min="0" className="form-control" value={value.break_minutes} onChange={set("break_minutes")} />
                        </div>
                        <div className="col-md-4 mb-4">
                            <label className="form-label">{getFormattedMessage("hrm.shift.grace")}</label>
                            <input type="number" min="0" className="form-control" value={value.late_grace_minutes}
                                placeholder={placeholderText("hrm.use-default.placeholder")} onChange={set("late_grace_minutes")} />
                        </div>
                        <div className="col-md-4 mb-4">
                            <label className="form-label">{getFormattedMessage("hrm.shift.half-day")}</label>
                            <input type="number" min="0" step="0.5" className="form-control" value={value.half_day_hours}
                                placeholder={placeholderText("hrm.use-default.placeholder")} onChange={set("half_day_hours")} />
                        </div>
                        <div className="col-md-6 mb-4">
                            <label className="form-check form-switch hrm-toggle">
                                <input type="checkbox" className="form-check-input" checked={value.is_night_shift} onChange={set("is_night_shift")} />
                                <span>
                                    <span className="hrm-toggle__label">{getFormattedMessage("hrm.shift.night")}</span>
                                    <span className="hrm-toggle__hint">{getFormattedMessage("hrm.shift.night.hint")}</span>
                                </span>
                            </label>
                        </div>
                        <div className="col-md-6 mb-4">
                            <label className="form-check form-switch hrm-toggle">
                                <input type="checkbox" className="form-check-input" checked={value.use_custom_off_days} onChange={set("use_custom_off_days")} />
                                <span>
                                    <span className="hrm-toggle__label">{getFormattedMessage("hrm.shift.custom-off-days")}</span>
                                    <span className="hrm-toggle__hint">{getFormattedMessage("hrm.shift.custom-off-days.hint")}</span>
                                </span>
                            </label>
                        </div>
                        {value.use_custom_off_days && (
                            <div className="col-12 mb-4">
                                <div className="hrm-day-picker">
                                    {WEEKDAYS.map((day) => (
                                        <button type="button" key={day}
                                            className={`hrm-day ${value.weekly_off_days.includes(day) ? "hrm-day--active" : ""}`}
                                            onClick={() => toggleDay(day)}>
                                            {weekdayLabel(day)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="col-12 mb-2">
                            <label className="form-label">{getFormattedMessage("hrm.description.label")}</label>
                            <textarea className="form-control" rows={2} value={value.description} onChange={set("description")} />
                        </div>
                        {error && <span className="text-danger d-block fw-400 fs-small">{error}</span>}
                    </div>
                </Modal.Body>
            </Form>
            <ModelFooter onEditRecord={shift} onSubmit={onSubmit} clearField={handleClose} addDisabled={saving || !value.name.trim()} editDisabled={saving} />
        </Modal>
    );
};

export default connect(null, { saveShift })(ShiftForm);
