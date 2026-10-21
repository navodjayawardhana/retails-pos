import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Modal } from "react-bootstrap-v5";
import { FiUpload, FiDownload, FiCheck, FiAlertCircle } from "react-icons/fi";
import { getFormattedMessage } from "../../../shared/sharedMethod";
import { previewAttendanceImport, commitAttendanceImport } from "../../../store/action/hrm/attendanceActions";

const AttendanceImportModal = ({ show, handleClose, previewAttendanceImport, commitAttendanceImport, onImported }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (show) {
            setFile(null);
            setPreview(null);
        }
    }, [show]);

    const runPreview = () => {
        if (!file) return;
        setBusy(true);
        previewAttendanceImport(file)
            .then(setPreview)
            .catch(() => setPreview(null))
            .finally(() => setBusy(false));
    };

    const validRows = preview ? preview.rows.filter((row) => !row.errors.length) : [];

    const runImport = () => {
        if (!validRows.length) return;
        setBusy(true);
        commitAttendanceImport(
            validRows.map((row) => ({
                employee_id: row.employee_id,
                date: row.date,
                clock_in: row.clock_in,
                clock_out: row.clock_out,
            }))
        )
            .then(() => {
                handleClose();
                onImported && onImported();
            })
            .catch(() => {})
            .finally(() => setBusy(false));
    };

    return (
        <Modal show={show} onHide={handleClose} size="xl">
            <Modal.Header closeButton>
                <Modal.Title>{getFormattedMessage("hrm.attendance.import.title")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p className="hrm-form-hint">{getFormattedMessage("hrm.attendance.import.hint")}</p>
                <div className="d-flex flex-wrap gap-2 mb-4">
                    <a className="btn btn-outline-secondary table-toolbar__btn" href="/import_demo_files/attendance_punch_log_sample.csv" download>
                        <FiDownload /> {getFormattedMessage("hrm.attendance.import.sample-punch")}
                    </a>
                    <a className="btn btn-outline-secondary table-toolbar__btn" href="/import_demo_files/attendance_summary_sample.csv" download>
                        <FiDownload /> {getFormattedMessage("hrm.attendance.import.sample-summary")}
                    </a>
                </div>
                <div className="d-flex flex-wrap gap-2 align-items-center mb-4">
                    <input type="file" accept=".csv,text/csv" className="form-control" style={{ maxWidth: 420 }}
                        onChange={(e) => { setFile(e.target.files[0] || null); setPreview(null); }} />
                    <button type="button" className="btn btn-primary table-toolbar__create" disabled={!file || busy} onClick={runPreview}>
                        <FiUpload /> {getFormattedMessage("hrm.attendance.import.preview")}
                    </button>
                </div>

                {preview && (
                    <>
                        <div className="d-flex flex-wrap gap-3 mb-3">
                            <span className="badge bg-light-info">
                                {getFormattedMessage(`hrm.attendance.import.format.${preview.format}`)}
                            </span>
                            <span className="badge bg-light-success">
                                {validRows.length} {getFormattedMessage("hrm.attendance.import.valid")}
                            </span>
                            {preview.error_count > 0 && (
                                <span className="badge bg-light-danger">
                                    {preview.error_count} {getFormattedMessage("hrm.attendance.import.errors")}
                                </span>
                            )}
                        </div>
                        <div className="table-responsive hrm-import-preview">
                            <table className="table hrm-simple-table mb-0">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>{getFormattedMessage("hrm.employee.code")}</th>
                                        <th>{getFormattedMessage("hrm.employee.title")}</th>
                                        <th>{getFormattedMessage("hrm.holiday.date.label")}</th>
                                        <th>{getFormattedMessage("hrm.attendance.in")}</th>
                                        <th>{getFormattedMessage("hrm.attendance.out")}</th>
                                        <th>{getFormattedMessage("hrm.attendance.import.punches")}</th>
                                        <th>{getFormattedMessage("hrm.attendance.import.problems")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.rows.map((row) => (
                                        <tr key={`${row.row}-${row.employee_code}-${row.date}`} className={row.errors.length ? "is-error" : ""}>
                                            <td>{row.row}</td>
                                            <td>{row.employee_code}</td>
                                            <td>{row.employee_name || "—"}</td>
                                            <td>{row.date || "—"}</td>
                                            <td>{row.clock_in || "—"}</td>
                                            <td>{row.clock_out || "—"}</td>
                                            <td>{row.punches || "—"}</td>
                                            <td>
                                                {row.errors.length ? (
                                                    <span className="text-danger"><FiAlertCircle /> {row.errors.join(" ")}</span>
                                                ) : (
                                                    <span className="text-success"><FiCheck /></span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <button type="button" className="btn btn-outline-secondary" onClick={handleClose}>
                    {getFormattedMessage("globally.cancel-btn")}
                </button>
                <button type="button" className="btn btn-primary" disabled={!validRows.length || busy} onClick={runImport}>
                    <FiCheck /> {getFormattedMessage("hrm.attendance.import.commit")} {validRows.length > 0 && `(${validRows.length})`}
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default connect(null, { previewAttendanceImport, commitAttendanceImport })(AttendanceImportModal);
