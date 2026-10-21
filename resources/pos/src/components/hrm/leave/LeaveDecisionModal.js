import React, { useEffect, useState } from "react";
import { Modal } from "react-bootstrap-v5";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { dateRangeLabel, formatDays, LeaveTypeTag } from "./leaveShared";

const BUTTON = { approve: "btn-success", reject: "btn-danger", cancel: "btn-outline-danger" };

/**
 * Confirm approve / reject / cancel with optional remarks.
 * request: list row ({ employee_name, leave_type_name, ... }); action: approve | reject | cancel
 */
const LeaveDecisionModal = ({ request, action, onHide, onConfirm }) => {
    const [remarks, setRemarks] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setRemarks("");
        setSaving(false);
    }, [request, action]);

    if (!request || !action) return null;

    const confirm = () => {
        setSaving(true);
        Promise.resolve(onConfirm(remarks.trim() || undefined)).finally(() => setSaving(false));
    };

    return (
        <Modal show={!!request} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>{getFormattedMessage(`hrm.leave.${action}.title`)}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="hrm-leave-decision">
                    <div className="hrm-leave-decision__name">{request.employee_name}</div>
                    <div className="hrm-leave-decision__meta">
                        <LeaveTypeTag name={request.leave_type_name} color={request.leave_type_color} />
                        <span>{dateRangeLabel(request)}</span>
                        <span>{formatDays(request.days)} {getFormattedMessage("hrm.leave.days").toLowerCase()}</span>
                    </div>
                    {request.reason && <div className="hrm-form-hint mt-2">{request.reason}</div>}
                </div>
                {action === "approve" && (
                    <p className="hrm-form-hint mt-3 mb-0">{getFormattedMessage("hrm.leave.approve.hint")}</p>
                )}
                {action !== "approve" && request.status === "approved" && (
                    <p className="hrm-form-hint mt-3 mb-0">{getFormattedMessage("hrm.leave.revert.hint")}</p>
                )}
                <label className="form-label mt-4">{getFormattedMessage("hrm.leave.remarks")}</label>
                <textarea className="form-control" rows={2} value={remarks} maxLength={1000}
                    placeholder={placeholderText("hrm.leave.remarks.placeholder")}
                    onChange={(e) => setRemarks(e.target.value)} />
            </Modal.Body>
            <Modal.Footer>
                <button type="button" className="btn btn-outline-secondary" onClick={onHide}>
                    {getFormattedMessage("globally.cancel-btn")}
                </button>
                <button type="button" className={`btn ${BUTTON[action]}`} disabled={saving} onClick={confirm}>
                    {getFormattedMessage(`hrm.leave.${action}`)}
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default LeaveDecisionModal;
