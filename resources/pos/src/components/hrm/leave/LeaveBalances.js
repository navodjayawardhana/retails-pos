import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Modal } from "react-bootstrap-v5";
import Select from "react-select";
import { Link } from "react-router-dom";
import { FiDownload, FiRefreshCw } from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { fetchLeaveBalanceReport, exportLeaveBalances, initialiseLeaveYear } from "../../../store/action/hrm/leaveActions";
import { fetchAllDepartments } from "../../../store/action/hrm/hrmActions";
import { fetchAllWarehouses } from "../../../store/action/warehouseAction";
import { formatDays, LeaveTypeTag, yearOptions } from "./leaveShared";

const filterStyles = {
    container: (base) => ({ ...base, minWidth: 160 }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const InitialiseModal = ({ show, year, onHide, onConfirm }) => {
    const [overwrite, setOverwrite] = useState(false);
    const [saving, setSaving] = useState(false);
    useEffect(() => { setOverwrite(false); setSaving(false); }, [show]);
    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>{getFormattedMessage("hrm.leave.initialise.title")} {year}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p className="hrm-form-hint mb-4">{getFormattedMessage("hrm.leave.initialise.hint")}</p>
                <label className="form-check form-switch hrm-toggle mb-0">
                    <input type="checkbox" className="form-check-input" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
                    <span>
                        <span className="hrm-toggle__label">{getFormattedMessage("hrm.leave.initialise.overwrite")}</span>
                        <span className="hrm-toggle__hint">{getFormattedMessage("hrm.leave.initialise.overwrite.hint")}</span>
                    </span>
                </label>
            </Modal.Body>
            <Modal.Footer>
                <button type="button" className="btn btn-outline-secondary" onClick={onHide}>{getFormattedMessage("globally.cancel-btn")}</button>
                <button type="button" className="btn btn-primary" disabled={saving}
                    onClick={() => { setSaving(true); Promise.resolve(onConfirm(overwrite)).finally(() => setSaving(false)); }}>
                    <FiRefreshCw /> {getFormattedMessage("hrm.leave.initialise.run")}
                </button>
            </Modal.Footer>
        </Modal>
    );
};

const LeaveBalances = (props) => {
    const { warehouses, allDepartments, fetchAllWarehouses, fetchAllDepartments, fetchLeaveBalanceReport, exportLeaveBalances, initialiseLeaveYear } = props;
    const years = yearOptions();
    const [year, setYear] = useState(years[1]);
    const [branch, setBranch] = useState(null);
    const [department, setDepartment] = useState(null);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initShow, setInitShow] = useState(false);

    useEffect(() => {
        fetchAllWarehouses();
        fetchAllDepartments();
    }, []);

    const params = () => ({ year: year.value, warehouse_id: branch?.value, department_id: department?.value });

    const load = () => {
        setLoading(true);
        fetchLeaveBalanceReport(params())
            .then(setReport)
            .catch(() => setReport(null))
            .finally(() => setLoading(false));
    };

    useEffect(load, [year, branch, department]);

    const toOptions = (list) => (list || []).map((item) => ({ value: item.id, label: item.attributes.name }));

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.leave-balances.title")} />
            <div className="hrm-filter-bar">
                <Select options={years} styles={filterStyles} menuPortalTarget={document.body} value={year} onChange={setYear} />
                <Select isClearable styles={filterStyles} menuPortalTarget={document.body} options={toOptions(warehouses)}
                    value={branch} placeholder={placeholderText("hrm.branch.all")} onChange={setBranch} />
                <Select isClearable styles={filterStyles} menuPortalTarget={document.body} options={toOptions(allDepartments)}
                    value={department} placeholder={placeholderText("hrm.department.all")} onChange={setDepartment} />
                <div className="hrm-filter-bar__actions">
                    <button type="button" className="btn btn-outline-secondary table-toolbar__btn" onClick={() => setInitShow(true)}>
                        <FiRefreshCw /> {getFormattedMessage("hrm.leave.initialise.title")}
                    </button>
                    <button type="button" className="btn btn-outline-secondary table-toolbar__btn"
                        onClick={() => exportLeaveBalances(params()).catch(() => {})}>
                        <FiDownload /> {getFormattedMessage("excel.btn.label")}
                    </button>
                </div>
            </div>
            <div className="card">
                <div className="card-body">
                    {loading && !report ? (
                        <div className="empty-state"><div className="empty-state__text">{getFormattedMessage("globally.loading.label")}</div></div>
                    ) : !report || report.rows.length === 0 ? (
                        <div className="empty-state"><div className="empty-state__text">{getFormattedMessage("hrm.leave.no-employees")}</div></div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table hrm-simple-table hrm-leave-grid mb-0">
                                <thead>
                                    <tr>
                                        <th rowSpan={2}>{getFormattedMessage("hrm.employee.title")}</th>
                                        {report.types.map((type) => (
                                            <th key={type.id} colSpan={type.is_unlimited ? 1 : 3} className="text-center">
                                                <LeaveTypeTag name={type.name} color={type.color} />
                                            </th>
                                        ))}
                                    </tr>
                                    <tr>
                                        {report.types.map((type) =>
                                            type.is_unlimited ? (
                                                <th key={type.id} className="text-center">{getFormattedMessage("hrm.leave.used")}</th>
                                            ) : (
                                                <React.Fragment key={type.id}>
                                                    <th className="text-center">{getFormattedMessage("hrm.leave.entitled")}</th>
                                                    <th className="text-center">{getFormattedMessage("hrm.leave.used")}</th>
                                                    <th className="text-center">{getFormattedMessage("hrm.leave.balance")}</th>
                                                </React.Fragment>
                                            )
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.rows.map((row) => (
                                        <tr key={row.employee_id}>
                                            <td>
                                                <Link to={`/app/employees/detail/${row.employee_id}`} className="hrm-person__name text-decoration-none d-block">
                                                    {row.employee_name}
                                                </Link>
                                                <span className="hrm-person__code">{row.employee_code}{row.branch_name ? ` · ${row.branch_name}` : ""}</span>
                                            </td>
                                            {report.types.map((type) => {
                                                const cell = row.cells[type.id];
                                                if (type.is_unlimited) {
                                                    return <td key={type.id} className="text-center">{cell ? formatDays(cell.used) : "—"}</td>;
                                                }
                                                return (
                                                    <React.Fragment key={type.id}>
                                                        <td className="text-center">{cell ? formatDays(cell.entitled) : "—"}</td>
                                                        <td className="text-center">
                                                            {cell ? formatDays(cell.used) : "—"}
                                                            {cell && Number(cell.pending) > 0 && <span className="hrm-form-hint d-block">+{formatDays(cell.pending)} {placeholderText("hrm.leave.pending")}</span>}
                                                        </td>
                                                        <td className={`text-center fw-600 ${cell && Number(cell.balance) <= 0 ? "text-danger" : ""}`}>
                                                            {cell ? formatDays(cell.balance) : "—"}
                                                        </td>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            <InitialiseModal
                show={initShow}
                year={year.value}
                onHide={() => setInitShow(false)}
                onConfirm={(overwrite) =>
                    initialiseLeaveYear({ year: year.value, overwrite_custom: overwrite ? 1 : 0 })
                        .then(() => { setInitShow(false); load(); })
                        .catch(() => {})
                }
            />
        </MasterLayout>
    );
};

const mapStateToProps = (state) => {
    const { warehouses, allDepartments } = state;
    return { warehouses, allDepartments };
};

export default connect(mapStateToProps, {
    fetchAllWarehouses,
    fetchAllDepartments,
    fetchLeaveBalanceReport,
    exportLeaveBalances,
    initialiseLeaveYear,
})(LeaveBalances);
