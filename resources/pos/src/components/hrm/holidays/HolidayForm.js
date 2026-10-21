import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Modal } from "react-bootstrap-v5";
import Select from "react-select";
import { FiCheck, FiPlus, FiX } from "react-icons/fi";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { bulkCreateHolidays, saveHoliday } from "../../../store/action/hrm/attendanceActions";

export const HOLIDAY_TYPES = ["poya", "public", "mercantile", "company"];

const portal = { menuPortal: (base) => ({ ...base, zIndex: 9999 }) };

const HolidayForm = ({ show, handleClose, holiday, warehouses, bulkCreateHolidays, saveHoliday, onSaved }) => {
    const [name, setName] = useState("");
    const [type, setType] = useState("poya");
    const [isPaid, setIsPaid] = useState(true);
    const [branch, setBranch] = useState(null);
    const [dates, setDates] = useState([]);
    const [newDate, setNewDate] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const branchOptions = (warehouses || []).map((w) => ({ value: w.id, label: w.attributes.name }));
    const typeOptions = HOLIDAY_TYPES.map((t) => ({ value: t, label: placeholderText(`hrm.holiday.type.${t}`) }));

    useEffect(() => {
        if (!show) return;
        setError("");
        setNewDate("");
        if (holiday) {
            setName(holiday.name);
            setType(holiday.type);
            setIsPaid(!!holiday.is_paid);
            setBranch(branchOptions.find((o) => Number(o.value) === Number(holiday.warehouse_id)) || null);
            setDates([holiday.date]);
        } else {
            setName(placeholderText("hrm.holiday.poya.default-name"));
            setType("poya");
            setIsPaid(true);
            setBranch(null);
            setDates([]);
        }
    }, [show, holiday]);

    const addDate = () => {
        if (!newDate) return;
        if (!dates.includes(newDate)) setDates([...dates, newDate].sort());
        setNewDate("");
        setError("");
    };

    const onSubmit = () => {
        if (!name.trim()) return setError(getFormattedMessage("globally.input.name.validate.label"));
        const allDates = newDate && !dates.includes(newDate) ? [...dates, newDate] : dates;
        if (!allDates.length) return setError(getFormattedMessage("hrm.holiday.dates.validate"));
        const payload = { name: name.trim(), type, is_paid: isPaid, warehouse_id: branch ? branch.value : null };
        setSaving(true);
        const request = holiday
            ? saveHoliday(holiday.id, { ...payload, date: allDates[0] })
            : bulkCreateHolidays({ ...payload, dates: allDates });
        request
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
                <Modal.Title>{getFormattedMessage(holiday ? "hrm.holiday.edit.title" : "hrm.holiday.create.title")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="row">
                    <div className="col-md-6 mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.holiday.type.label")}:</label>
                        <Select options={typeOptions} styles={portal} menuPortalTarget={document.body}
                            value={typeOptions.find((o) => o.value === type)}
                            onChange={(option) => {
                                setType(option.value);
                                if (option.value === "poya" && !name.trim()) setName(placeholderText("hrm.holiday.poya.default-name"));
                            }} />
                    </div>
                    <div className="col-md-6 mb-4">
                        <label className="form-label">{getFormattedMessage("globally.input.name.label")}:</label>
                        <span className="required" />
                        <input type="text" className="form-control" value={name}
                            placeholder={placeholderText("hrm.holiday.name.placeholder")}
                            onChange={(e) => { setName(e.target.value); setError(""); }} />
                    </div>
                    <div className="col-md-6 mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.branch.label")}</label>
                        <Select isClearable options={branchOptions} styles={portal} menuPortalTarget={document.body}
                            value={branch} placeholder={placeholderText("hrm.holiday.all-branches")} onChange={setBranch} />
                    </div>
                    <div className="col-md-6 mb-4 d-flex align-items-end">
                        <label className="form-check form-switch hrm-toggle mb-0">
                            <input type="checkbox" className="form-check-input" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
                            <span>
                                <span className="hrm-toggle__label">{getFormattedMessage("hrm.holiday.paid")}</span>
                                <span className="hrm-toggle__hint">{getFormattedMessage("hrm.holiday.paid.hint")}</span>
                            </span>
                        </label>
                    </div>
                    <div className="col-12 mb-2">
                        <label className="form-label">
                            {getFormattedMessage(holiday ? "hrm.holiday.date.label" : "hrm.holiday.dates.label")}:
                        </label>
                        <span className="required" />
                        {holiday ? (
                            <input type="date" className="form-control" value={dates[0] || ""}
                                onChange={(e) => setDates([e.target.value])} />
                        ) : (
                            <>
                                <div className="d-flex gap-2">
                                    <input type="date" className="form-control" value={newDate}
                                        onChange={(e) => setNewDate(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDate())} />
                                    <button type="button" className="btn btn-outline-secondary table-toolbar__btn" onClick={addDate}>
                                        <FiPlus /> {getFormattedMessage("hrm.holiday.add-date")}
                                    </button>
                                </div>
                                <span className="hrm-form-hint d-block mt-1">{getFormattedMessage("hrm.holiday.dates.hint")}</span>
                                {dates.length > 0 && (
                                    <div className="hrm-date-chips mt-3">
                                        {dates.map((date) => (
                                            <span className="hrm-date-chip" key={date}>
                                                {date}
                                                <button type="button" onClick={() => setDates(dates.filter((d) => d !== date))}>
                                                    <FiX />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
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

export default connect(null, { bulkCreateHolidays, saveHoliday })(HolidayForm);
