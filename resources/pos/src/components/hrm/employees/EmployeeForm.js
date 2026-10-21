import React, { useEffect, useMemo, useState } from "react";
import { connect, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import { FiCheck, FiLink, FiUser, FiUserPlus, FiSlash } from "react-icons/fi";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import {
    saveEmployee,
    fetchAllDepartments,
    fetchAllDesignations,
    fetchEmployeeAvailableUsers,
    unlinkEmployeeUser,
} from "../../../store/action/hrm/hrmActions";
import { fetchAllWarehouses } from "../../../store/action/warehouseAction";
import { fetchAllRoles } from "../../../store/action/roleAction";

const TEXT_FIELDS = [
    "first_name", "last_name", "nic", "dob", "gender", "phone", "email", "address", "city",
    "joining_date", "employment_type", "salary_type", "basic_salary", "ot_rate_multiplier",
    "work_start", "work_end", "commission_percent", "bank_name", "bank_branch", "bank_account_no", "epf_no", "etf_no",
    "emergency_contact_name", "emergency_contact_phone", "status", "leaving_date", "notes",
];

const blank = {
    first_name: "", last_name: "", nic: "", dob: "", gender: "", phone: "", email: "",
    address: "", city: "", warehouse_id: null, department_id: null, designation_id: null,
    joining_date: "", employment_type: "permanent", salary_type: "monthly", basic_salary: "",
    ot_eligible: true, ot_rate_multiplier: "", late_deduction_enabled: "", work_start: "",
    work_end: "", epf_applicable: true, commission_percent: "", bank_name: "", bank_branch: "", bank_account_no: "",
    epf_no: "", etf_no: "", emergency_contact_name: "", emergency_contact_phone: "",
    status: "active", leaving_date: "", notes: "",
};

const toOptions = (list) =>
    (list || []).map((item) => ({ value: item.id, label: item.attributes.name }));

const enumOptions = (prefix, values) =>
    values.map((value) => ({ value, label: getFormattedMessage(`${prefix}.${value}`) }));

const Section = ({ title, children }) => (
    <div className="card hrm-form-section mb-5">
        <div className="card-header">
            <h3 className="mb-0">{title}</h3>
        </div>
        <div className="card-body">
            <div className="row">{children}</div>
        </div>
    </div>
);

const Field = ({ label, required, error, col = "col-md-6", children }) => (
    <div className={`${col} mb-4`}>
        <label className="form-label">
            {label}
            {required && <span className="required" />}
        </label>
        {children}
        {error && <span className="text-danger d-block fw-400 fs-small mt-2">{error}</span>}
    </div>
);

const EmployeeForm = (props) => {
    const {
        employee, // API attributes + id when editing
        prefillUser, // user object when created from Users -> Make employee
        saveEmployee,
        fetchAllDepartments,
        fetchAllDesignations,
        fetchAllWarehouses,
        fetchAllRoles,
        fetchEmployeeAvailableUsers,
        unlinkEmployeeUser,
        allDepartments,
        allDesignations,
        warehouses,
        roles,
        employeeAvailableUsers,
    } = props;
    const navigate = useNavigate();
    const { isSaving } = useSelector((state) => state);
    const [value, setValue] = useState(blank);
    const [photo, setPhoto] = useState(null);
    const [loginMode, setLoginMode] = useState("none"); // none | link | create
    const [linkUserId, setLinkUserId] = useState(null);
    const [login, setLogin] = useState({ email: "", password: "", role: null });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchAllDepartments();
        fetchAllDesignations();
        fetchAllWarehouses();
        fetchAllRoles();
        fetchEmployeeAvailableUsers(employee ? employee.id : null);
    }, []);

    useEffect(() => {
        if (employee) {
            const next = { ...blank };
            Object.keys(blank).forEach((key) => {
                if (employee[key] !== undefined && employee[key] !== null) next[key] = employee[key];
            });
            next.late_deduction_enabled =
                employee.late_deduction_enabled === null || employee.late_deduction_enabled === undefined
                    ? ""
                    : employee.late_deduction_enabled ? "1" : "0";
            next.ot_rate_multiplier = employee.ot_rate_multiplier ?? "";
            setValue(next);
            setLoginMode("none");
        } else if (prefillUser) {
            setValue((prev) => ({
                ...prev,
                first_name: prefillUser.first_name || "",
                last_name: prefillUser.last_name || "",
                email: prefillUser.email || "",
                phone: prefillUser.phone || "",
            }));
            setLoginMode("link");
            setLinkUserId(prefillUser.id);
        }
    }, [employee, prefillUser]);

    const set = (key) => (e) => {
        const next = e && e.target ? e.target.value : e;
        setValue((prev) => ({ ...prev, [key]: next }));
        setErrors((prev) => ({ ...prev, [key]: "" }));
    };

    const designationOptions = useMemo(
        () =>
            (allDesignations || [])
                .filter(
                    (designation) =>
                        !value.department_id ||
                        !designation.attributes.department_id ||
                        designation.attributes.department_id === value.department_id
                )
                .map((designation) => ({ value: designation.id, label: designation.attributes.name })),
        [allDesignations, value.department_id]
    );

    const userOptions = (employeeAvailableUsers || []).map((user) => ({
        value: user.id,
        label: `${user.first_name || ""} ${user.last_name || ""} (${user.email})`.trim(),
    }));

    const selectValue = (options, id) => options.find((option) => option.value === id) || null;

    const validate = () => {
        const next = {};
        if (!value.first_name.trim()) next.first_name = getFormattedMessage("hrm.validation.first-name");
        if (value.basic_salary === "" || Number(value.basic_salary) < 0)
            next.basic_salary = getFormattedMessage("hrm.validation.basic-salary");
        if (value.email && !/^\S+@\S+\.\S+$/.test(value.email))
            next.email = getFormattedMessage("globally.input.email.valid.validate.label");
        if (loginMode === "link" && !linkUserId) next.login = getFormattedMessage("hrm.validation.select-user");
        if (loginMode === "create") {
            if (!(login.email || value.email)) next.login = getFormattedMessage("hrm.validation.login-email");
            else if (!login.password || login.password.length < 6)
                next.login = getFormattedMessage("hrm.validation.login-password");
            else if (!login.role) next.login = getFormattedMessage("hrm.validation.login-role");
            else if (!value.phone) next.login = getFormattedMessage("hrm.validation.login-phone");
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const onSubmit = (event) => {
        event.preventDefault();
        if (!validate()) return;
        const formData = new FormData();
        TEXT_FIELDS.forEach((key) => {
            if (value[key] !== "" && value[key] !== null && value[key] !== undefined) {
                formData.append(key, value[key]);
            } else if (employee) {
                formData.append(key, ""); // clear on edit
            }
        });
        ["warehouse_id", "department_id", "designation_id"].forEach((key) =>
            formData.append(key, value[key] || "")
        );
        formData.append("ot_eligible", value.ot_eligible ? 1 : 0);
        formData.append("epf_applicable", value.epf_applicable ? 1 : 0);
        formData.append("late_deduction_enabled", value.late_deduction_enabled);
        if (photo) formData.append("photo", photo);

        if (loginMode === "link") {
            formData.append("user_id", linkUserId);
        } else if (loginMode === "create") {
            formData.append("create_login", 1);
            formData.append("login_email", login.email || value.email);
            formData.append("login_password", login.password);
            formData.append("login_role_id", login.role.value);
        } else if (employee && employee.user_id) {
            formData.append("user_id", employee.user_id);
        }

        saveEmployee(employee ? employee.id : null, formData, navigate);
    };

    const linkedUser = employee && employee.user;

    return (
        <form onSubmit={onSubmit} className="hrm-employee-form">
            <Section title={getFormattedMessage("hrm.section.personal")}>
                <Field label={getFormattedMessage("user.input.first-name.label")} required error={errors.first_name}>
                    <input className="form-control" value={value.first_name} onChange={set("first_name")} />
                </Field>
                <Field label={getFormattedMessage("user.input.last-name.label")}>
                    <input className="form-control" value={value.last_name} onChange={set("last_name")} />
                </Field>
                <Field label={getFormattedMessage("hrm.nic.label")} col="col-md-4">
                    <input className="form-control" value={value.nic} onChange={set("nic")} />
                </Field>
                <Field label={getFormattedMessage("hrm.dob.label")} col="col-md-4">
                    <input type="date" className="form-control" value={value.dob} onChange={set("dob")} />
                </Field>
                <Field label={getFormattedMessage("hrm.gender.label")} col="col-md-4">
                    <Select
                        isClearable
                        options={enumOptions("hrm.gender", ["male", "female", "other"])}
                        value={enumOptions("hrm.gender", ["male", "female", "other"]).find((o) => o.value === value.gender) || null}
                        onChange={(option) => set("gender")(option ? option.value : "")}
                    />
                </Field>
                <Field label={getFormattedMessage("globally.input.phone-number.label")}>
                    <input className="form-control" value={value.phone} onChange={set("phone")} />
                </Field>
                <Field label={getFormattedMessage("globally.input.email.label")} error={errors.email}>
                    <input className="form-control" value={value.email} onChange={set("email")} />
                </Field>
                <Field label={getFormattedMessage("globally.input.address.label")}>
                    <input className="form-control" value={value.address} onChange={set("address")} />
                </Field>
                <Field label={getFormattedMessage("globally.input.city.label")}>
                    <input className="form-control" value={value.city} onChange={set("city")} />
                </Field>
                <Field label={getFormattedMessage("hrm.photo.label")} col="col-12">
                    <div className="hrm-photo-input">
                        {photo || (employee && employee.photo_url) ? (
                            <img
                                src={photo ? URL.createObjectURL(photo) : employee.photo_url}
                                alt=""
                                className="hrm-photo-input__preview"
                            />
                        ) : (
                            <span className="hrm-photo-input__preview hrm-photo-input__preview--empty">
                                <FiUser />
                            </span>
                        )}
                        <input
                            type="file"
                            accept="image/png,image/jpeg"
                            className="form-control"
                            onChange={(e) => setPhoto(e.target.files[0] || null)}
                        />
                    </div>
                </Field>
            </Section>

            <Section title={getFormattedMessage("hrm.section.job")}>
                <Field label={getFormattedMessage("hrm.branch.label")} col="col-md-4">
                    <Select
                        isClearable
                        options={toOptions(warehouses)}
                        value={selectValue(toOptions(warehouses), value.warehouse_id)}
                        placeholder={placeholderText("hrm.branch.select.placeholder")}
                        onChange={(option) => set("warehouse_id")(option ? option.value : null)}
                    />
                </Field>
                <Field label={getFormattedMessage("hrm.department.title")} col="col-md-4">
                    <Select
                        isClearable
                        options={toOptions(allDepartments)}
                        value={selectValue(toOptions(allDepartments), value.department_id)}
                        placeholder={placeholderText("hrm.department.select.placeholder")}
                        onChange={(option) => {
                            set("department_id")(option ? option.value : null);
                            set("designation_id")(null);
                        }}
                    />
                </Field>
                <Field label={getFormattedMessage("hrm.designation.title")} col="col-md-4">
                    <Select
                        isClearable
                        options={designationOptions}
                        value={selectValue(designationOptions, value.designation_id)}
                        placeholder={placeholderText("hrm.designation.select.placeholder")}
                        onChange={(option) => set("designation_id")(option ? option.value : null)}
                    />
                </Field>
                <Field label={getFormattedMessage("hrm.joining-date.label")} col="col-md-4">
                    <input type="date" className="form-control" value={value.joining_date} onChange={set("joining_date")} />
                </Field>
                <Field label={getFormattedMessage("hrm.employment-type.label")} required col="col-md-4">
                    <Select
                        options={enumOptions("hrm.employment-type", ["permanent", "contract", "probation", "daily"])}
                        value={enumOptions("hrm.employment-type", ["permanent", "contract", "probation", "daily"]).find((o) => o.value === value.employment_type)}
                        onChange={(option) => set("employment_type")(option.value)}
                    />
                </Field>
                <Field label={getFormattedMessage("globally.detail.status")} required col="col-md-4">
                    <Select
                        options={enumOptions("hrm.status", ["active", "resigned", "terminated"])}
                        value={enumOptions("hrm.status", ["active", "resigned", "terminated"]).find((o) => o.value === value.status)}
                        onChange={(option) => set("status")(option.value)}
                    />
                </Field>
                {value.status !== "active" && (
                    <Field label={getFormattedMessage("hrm.leaving-date.label")} col="col-md-4">
                        <input type="date" className="form-control" value={value.leaving_date} onChange={set("leaving_date")} />
                    </Field>
                )}
            </Section>

            <Section title={getFormattedMessage("hrm.section.salary")}>
                <Field label={getFormattedMessage("hrm.salary-type.label")} required col="col-md-4">
                    <Select
                        options={enumOptions("hrm.salary-type", ["monthly", "daily"])}
                        value={enumOptions("hrm.salary-type", ["monthly", "daily"]).find((o) => o.value === value.salary_type)}
                        onChange={(option) => set("salary_type")(option.value)}
                    />
                </Field>
                <Field
                    label={getFormattedMessage(value.salary_type === "daily" ? "hrm.daily-rate.label" : "hrm.basic-salary.label")}
                    required
                    error={errors.basic_salary}
                    col="col-md-4"
                >
                    <input type="number" min="0" step="0.01" className="form-control" value={value.basic_salary} onChange={set("basic_salary")} />
                </Field>
                <Field label={getFormattedMessage("hrm.epf-applicable.label")} col="col-md-4">
                    <label className="form-check form-switch mt-2">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            checked={!!value.epf_applicable}
                            onChange={(e) => set("epf_applicable")(e.target.checked)}
                        />
                        <span className="form-check-label">{getFormattedMessage("hrm.epf-applicable.hint")}</span>
                    </label>
                </Field>
                <Field label={getFormattedMessage("hrm.commission-percent.label")} col="col-md-4">
                    <div className="input-group">
                        <input type="number" min="0" max="100" step="0.01" className="form-control" value={value.commission_percent ?? ""}
                            placeholder={placeholderText("hrm.commission-percent.placeholder")} onChange={set("commission_percent")} />
                        <span className="input-group-text">%</span>
                    </div>
                    <span className="hrm-form-hint d-block mt-1">{getFormattedMessage("hrm.commission-percent.hint")}</span>
                </Field>
                <div className="col-12">
                    <p className="hrm-form-hint">{getFormattedMessage("hrm.overrides.hint")}</p>
                </div>
                <Field label={getFormattedMessage("hrm.ot-eligible.label")} col="col-md-4">
                    <label className="form-check form-switch mt-2">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            checked={!!value.ot_eligible}
                            onChange={(e) => set("ot_eligible")(e.target.checked)}
                        />
                    </label>
                </Field>
                <Field label={getFormattedMessage("hrm.ot-multiplier.label")} col="col-md-4">
                    <input
                        type="number"
                        min="0"
                        step="0.1"
                        className="form-control"
                        value={value.ot_rate_multiplier}
                        placeholder={placeholderText("hrm.use-default.placeholder")}
                        onChange={set("ot_rate_multiplier")}
                    />
                </Field>
                <Field label={getFormattedMessage("hrm.late-deduction.label")} col="col-md-4">
                    <Select
                        options={[
                            { value: "", label: getFormattedMessage("hrm.use-default.placeholder") },
                            { value: "1", label: getFormattedMessage("hrm.yes") },
                            { value: "0", label: getFormattedMessage("hrm.no") },
                        ]}
                        value={
                            value.late_deduction_enabled === "1"
                                ? { value: "1", label: getFormattedMessage("hrm.yes") }
                                : value.late_deduction_enabled === "0"
                                ? { value: "0", label: getFormattedMessage("hrm.no") }
                                : { value: "", label: getFormattedMessage("hrm.use-default.placeholder") }
                        }
                        onChange={(option) => set("late_deduction_enabled")(option.value)}
                    />
                </Field>
                <Field label={getFormattedMessage("hrm.work-start.label")} col="col-md-4">
                    <input type="time" className="form-control" value={value.work_start || ""} onChange={set("work_start")} />
                </Field>
                <Field label={getFormattedMessage("hrm.work-end.label")} col="col-md-4">
                    <input type="time" className="form-control" value={value.work_end || ""} onChange={set("work_end")} />
                </Field>
            </Section>

            <Section title={getFormattedMessage("hrm.section.bank")}>
                <Field label={getFormattedMessage("hrm.bank-name.label")} col="col-md-4">
                    <input className="form-control" value={value.bank_name} onChange={set("bank_name")} />
                </Field>
                <Field label={getFormattedMessage("hrm.bank-branch.label")} col="col-md-4">
                    <input className="form-control" value={value.bank_branch} onChange={set("bank_branch")} />
                </Field>
                <Field label={getFormattedMessage("hrm.bank-account.label")} col="col-md-4">
                    <input className="form-control" value={value.bank_account_no} onChange={set("bank_account_no")} />
                </Field>
                <Field label={getFormattedMessage("hrm.epf-no.label")}>
                    <input className="form-control" value={value.epf_no} onChange={set("epf_no")} />
                </Field>
                <Field label={getFormattedMessage("hrm.etf-no.label")}>
                    <input className="form-control" value={value.etf_no} onChange={set("etf_no")} />
                </Field>
            </Section>

            <Section title={getFormattedMessage("hrm.section.emergency")}>
                <Field label={getFormattedMessage("globally.input.name.label")}>
                    <input className="form-control" value={value.emergency_contact_name} onChange={set("emergency_contact_name")} />
                </Field>
                <Field label={getFormattedMessage("globally.input.phone-number.label")}>
                    <input className="form-control" value={value.emergency_contact_phone} onChange={set("emergency_contact_phone")} />
                </Field>
            </Section>

            <Section title={getFormattedMessage("hrm.section.login")}>
                {linkedUser ? (
                    <div className="col-12">
                        <div className="hrm-linked-user">
                            <FiLink />
                            <div>
                                <strong>{linkedUser.name}</strong>
                                <div className="text-gray-600">
                                    {linkedUser.email}
                                    {linkedUser.role ? ` · ${linkedUser.role}` : ""}
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn btn-outline-secondary ms-auto"
                                onClick={() => unlinkEmployeeUser(employee.id)}
                            >
                                <FiSlash />
                                {getFormattedMessage("hrm.login.unlink")}
                            </button>
                        </div>
                        <p className="hrm-form-hint mt-3">{getFormattedMessage("hrm.login.unlink.hint")}</p>
                    </div>
                ) : (
                    <>
                        <div className="col-12 mb-4">
                            <div className="hrm-login-modes">
                                {[
                                    { key: "none", icon: <FiSlash />, label: "hrm.login.none" },
                                    { key: "link", icon: <FiLink />, label: "hrm.login.link" },
                                    { key: "create", icon: <FiUserPlus />, label: "hrm.login.create" },
                                ].map((mode) => (
                                    <button
                                        type="button"
                                        key={mode.key}
                                        className={`hrm-login-mode ${loginMode === mode.key ? "hrm-login-mode--active" : ""}`}
                                        onClick={() => {
                                            setLoginMode(mode.key);
                                            setErrors((prev) => ({ ...prev, login: "" }));
                                        }}
                                    >
                                        {mode.icon}
                                        {getFormattedMessage(mode.label)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {loginMode === "link" && (
                            <Field label={getFormattedMessage("hrm.login.user.label")} col="col-md-8">
                                <Select
                                    options={userOptions}
                                    value={selectValue(userOptions, linkUserId)}
                                    placeholder={placeholderText("hrm.login.user.placeholder")}
                                    noOptionsMessage={() => getFormattedMessage("hrm.login.no-users")}
                                    onChange={(option) => setLinkUserId(option ? option.value : null)}
                                />
                            </Field>
                        )}
                        {loginMode === "create" && (
                            <>
                                <Field label={getFormattedMessage("globally.input.email.label")} col="col-md-4">
                                    <input
                                        className="form-control"
                                        value={login.email}
                                        placeholder={value.email || placeholderText("hrm.login.email.placeholder")}
                                        onChange={(e) => setLogin((prev) => ({ ...prev, email: e.target.value }))}
                                    />
                                </Field>
                                <Field label={getFormattedMessage("hrm.password.label")} col="col-md-4">
                                    <input
                                        type="password"
                                        autoComplete="new-password"
                                        className="form-control"
                                        value={login.password}
                                        onChange={(e) => setLogin((prev) => ({ ...prev, password: e.target.value }))}
                                    />
                                </Field>
                                <Field label={getFormattedMessage("user.input.role.label")} col="col-md-4">
                                    <Select
                                        options={toOptions(roles)}
                                        value={login.role}
                                        onChange={(option) => setLogin((prev) => ({ ...prev, role: option }))}
                                    />
                                </Field>
                                <div className="col-12">
                                    <p className="hrm-form-hint">{getFormattedMessage("hrm.login.create.hint")}</p>
                                </div>
                            </>
                        )}
                        {errors.login && (
                            <div className="col-12">
                                <span className="text-danger d-block fw-400 fs-small">{errors.login}</span>
                            </div>
                        )}
                    </>
                )}
            </Section>

            <Section title={getFormattedMessage("globally.input.notes.label")}>
                <Field label="" col="col-12">
                    <textarea className="form-control" rows={3} value={value.notes} onChange={set("notes")} />
                </Field>
            </Section>

            <div className="form-action-bar">
                <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => navigate(employee ? `/app/employees/detail/${employee.id}` : "/app/employees")}
                >
                    {getFormattedMessage("globally.cancel-btn")}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    <FiCheck />
                    {isSaving ? placeholderText("globally-saving-btn-label") : placeholderText("globally.save-btn")}
                </button>
            </div>
        </form>
    );
};

const mapStateToProps = (state) => {
    const { allDepartments, allDesignations, warehouses, roles, employeeAvailableUsers } = state;
    return { allDepartments, allDesignations, warehouses, roles, employeeAvailableUsers };
};

export default connect(mapStateToProps, {
    saveEmployee,
    fetchAllDepartments,
    fetchAllDesignations,
    fetchAllWarehouses,
    fetchAllRoles,
    fetchEmployeeAvailableUsers,
    unlinkEmployeeUser,
})(EmployeeForm);
