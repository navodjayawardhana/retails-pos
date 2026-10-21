import React from "react";
import { useSelector } from "react-redux";
import { getFormattedMessage, currencySymbolHandling } from "../../../../shared/sharedMethod";

const Item = ({ label, value }) => (
    <div className="hrm-profile__item">
        <div className="hrm-profile__label">{getFormattedMessage(label)}</div>
        <div className="hrm-profile__value">{value === null || value === undefined || value === "" ? "—" : value}</div>
    </div>
);

const Group = ({ title, children }) => (
    <div className="hrm-profile__group">
        <h4 className="hrm-profile__group-title">{getFormattedMessage(title)}</h4>
        <div className="hrm-profile__grid">{children}</div>
    </div>
);

const yesNo = (value) =>
    value === null || value === undefined
        ? getFormattedMessage("hrm.use-default.placeholder")
        : getFormattedMessage(value ? "hrm.yes" : "hrm.no");

const EmployeeProfileTab = ({ employee }) => {
    const { frontSetting, allConfigData } = useSelector((state) => state);
    const money = (amount) =>
        currencySymbolHandling(allConfigData, frontSetting?.value?.currency_symbol, amount || 0);
    const label = (prefix, value) => (value ? getFormattedMessage(`${prefix}.${value}`) : null);

    return (
        <div className="hrm-profile">
            <Group title="hrm.section.personal">
                <Item label="hrm.nic.label" value={employee.nic} />
                <Item label="hrm.dob.label" value={employee.dob} />
                <Item label="hrm.gender.label" value={label("hrm.gender", employee.gender)} />
                <Item label="globally.input.phone-number.label" value={employee.phone} />
                <Item label="globally.input.email.label" value={employee.email} />
                <Item label="globally.input.address.label" value={employee.address} />
                <Item label="globally.input.city.label" value={employee.city} />
            </Group>
            <Group title="hrm.section.job">
                <Item label="hrm.branch.label" value={employee.branch_name} />
                <Item label="hrm.department.title" value={employee.department_name} />
                <Item label="hrm.designation.title" value={employee.designation_name} />
                <Item label="hrm.joining-date.label" value={employee.joining_date} />
                <Item label="hrm.employment-type.label" value={label("hrm.employment-type", employee.employment_type)} />
                <Item label="hrm.leaving-date.label" value={employee.leaving_date} />
            </Group>
            <Group title="hrm.section.salary">
                <Item label="hrm.salary-type.label" value={label("hrm.salary-type", employee.salary_type)} />
                <Item
                    label={employee.salary_type === "daily" ? "hrm.daily-rate.label" : "hrm.basic-salary.label"}
                    value={money(employee.basic_salary)}
                />
                <Item label="hrm.epf-applicable.label" value={yesNo(employee.epf_applicable)} />
                <Item label="hrm.ot-eligible.label" value={yesNo(employee.ot_eligible)} />
                <Item
                    label="hrm.ot-multiplier.label"
                    value={employee.ot_rate_multiplier ? `× ${employee.ot_rate_multiplier}` : getFormattedMessage("hrm.use-default.placeholder")}
                />
                <Item label="hrm.late-deduction.label" value={yesNo(employee.late_deduction_enabled)} />
                <Item
                    label="hrm.work-hours.label"
                    value={
                        employee.work_start || employee.work_end
                            ? `${employee.work_start || "…"} – ${employee.work_end || "…"}`
                            : getFormattedMessage("hrm.use-default.placeholder")
                    }
                />
            </Group>
            <Group title="hrm.section.bank">
                <Item label="hrm.bank-name.label" value={employee.bank_name} />
                <Item label="hrm.bank-branch.label" value={employee.bank_branch} />
                <Item label="hrm.bank-account.label" value={employee.bank_account_no} />
                <Item label="hrm.epf-no.label" value={employee.epf_no} />
                <Item label="hrm.etf-no.label" value={employee.etf_no} />
            </Group>
            <Group title="hrm.section.emergency">
                <Item label="globally.input.name.label" value={employee.emergency_contact_name} />
                <Item label="globally.input.phone-number.label" value={employee.emergency_contact_phone} />
            </Group>
            <Group title="hrm.section.login">
                <Item
                    label="hrm.login.user.label"
                    value={employee.user ? `${employee.user.name} (${employee.user.email})` : getFormattedMessage("hrm.login.none")}
                />
                <Item label="user.input.role.label" value={employee.user ? employee.user.role : null} />
            </Group>
            {employee.notes && (
                <Group title="globally.input.notes.label">
                    <div className="hrm-profile__notes">{employee.notes}</div>
                </Group>
            )}
        </div>
    );
};

export default EmployeeProfileTab;
