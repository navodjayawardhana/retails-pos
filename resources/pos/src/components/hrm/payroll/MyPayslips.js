import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import DataTable from "react-data-table-component";
import { FiDownload, FiFileText } from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import EmptyComponent from "../../empty-component/EmptyComponent";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { fetchMyPayslips, downloadPayslip } from "../../../store/action/hrm/payrollActions";
import PayslipModal from "./PayslipModal";
import { PayrollStatusBadge, useMoney } from "./payrollShared";

// Self service (view_own_hr): payslips of approved / paid payroll runs for the logged-in employee.
const MyPayslips = ({ fetchMyPayslips, downloadPayslip }) => {
    const money = useMoney();
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);
    const [open, setOpen] = useState(null);

    useEffect(() => {
        fetchMyPayslips().then(setData).catch(() => setError(true));
    }, []);

    const columns = [
        { name: getFormattedMessage("hrm.payroll.month"), cell: (row) => <strong>{row.month_label}</strong> },
        { name: getFormattedMessage("hrm.payslip.gross"), cell: (row) => money(row.gross_earnings) },
        { name: getFormattedMessage("hrm.payslip.total-deductions"), cell: (row) => money(row.total_deductions) },
        { name: getFormattedMessage("hrm.payslip.net-pay"), cell: (row) => <strong>{money(row.net_pay)}</strong> },
        { name: getFormattedMessage("globally.detail.status"), cell: (row) => <PayrollStatusBadge status={row.run_status} /> },
        {
            name: "",
            right: true,
            width: "110px",
            cell: (row) => (
                <div className="action-btn-group">
                    <button type="button" className="action-btn action-btn--view" title={placeholderText("globally.view.tooltip.label")} onClick={() => setOpen(row.id)}>
                        <FiFileText />
                    </button>
                    <button type="button" className="action-btn action-btn--edit" title={placeholderText("hrm.payslip.download")} onClick={() => downloadPayslip(row.id, true)}>
                        <FiDownload />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.my-payslips.title")} />
            {error ? (
                <div className="empty-state">
                    <p>{getFormattedMessage("hrm.self.not-linked")}</p>
                </div>
            ) : (
                <div className="card">
                    <div className="card-body">
                        {data && (
                            <p className="hrm-form-hint">
                                {data.employee.full_name} · {data.employee.employee_code}
                            </p>
                        )}
                        <DataTable
                            columns={columns}
                            data={data ? data.payslips : []}
                            noDataComponent={<EmptyComponent />}
                            pagination={data && data.payslips.length > 12}
                            paginationPerPage={12}
                            highlightOnHover
                            pointerOnHover
                            onRowClicked={(row) => setOpen(row.id)}
                        />
                    </div>
                </div>
            )}
            <PayslipModal payslipId={open} isSelf onHide={() => setOpen(null)} />
        </MasterLayout>
    );
};

export default connect(null, { fetchMyPayslips, downloadPayslip })(MyPayslips);
