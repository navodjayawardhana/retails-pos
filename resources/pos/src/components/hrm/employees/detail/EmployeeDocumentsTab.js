import React, { useRef, useState } from "react";
import { connect } from "react-redux";
import { FiDownload, FiFileText, FiTrash2, FiUpload } from "react-icons/fi";
import { getFormattedMessage, placeholderText } from "../../../../shared/sharedMethod";
import {
    uploadEmployeeDocument,
    deleteEmployeeDocument,
} from "../../../../store/action/hrm/hrmActions";
import DeleteModel from "../../../../shared/action-buttons/DeleteModel";

const formatSize = (bytes) =>
    bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

const EmployeeDocumentsTab = ({ employee, uploadEmployeeDocument, deleteEmployeeDocument }) => {
    const [title, setTitle] = useState("");
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const fileInput = useRef(null);

    const onUpload = (event) => {
        event.preventDefault();
        if (!file) return;
        const formData = new FormData();
        formData.append("document", file);
        if (title.trim()) formData.append("title", title.trim());
        setUploading(true);
        uploadEmployeeDocument(employee.id, formData).finally(() => {
            setUploading(false);
            setTitle("");
            setFile(null);
            if (fileInput.current) fileInput.current.value = "";
        });
    };

    const documents = employee.documents || [];

    return (
        <div>
            <form className="hrm-doc-upload" onSubmit={onUpload}>
                <input
                    className="form-control"
                    value={title}
                    placeholder={placeholderText("hrm.document.title.placeholder")}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <input
                    ref={fileInput}
                    type="file"
                    className="form-control"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => setFile(e.target.files[0] || null)}
                />
                <button type="submit" className="btn btn-primary" disabled={!file || uploading}>
                    <FiUpload />
                    {getFormattedMessage("hrm.document.upload")}
                </button>
            </form>
            <p className="hrm-form-hint">{getFormattedMessage("hrm.document.hint")}</p>

            {documents.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state__icon">
                        <FiFileText />
                    </div>
                    <div className="empty-state__text">{getFormattedMessage("hrm.document.empty")}</div>
                </div>
            ) : (
                <div className="hrm-doc-list">
                    {documents.map((document) => (
                        <div className="hrm-doc" key={document.id}>
                            <span className="hrm-doc__icon">
                                <FiFileText />
                            </span>
                            <div className="hrm-doc__body">
                                <div className="hrm-doc__name">{document.name}</div>
                                <div className="hrm-doc__meta">
                                    {document.file_name} · {formatSize(document.size)}
                                </div>
                            </div>
                            <a
                                href={document.url}
                                target="_blank"
                                rel="noreferrer"
                                className="action-btn action-btn--view"
                                title={placeholderText("hrm.document.download")}
                            >
                                <FiDownload />
                            </a>
                            <button
                                type="button"
                                className="action-btn action-btn--delete"
                                title={placeholderText("globally.delete.tooltip.label")}
                                onClick={() => setDeleting(document)}
                            >
                                <FiTrash2 />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {deleting && (
                <DeleteModel
                    deleteModel={!!deleting}
                    onClickDeleteModel={() => setDeleting(null)}
                    deleteUserClick={() => {
                        deleteEmployeeDocument(employee.id, deleting.id);
                        setDeleting(null);
                    }}
                    name={getFormattedMessage("hrm.document.label")}
                />
            )}
        </div>
    );
};

export default connect(null, { uploadEmployeeDocument, deleteEmployeeDocument })(EmployeeDocumentsTab);
