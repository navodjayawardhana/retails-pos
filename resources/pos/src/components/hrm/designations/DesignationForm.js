import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Form, Modal } from "react-bootstrap-v5";
import Select from "react-select";
import ModelFooter from "../../../shared/components/modelFooter";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { saveDesignation, fetchAllDepartments } from "../../../store/action/hrm/hrmActions";

const emptyValue = { name: "", department_id: null, description: "" };

const DesignationForm = (props) => {
    const { show, handleClose, designation, saveDesignation, allDepartments, fetchAllDepartments, onSaved } = props;
    const [value, setValue] = useState(emptyValue);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchAllDepartments();
    }, []);

    useEffect(() => {
        setValue(
            designation
                ? {
                      name: designation.name || "",
                      department_id: designation.department_id || null,
                      description: designation.description || "",
                  }
                : emptyValue
        );
        setError("");
    }, [designation, show]);

    const departmentOptions = allDepartments.map((department) => ({
        value: department.id,
        label: department.attributes.name,
    }));
    const selectedDepartment =
        departmentOptions.find((option) => option.value === value.department_id) || null;

    const onSubmit = (event) => {
        event.preventDefault();
        if (!value.name.trim()) {
            setError(getFormattedMessage("globally.input.name.validate.label"));
            return;
        }
        saveDesignation(designation ? designation.id : null, value, () => {
            handleClose();
            onSaved && onSaved();
        });
    };

    const unchanged =
        designation &&
        designation.name === value.name.trim() &&
        (designation.department_id || null) === value.department_id &&
        (designation.description || "") === value.description;

    return (
        <Modal show={show} onHide={handleClose} keyboard={true}>
            <Form onSubmit={onSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {designation
                            ? getFormattedMessage("hrm.designation.edit.title")
                            : getFormattedMessage("hrm.designation.create.title")}
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
                            onChange={(e) => {
                                setValue((prev) => ({ ...prev, name: e.target.value }));
                                setError("");
                            }}
                        />
                        <span className="text-danger d-block fw-400 fs-small mt-2">{error}</span>
                    </div>
                    <div className="mb-3">
                        <label className="form-label">
                            {getFormattedMessage("hrm.department.title")}:
                        </label>
                        <Select
                            isClearable
                            options={departmentOptions}
                            value={selectedDepartment}
                            placeholder={placeholderText("hrm.department.select.placeholder")}
                            onChange={(option) =>
                                setValue((prev) => ({
                                    ...prev,
                                    department_id: option ? option.value : null,
                                }))
                            }
                        />
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
                            onChange={(e) =>
                                setValue((prev) => ({ ...prev, description: e.target.value }))
                            }
                        />
                    </div>
                </Modal.Body>
            </Form>
            <ModelFooter
                onEditRecord={designation}
                onSubmit={onSubmit}
                editDisabled={unchanged}
                clearField={handleClose}
                addDisabled={!value.name.trim()}
            />
        </Modal>
    );
};

const mapStateToProps = (state) => ({ allDepartments: state.allDepartments });

export default connect(mapStateToProps, { saveDesignation, fetchAllDepartments })(DesignationForm);
