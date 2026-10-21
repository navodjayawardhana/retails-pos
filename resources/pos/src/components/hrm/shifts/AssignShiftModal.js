import React, { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Modal } from "react-bootstrap-v5";
import Select from "react-select";
import { FiCheck } from "react-icons/fi";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { assignShift, fetchActiveEmployeeOptions } from "../../../store/action/hrm/attendanceActions";
import { todayString } from "../attendance/attendanceShared";

const portal = { menuPortal: (base) => ({ ...base, zIndex: 9999 }) };

const AssignShiftModal = ({ show, handleClose, shifts, warehouses, presetShiftId, assignShift, fetchActiveEmployeeOptions, onSaved }) => {
    const [employees, setEmployees] = useState([]);
    const [shiftId, setShiftId] = useState(null);
    const [branch, setBranch] = useState(null);
    const [selected, setSelected] = useState([]);
    const [fromDate, setFromDate] = useState(todayString());
    const [toDate, setToDate] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!show) return;
        fetchActiveEmployeeOptions().then((list) => setEmployees(list || [])).catch(() => {});
        setShiftId(presetShiftId || null);
        setSelected([]);
        setBranch(null);
        setFromDate(todayString());
        setToDate("");
        setError("");
    }, [show]);

    const shiftOptions = (shifts || []).map((shift) => ({
        value: shift.id,
        label: `${shift.attributes.name} (${shift.attributes.start_time}–${shift.attributes.end_time})`,
    }));
    const branchOptions = (warehouses || []).map((w) => ({ value: w.id, label: w.attributes.name }));
    const employeeOptions = useMemo(
        () => (branch ? employees.filter((e) => Number(e.warehouse_id) === Number(branch.value)) : employees),
        [employees, branch]
    );

    const onSubmit = () => {
        if (!shiftId) return setError(getFormattedMessage("hrm.shift.select.validate"));
        if (!selected.length) return setError(getFormattedMessage("hrm.employee.select-some.validate"));
        if (!fromDate) return setError(getFormattedMessage("hrm.from-date.validate"));
        setSaving(true);
        assignShift({
            shift_id: shiftId,
            employee_ids: selected.map((option) => option.value),
            from_date: fromDate,
            to_date: toDate || null,
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
                <Modal.Title>{getFormattedMessage("hrm.shift.assign.title")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="row">
                    <div className="col-md-6 mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.shift.title")}:</label>
                        <span className="required" />
                        <Select options={shiftOptions} styles={portal} menuPortalTarget={document.body}
                            value={shiftOptions.find((o) => Number(o.value) === Number(shiftId)) || null}
                            placeholder={placeholderText("hrm.shift.select.placeholder")}
                            onChange={(option) => { setShiftId(option ? option.value : null); setError(""); }} />
                    </div>
                    <div className="col-md-6 mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.branch.label")}</label>
                        <Select isClearable options={branchOptions} styles={portal} menuPortalTarget={document.body}
                            value={branch} placeholder={placeholderText("hrm.branch.all")} onChange={setBranch} />
                    </div>
                    <div className="col-12 mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <label className="form-label mb-0">{getFormattedMessage("hrm.employees.title")}:</label>
                            <button type="button" className="btn btn-link p-0 fs-6"
                                onClick={() => { setSelected(employeeOptions); setError(""); }}>
                                {getFormattedMessage("hrm.select-all.label")} ({employeeOptions.length})
                            </button>
                        </div>
                        <Select isMulti closeMenuOnSelect={false} options={employeeOptions} styles={portal}
                            menuPortalTarget={document.body} value={selected}
                            placeholder={placeholderText("hrm.employee.select.placeholder")}
                            onChange={(options) => { setSelected(options || []); setError(""); }} />
                    </div>
                    <div className="col-md-6 mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.from-date.label")}:</label>
                        <span className="required" />
                        <input type="date" className="form-control" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    </div>
                    <div className="col-md-6 mb-4">
                        <label className="form-label">{getFormattedMessage("hrm.to-date.label")}</label>
                        <input type="date" className="form-control" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} />
                        <span className="hrm-form-hint">{getFormattedMessage("hrm.to-date.hint")}</span>
                    </div>
                    {error && <span className="text-danger d-block fw-400 fs-small">{error}</span>}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <button type="button" className="btn btn-outline-secondary" onClick={handleClose}>
                    {getFormattedMessage("globally.cancel-btn")}
                </button>
                <button type="button" className="btn btn-primary" disabled={saving} onClick={onSubmit}>
                    <FiCheck /> {getFormattedMessage("hrm.shift.assign.button")}
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default connect(null, { assignShift, fetchActiveEmployeeOptions })(AssignShiftModal);
