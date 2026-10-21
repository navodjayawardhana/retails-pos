import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Form, Modal } from "react-bootstrap-v5";
import ModelFooter from "../../../shared/components/modelFooter";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { saveDepartment } from "../../../store/action/hrm/hrmActions";

const emptyValue = { name: "", description: "" };

const DepartmentForm = (props) => {
    const { show, handleClose, department, saveDepartment, onSaved } = props;
    const [value, setValue] = useState(emptyValue);
    const [error, setError] = useState("");

    useEffect(() => {
        setValue(
            department
                ? { name: department.name || "", description: department.description || "" }
                : emptyValue
        );
        setError("");
    }, [department, show]);

    const onChange = (e) => {
        setValue((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setError("");
    };

    const onSubmit = (event) => {
        event.preventDefault();
        if (!value.name.trim()) {
            setError(getFormattedMessage("globally.input.name.validate.label"));
            return;
        }
        saveDepartment(department ? department.id : null, value, () => {
            handleClose();
            onSaved && onSaved();
        });
    };

    const unchanged =
        department &&
        department.name === value.name.trim() &&
        (department.description || "") === value.description;

    return (
        <Modal show={show} onHide={handleClose} keyboard={true}>
            <Form onSubmit={onSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {department
                            ? getFormattedMessage("hrm.department.edit.title")
                            : getFormattedMessage("hrm.department.create.title")}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-3">
                        <label className="form-label">
                            {getFormattedMessage("globally.input.name.label")}:
                        </label>
                        <span className="required" />
                        <input
                            type="text"
                            name="name"
                            className="form-control"
                            autoComplete="off"
                            autoFocus
                            value={value.name}
                            placeholder={placeholderText("globally.input.name.placeholder.label")}
                            onChange={onChange}
                        />
                        <span className="text-danger d-block fw-400 fs-small mt-2">{error}</span>
                    </div>
                    <div className="mb-3">
                        <label className="form-label">
                            {getFormattedMessage("hrm.description.label")}:
                        </label>
                        <textarea
                            name="description"
                            className="form-control"
                            rows={3}
                            value={value.description}
                            onChange={onChange}
                        />
                    </div>
                </Modal.Body>
            </Form>
            <ModelFooter
                onEditRecord={department}
                onSubmit={onSubmit}
                editDisabled={unchanged}
                clearField={handleClose}
                addDisabled={!value.name.trim()}
            />
        </Modal>
    );
};

export default connect(null, { saveDepartment })(DepartmentForm);
