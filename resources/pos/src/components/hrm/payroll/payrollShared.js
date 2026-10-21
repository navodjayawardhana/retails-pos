import React from "react";
import { useSelector } from "react-redux";
import { currencySymbolHandling, getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";

// Money formatter using the app currency settings.
export const useMoney = () => {
    const { frontSetting, allConfigData } = useSelector((state) => state);
    const symbol = frontSetting && frontSetting.value && frontSetting.value.currency_symbol;
    return (value) => currencySymbolHandling(allConfigData, symbol, Number(value || 0));
};

export const num = (value, digits = 2) => {
    const n = Number(value || 0);
    return Number.isInteger(n) ? String(n) : n.toFixed(digits).replace(/\.?0+$/, "");
};

const STATUS_CLASS = {
    draft: "bg-light-warning",
    approved: "bg-light-info",
    paid: "bg-light-success",
    active: "bg-light-primary",
    completed: "bg-light-success",
    cancelled: "bg-light-dark",
};

export const PayrollStatusBadge = ({ status }) => (
    <span className={`badge ${STATUS_CLASS[status] || "bg-light"}`}>
        {getFormattedMessage(`hrm.payroll.status.${status}`)}
    </span>
);

export const currentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const previousMonth = () => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const yearOptions = () => {
    const year = new Date().getFullYear();
    return [year + 1, year, year - 1, year - 2].map((y) => ({ value: y, label: String(y) }));
};

export const portalStyles = {
    container: (base) => ({ ...base, minWidth: 160 }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

export const toOptions = (list) => (list || []).map((item) => ({ value: item.id, label: item.attributes.name }));

export const loanTypeLabel = (type) => placeholderText(`hrm.loan.type.${type}`);

// Earnings / deductions / employer-contribution tables of a payslip (shared by admin + self service).
export const PayslipLines = ({ payslip, money, onRemoveAdjustment }) => {
    const groups = [
        { type: "earning", title: "hrm.payslip.earnings", total: payslip.gross_earnings, totalLabel: "hrm.payslip.gross" },
        { type: "deduction", title: "hrm.payslip.deductions", total: payslip.total_deductions, totalLabel: "hrm.payslip.total-deductions" },
    ];
    const employer = (payslip.items || []).filter((i) => i.type === "employer");

    return (
        <>
            <div className="row g-4">
                {groups.map((group) => {
                    const items = (payslip.items || []).filter((i) => i.type === group.type);
                    return (
                        <div className="col-md-6" key={group.type}>
                            <div className="hrm-payslip-lines">
                                <div className="hrm-payslip-lines__head">{getFormattedMessage(group.title)}</div>
                                {items.length === 0 && <div className="hrm-payslip-lines__empty">{getFormattedMessage("hrm.payslip.none")}</div>}
                                {items.map((item) => (
                                    <div className="hrm-payslip-line" key={item.id}>
                                        <div>
                                            <div className="hrm-payslip-line__label">
                                                {item.label}
                                                {item.is_manual && <span className="badge bg-light-warning ms-2">{getFormattedMessage("hrm.payslip.manual")}</span>}
                                                {item.epf_liable && item.code !== "basic" && <span className="badge bg-light-info ms-2">EPF</span>}
                                            </div>
                                            {item.basis && <div className="hrm-payslip-line__basis">{item.basis}</div>}
                                        </div>
                                        <div className="hrm-payslip-line__amount">
                                            {money(item.amount)}
                                            {item.is_manual && onRemoveAdjustment && (
                                                <button type="button" className="action-btn action-btn--delete ms-2"
                                                    title={placeholderText("globally.delete.tooltip.label")}
                                                    onClick={() => onRemoveAdjustment(item)}>×</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div className="hrm-payslip-line hrm-payslip-line--total">
                                    <div>{getFormattedMessage(group.totalLabel)}</div>
                                    <div className="hrm-payslip-line__amount">{money(group.total)}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="hrm-payslip-net">
                <span>{getFormattedMessage("hrm.payslip.net-pay")}</span>
                <span>{money(payslip.net_pay)}</span>
            </div>
            {employer.length > 0 && (
                <div className="hrm-payslip-lines mt-4">
                    <div className="hrm-payslip-lines__head">{getFormattedMessage("hrm.payslip.employer")}</div>
                    {employer.map((item) => (
                        <div className="hrm-payslip-line" key={item.id}>
                            <div>
                                <div className="hrm-payslip-line__label">{item.label}</div>
                                {item.basis && <div className="hrm-payslip-line__basis">{item.basis}</div>}
                            </div>
                            <div className="hrm-payslip-line__amount">{money(item.amount)}</div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};

export const PayslipDayFacts = ({ payslip }) => {
    const facts = [
        ["hrm.payslip.working-days", num(payslip.working_days, 1)],
        ["hrm.payslip.payable-days", num(payslip.payable_days, 1)],
        ["hrm.payslip.absent", num(payslip.absent_days, 1)],
        ["hrm.payslip.paid-leave", num(payslip.paid_leave_days, 1)],
        ["hrm.payslip.no-pay-leave", num(payslip.unpaid_leave_days, 1)],
        ["hrm.payslip.ot-hours", num(payslip.ot_hours)],
        ["hrm.payslip.late-minutes", payslip.late_minutes],
    ];
    return (
        <div className="hrm-payslip-facts">
            {facts.map(([label, value]) => (
                <div className="hrm-payslip-fact" key={label}>
                    <span className="hrm-payslip-fact__label">{getFormattedMessage(label)}</span>
                    <span className="hrm-payslip-fact__value">{value}</span>
                </div>
            ))}
        </div>
    );
};
