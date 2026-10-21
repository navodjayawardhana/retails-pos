import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import Select from "react-select";
import DataTable from "react-data-table-component";
import { FiDownload } from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import EmptyComponent from "../../empty-component/EmptyComponent";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { fetchEpfReport, exportEpfReport } from "../../../store/action/hrm/payrollActions";
import { fetchAllWarehouses } from "../../../store/action/warehouseAction";
import { portalStyles, previousMonth, toOptions, useMoney } from "./payrollShared";

// EPF / ETF contribution report for a month (approved + paid runs; drafts optional).
const PayrollReports = ({ warehouses, fetchEpfReport, exportEpfReport, fetchAllWarehouses }) => {
    const money = useMoney();
    const [month, setMonth] = useState(previousMonth());
    const [warehouse, setWarehouse] = useState(null);
    const [includeDraft, setIncludeDraft] = useState(false);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAllWarehouses();
    }, []);

    const params = { month, warehouse_id: warehouse?.value, include_draft: includeDraft ? 1 : undefined };

    useEffect(() => {
        if (!month) return;
        setLoading(true);
        fetchEpfReport(params).then(setReport).catch(() => setReport(null)).finally(() => setLoading(false));
    }, [month, warehouse, includeDraft]);

    const columns = [
        {
            name: getFormattedMessage("hrm.employee.title"),
            minWidth: "200px",
            cell: (row) => (
                <span>
                    <span className="hrm-person__name d-block">{row.employee_name}</span>
                    <span className="hrm-person__code">{row.employee_code}{row.branch_name ? ` · ${row.branch_name}` : ""}</span>
                </span>
            ),
        },
        { name: "NIC", cell: (row) => row.nic || "—" },
        { name: getFormattedMessage("hrm.epf-no.label"), cell: (row) => row.epf_no || "—" },
        { name: getFormattedMessage("hrm.payroll.epf-base"), cell: (row) => money(row.epf_base) },
        { name: getFormattedMessage("hrm.payroll.epf-employee"), cell: (row) => money(row.epf_employee) },
        { name: getFormattedMessage("hrm.payroll.epf-employer"), cell: (row) => money(row.epf_employer) },
        { name: getFormattedMessage("hrm.payroll.epf-total"), cell: (row) => <strong>{money(row.epf_total)}</strong> },
        { name: getFormattedMessage("hrm.payroll.etf"), cell: (row) => money(row.etf) },
    ];

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.payroll-reports.title")} />
            <div className="hrm-filter-bar">
                <input type="month" className="form-control hrm-filter-bar__date" value={month} onChange={(e) => setMonth(e.target.value)} />
                <Select isClearable styles={portalStyles} menuPortalTarget={document.body} options={toOptions(warehouses)}
                    value={warehouse} placeholder={placeholderText("hrm.branch.all")} onChange={setWarehouse} />
                <label className="form-check form-switch mb-0 d-flex align-items-center gap-2">
                    <input type="checkbox" className="form-check-input" checked={includeDraft} onChange={(e) => setIncludeDraft(e.target.checked)} />
                    <span className="form-check-label">{getFormattedMessage("hrm.payroll.include-draft")}</span>
                </label>
                <span className="flex-grow-1" />
                <button type="button" className="btn btn-outline-secondary" disabled={!report || !report.rows.length}
                    onClick={() => exportEpfReport(params)}>
                    <FiDownload /> {getFormattedMessage("hrm.payroll.export-excel")}
                </button>
            </div>

            {report && report.rows.length > 0 && (
                <div className="hrm-payroll-totals">
                    {[
                        ["hrm.payroll.epf-base", report.totals.epf_base],
                        ["hrm.payroll.epf-employee", report.totals.epf_employee],
                        ["hrm.payroll.epf-employer", report.totals.epf_employer],
                        ["hrm.payroll.epf-total", report.totals.epf_total],
                        ["hrm.payroll.etf", report.totals.etf],
                    ].map(([label, value]) => (
                        <div className="hrm-payroll-total" key={label}>
                            <span className="hrm-payroll-total__label">{getFormattedMessage(label)}</span>
                            <span className="hrm-payroll-total__value">{money(value)}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="card">
                <div className="card-body">
                    <h3 className="hrm-section-title">{getFormattedMessage("hrm.payroll.epf-report.title")}</h3>
                    <p className="hrm-form-hint">{getFormattedMessage("hrm.payroll.epf-report.hint")}</p>
                    <DataTable
                        columns={columns}
                        data={report ? report.rows : []}
                        progressPending={loading}
                        noDataComponent={<EmptyComponent />}
                        pagination={!!report && report.rows.length > 25}
                        paginationPerPage={25}
                    />
                </div>
            </div>
        </MasterLayout>
    );
};

const mapStateToProps = (state) => ({ warehouses: state.warehouses });

export default connect(mapStateToProps, { fetchEpfReport, exportEpfReport, fetchAllWarehouses })(PayrollReports);
