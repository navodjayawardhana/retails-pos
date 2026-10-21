import React, { useEffect, useState } from "react";
import { connect, useSelector } from "react-redux";
import { FiCheck } from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { fetchHrSettings, saveHrSettings } from "../../../store/action/hrm/hrmActions";

const DAYS = [0, 1, 2, 3, 4, 5, 6];

const Section = ({ title, hint, children }) => (
    <div className="card hrm-form-section mb-5">
        <div className="card-header">
            <div>
                <h3 className="mb-0">{getFormattedMessage(title)}</h3>
                {hint && <p className="hrm-form-hint mb-0 mt-1">{getFormattedMessage(hint)}</p>}
            </div>
        </div>
        <div className="card-body">
            <div className="row">{children}</div>
        </div>
    </div>
);

const NumberField = ({ label, value, onChange, step = "1", suffix, col = "col-md-4" }) => (
    <div className={`${col} mb-4`}>
        <label className="form-label">{getFormattedMessage(label)}</label>
        <div className="input-group">
            <input type="number" min="0" step={step} className="form-control" value={value ?? ""} onChange={onChange} />
            {suffix && <span className="input-group-text">{suffix}</span>}
        </div>
    </div>
);

const Toggle = ({ label, hint, checked, onChange, col = "col-md-6" }) => (
    <div className={`${col} mb-4`}>
        <label className="form-check form-switch hrm-toggle">
            <input type="checkbox" className="form-check-input" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
            <span>
                <span className="hrm-toggle__label">{getFormattedMessage(label)}</span>
                {hint && <span className="hrm-toggle__hint">{getFormattedMessage(hint)}</span>}
            </span>
        </label>
    </div>
);

