import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Modal } from "react-bootstrap-v5";
import Select from "react-select";
import { FiCheck, FiPaperclip } from "react-icons/fi";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { applyLeave, previewLeave } from "../../../store/action/hrm/leaveActions";
import { formatDays } from "./leaveShared";
import { todayString } from "../attendance/attendanceShared";

const portal = { menuPortal: (base) => ({ ...base, zIndex: 9999 }) };

/**
 * Apply for leave. Admin mode (isSelf=false) picks the employee and can approve straight away;
 * self mode applies for the logged-in user's own employee.
 * leaveTypes: [{ id, name, allow_half_day, requires_document, is_unlimited, gender }]
 */
const ApplyLeaveModal = ({ show, onHide, onSaved, isSelf, employeeOptions, leaveTypes, defaultEmployeeId, applyLeave, previewLeave }) => {
    const [employee, setEmployee] = useState(null);
    const [type, setType] = useState(null);
    const [isHalfDay, setIsHalfDay] = useState(false);
    const [halfSession, setHalfSession] = useState("first");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [reason, setReason] = useState("");
    const [attachment, setAttachment] = useState(null);
    const [approveNow, setApproveNow] = useState(false);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const fileRef = useRef();
    const previewSeq = useRef(0);

    const typeOptions = (leaveTypes || [])
        .filter((t) => t.is_active !== false)
        .map((t) => ({ value: t.id, label: t.name, type: t }));
    const selectedType = type ? type.type : null;

    useEffect(() => {
        if (!show) return;
        const today = todayString();
        setEmployee(defaultEmployeeId && employeeOptions
            ? employeeOptions.find((o) => Number(o.value) === Number(defaultEmployeeId)) || null
            : null);
        setType(null);
        setIsHalfDay(false);
        setHalfSession("first");
        setFromDate(today);
        setToDate(today);
        setReason("");
        setAttachment(null);
        setApproveNow(false);
        setPreview(null);
        setError("");
    }, [show]);

    // live day count + balance
    useEffect(() => {
        if (!show || !type || !fromDate || (!isSelf && !employee)) {
            setPreview(null);
            return;
        }
        const seq = ++previewSeq.current;
        const timer = setTimeout(() => {
            previewLeave({
                employee_id: isSelf ? undefined : employee.value,
                leave_type_id: type.value,
                from_date: fromDate,
                to_date: isHalfDay ? fromDate : toDate || fromDate,
                is_half_day: isHalfDay ? 1 : undefined,
                half_session: isHalfDay ? halfSession : undefined,
            }, isSelf).then((data) => {
                if (seq === previewSeq.current) setPreview(data);
            });
        }, 250);
        return () => clearTimeout(timer);
    }, [show, employee, type, fromDate, toDate, isHalfDay, halfSession]);

    const onFromChange = (value) => {
        setFromDate(value);
        if (!toDate || toDate < value) setToDate(value);
        setError("");
    };

    const onSubmit = () => {
        if (!isSelf && !employee) return setError(getFormattedMessage("hrm.leave.employee.validate"));
        if (!type) return setError(getFormattedMessage("hrm.leave.type.validate"));
        if (!fromDate) return setError(getFormattedMessage("hrm.leave.dates.validate"));
        if (selectedType && selectedType.requires_document && !attachment) {
            return setError(getFormattedMessage("hrm.leave.document.validate"));
        }
        setSaving(true);
        applyLeave({
            employee_id: isSelf ? undefined : employee.value,
            leave_type_id: type.value,
            from_date: fromDate,
            to_date: isHalfDay ? fromDate : toDate || fromDate,
            is_half_day: isHalfDay,
            half_session: isHalfDay ? halfSession : undefined,
            reason: reason.trim(),
            attachment,
            approve_now: !isSelf && approveNow,
        }, isSelf)
            .then(() => {
                onHide();
                onSaved && onSaved();
            })
            .catch(() => {})
            .finally(() => setSaving(false));
    };

    return (
        <Modal show={show} onHide={onHide} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>{getFormattedMessage(isSelf ? "hrm.leave.apply.title" : "hrm.leave.add.title")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="row">
                    {!isSelf && (
                        <div className="col-md-6 mb-4">
                            <label className="form-label">{getFormattedMessage("hrm.employee.title")}:</label>
                            <span className="required" />
                            <Select options={employeeOptions || []} styles={portal} menuPortalTarget={document.body}
                                value={employee} placeholder={placeholderText("hrm.leave.employee.placeholder")}
                                onChange={(option) => { setEmployee(option); setError(""); }} />
                        </div>
                    )}
                    <div className={`${isSelf ? "col-md-12" : "col-md-6"} mb-4`}>
                        <label className="form-label">{getFormattedMessage("hrm.leave-type.title")}:</label>
                        <span className="required" />
                        <Select options={typeOptions} styles={portal} menuPortalTarget={document.body}
                            value={type} placeholder={placeholderText("hrm.leave.type.placeholder")}
                            onChange={(option) => {
                                setType(option);
                                if (option && !option.type.allow_half_day) setIsHalfDay(false);
                                setError("");
                            }} />
                    </div>
                    {selectedType && selectedType.allow_half_day && (
                        <div className="col-12 mb-4">
                            <label className="form-check form-switch hrm-toggle mb-0">
                                <input type="checkbox" className="form-check-input" checked={isHalfDay}
                                    onChange={(e) => setIsHalfDay(e.target.checked)} />
                                <span>
                                    <span className="hrm-toggle__label">{getFormattedMessage("hrm.leave.half-day")}</span>
                                    <span className="hrm-toggle__hint">{getFormattedMessage("hrm.leave.half-day.hint")}</span>
                                </span>
                            </label>
                        </div>
                    )}
                    <div className="col-md-6 mb-4">
                        <label className="form-label">
                            {getFormattedMessage(isHalfDay ? "hrm.holiday.date.label" : "hrm.leave.from")}:
                        </label>
                        <span className="required" />
                        <input type="date" className="form-control" value={fromDate} onChange={(e) => onFromChange(e.target.value)} />
                    </div>
                    <div className="col-md-6 mb-4">
                        {isHalfDay ? (
                            <>
                                <label className="form-label">{getFormattedMessage("hrm.leave.session")}:</label>
                                <div className="hrm-login-modes">
                                    {["first", "second"].map((session) => (
                                        <button type="button" key={session}
                                            className={`hrm-login-mode ${halfSession === session ? "hrm-login-mode--active" : ""}`}
                                            onClick={() => setHalfSession(session)}>
                                            {getFormattedMessage(`hrm.leave.half.${session}`)}
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <label className="form-label">{getFormattedMessage("hrm.leave.to")}:</label>
                                <span className="required" />
                                <input type="date" className="form-control" value={toDate} min={fromDate}
                                    onChange={(e) => setToDate(e.target.value)} />
                            </>
                        )}
                    </div>
                    <div className="col-12 mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.leave.reason")}</label>
                        <textarea className="form-control" rows={2} value={reason} maxLength={2000}
                            placeholder={placeholderText("hrm.leave.reason.placeholder")}
                            onChange={(e) => setReason(e.target.value)} />
                    </div>
                    <div className="col-12 mb-2">
                        <label className="form-label">
                            {getFormattedMessage("hrm.leave.document")}
                            {selectedType && selectedType.requires_document && <span className="required" />}
                        </label>
                        <div className="d-flex align-items-center gap-3 flex-wrap">
                            <button type="button" className="btn btn-outline-secondary table-toolbar__btn" onClick={() => fileRef.current && fileRef.current.click()}>
                                <FiPaperclip /> {getFormattedMessage("hrm.leave.document.choose")}
                            </button>
                            <span className="hrm-form-hint">
                                {attachment ? attachment.name : getFormattedMessage("hrm.leave.document.hint")}
                            </span>
                            <input ref={fileRef} type="file" className="d-none" accept=".jpg,.jpeg,.png,.webp,.pdf"
                                onChange={(e) => setAttachment(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
                        </div>
                    </div>
                    {!isSelf && (
                        <div className="col-12 mt-3">
                            <label className="form-check form-switch hrm-toggle mb-0">
                                <input type="checkbox" className="form-check-input" checked={approveNow}
                                    onChange={(e) => setApproveNow(e.target.checked)} />
                                <span>
                                    <span className="hrm-toggle__label">{getFormattedMessage("hrm.leave.approve-now")}</span>
                                    <span className="hrm-toggle__hint">{getFormattedMessage("hrm.leave.approve-now.hint")}</span>
                                </span>
                            </label>
                        </div>
                    )}
                    {preview && (
                        <div className="col-12 mt-4">
                            <div className={`hrm-leave-preview ${preview.error ? "hrm-leave-preview--error" : ""}`}>
                                <span>
                                    <strong>{formatDays(preview.days)}</strong> {getFormattedMessage("hrm.leave.working-days")}
                                </span>
                                {!preview.is_unlimited && preview.balance !== null && (
                                    <span>
                                        {getFormattedMessage("hrm.leave.balance")}: <strong>{formatDays(preview.balance)}</strong>
                                        {Number(preview.pending) > 0 && ` (${placeholderText("hrm.leave.pending")} ${formatDays(preview.pending)})`}
                                    </span>
                                )}
                                {preview.error && <span className="hrm-leave-preview__error">{preview.error}</span>}
                            </div>
                        </div>
                    )}
                    {error && <span className="text-danger d-block fw-400 fs-small mt-3">{error}</span>}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <button type="button" className="btn btn-outline-secondary" onClick={onHide}>
                    {getFormattedMessage("globally.cancel-btn")}
                </button>
                <button type="button" className="btn btn-primary" disabled={saving} onClick={onSubmit}>
                    <FiCheck /> {getFormattedMessage(isSelf ? "hrm.leave.send" : "globally.save-btn")}
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default connect(null, { applyLeave, previewLeave })(ApplyLeaveModal);