const HrSettings = ({ hrSettings, fetchHrSettings, saveHrSettings }) => {
    const { isSaving } = useSelector((state) => state);
    const [value, setValue] = useState(null);

    useEffect(() => {
        fetchHrSettings();
    }, []);

    useEffect(() => {
        if (hrSettings) setValue({ ...hrSettings });
    }, [hrSettings]);

    const set = (key) => (e) => {
        const next = e && e.target ? e.target.value : e;
        setValue((prev) => ({ ...prev, [key]: next }));
    };

    const toggleWeekend = (day) =>
        setValue((prev) => ({
            ...prev,
            weekend_days: prev.weekend_days.includes(day)
                ? prev.weekend_days.filter((d) => d !== day)
                : [...prev.weekend_days, day].sort(),
        }));

    const onSubmit = (event) => {
        event.preventDefault();
        saveHrSettings(value);
    };

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.settings.title")} />
            {value && (
                <form onSubmit={onSubmit}>
                    <Section title="hrm.settings.working-time" hint="hrm.settings.working-time.hint">
                        <div className="col-md-4 mb-4">
                            <label className="form-label">{getFormattedMessage("hrm.work-start.label")}</label>
                            <input type="time" className="form-control" value={value.work_start} onChange={set("work_start")} />
                        </div>
                        <div className="col-md-4 mb-4">
                            <label className="form-label">{getFormattedMessage("hrm.work-end.label")}</label>
                            <input type="time" className="form-control" value={value.work_end} onChange={set("work_end")} />
                        </div>
                        <NumberField label="hrm.settings.hours-per-day" value={value.working_hours_per_day} step="0.5" onChange={set("working_hours_per_day")} />
                        <NumberField label="hrm.settings.days-per-month" value={value.working_days_per_month} onChange={set("working_days_per_month")} />
                        <NumberField label="hrm.settings.half-day-hours" value={value.half_day_hours} step="0.5" onChange={set("half_day_hours")} />
                        <div className="col-md-4 mb-4">
                            <label className="form-label">{getFormattedMessage("hrm.settings.timezone")}</label>
                            <select className="form-select" value={value.timezone || "Asia/Colombo"} onChange={set("timezone")}>
                                {Array.from(new Set([value.timezone || "Asia/Colombo", "Asia/Colombo", "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "UTC"])).map((zone) => (
                                    <option key={zone} value={zone}>{zone}</option>
                                ))}
                            </select>
                            <span className="hrm-form-hint">{getFormattedMessage("hrm.settings.timezone.hint")}</span>
                        </div>
                        <div className="col-12 mb-3">
                            <label className="form-label">{getFormattedMessage("hrm.settings.weekend-days")}</label>
                            <div className="hrm-day-picker">
                                {DAYS.map((day) => (
                                    <button
                                        type="button"
                                        key={day}
                                        className={`hrm-day ${value.weekend_days.includes(day) ? "hrm-day--active" : ""}`}
                                        onClick={() => toggleWeekend(day)}
                                    >
                                        {getFormattedMessage(`hrm.day.${day}`)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Toggle
                            label="hrm.settings.saturday-half-day"
                            hint="hrm.settings.saturday-half-day.hint"
                            checked={value.saturday_half_day}
                            onChange={set("saturday_half_day")}
                        />
                    </Section>

                    <Section title="hrm.settings.ot-late" hint="hrm.settings.ot-late.hint">
                        <NumberField label="hrm.ot-multiplier.label" value={value.ot_multiplier} step="0.1" suffix="×" onChange={set("ot_multiplier")} />
                        <NumberField label="hrm.settings.late-grace" value={value.late_grace_minutes} suffix={placeholderText("hrm.minutes")} onChange={set("late_grace_minutes")} />
                        <Toggle
                            label="hrm.late-deduction.label"
                            hint="hrm.settings.late-deduction.hint"
                            checked={value.late_deduction_enabled}
                            onChange={set("late_deduction_enabled")}
                            col="col-md-4"
                        />
                    </Section>

                    <Section title="hrm.settings.statutory" hint="hrm.settings.statutory.hint">
                        <NumberField label="hrm.settings.epf-employee" value={value.epf_employee_rate} step="0.01" suffix="%" onChange={set("epf_employee_rate")} />
                        <NumberField label="hrm.settings.epf-employer" value={value.epf_employer_rate} step="0.01" suffix="%" onChange={set("epf_employer_rate")} />
                        <NumberField label="hrm.settings.etf" value={value.etf_rate} step="0.01" suffix="%" onChange={set("etf_rate")} />
                    </Section>

                    <Section title="hrm.settings.attendance" hint="hrm.settings.attendance.hint">
                        <Toggle label="hrm.settings.mode-pos" hint="hrm.settings.mode-pos.hint" checked={value.attendance_pos_auto} onChange={set("attendance_pos_auto")} />
                        <Toggle label="hrm.settings.auto-clock-in" hint="hrm.settings.auto-clock-in.hint" checked={value.auto_clock_in_on_pos_login} onChange={set("auto_clock_in_on_pos_login")} />
                        <Toggle label="hrm.settings.auto-clock-out" hint="hrm.settings.auto-clock-out.hint" checked={value.auto_clock_out_on_logout} onChange={set("auto_clock_out_on_logout")} />
                        <Toggle label="hrm.settings.mode-manual" hint="hrm.settings.mode-manual.hint" checked={value.attendance_manual} onChange={set("attendance_manual")} />
                        <Toggle label="hrm.settings.mode-device" hint="hrm.settings.mode-device.hint" checked={value.attendance_device_import} onChange={set("attendance_device_import")} />
                    </Section>

                    <Section title="hrm.settings.leave" hint="hrm.settings.leave.hint">
                        <Toggle label="hrm.settings.prorate" hint="hrm.settings.prorate.hint" checked={value.prorate_first_year} onChange={set("prorate_first_year")} />
                    </Section>

                    <Section title="hrm.settings.payroll" hint="hrm.settings.payroll.hint">
                        <Toggle label="hrm.settings.unmarked-absent" hint="hrm.settings.unmarked-absent.hint" checked={value.payroll_unmarked_as_absent} onChange={set("payroll_unmarked_as_absent")} />
                        <Toggle label="hrm.settings.prorate-joiners" hint="hrm.settings.prorate-joiners.hint" checked={value.payroll_prorate_joiners} onChange={set("payroll_prorate_joiners")} />
                        <Toggle label="hrm.settings.daily-holidays" hint="hrm.settings.daily-holidays.hint" checked={value.daily_wage_paid_holidays} onChange={set("daily_wage_paid_holidays")} />
                        <Toggle label="hrm.settings.commission" hint="hrm.settings.commission.hint" checked={value.commission_enabled} onChange={set("commission_enabled")} />
                    </Section>

                    <div className="form-action-bar">
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            <FiCheck />
                            {isSaving ? placeholderText("globally-saving-btn-label") : placeholderText("globally.save-btn")}
                        </button>
                    </div>
                </form>
            )}
        </MasterLayout>
    );
};

const mapStateToProps = (state) => ({ hrSettings: state.hrSettings });

export default connect(mapStateToProps, { fetchHrSettings, saveHrSettings })(HrSettings);
