import React, { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { useParams } from "react-router-dom";
import { FiUser, FiLink } from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import HeaderTitle from "../../header/HeaderTitle";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { fetchEmployee, clearEmployee } from "../../../store/action/hrm/hrmActions";
import EmployeeStatusBadge from "./EmployeeStatusBadge";
import employeeDetailTabs from "./detail/employeeDetailTabs";

const EmployeeDetail = ({ employee, fetchEmployee, clearEmployee }) => {
    const { id } = useParams();
    const [activeTab, setActiveTab] = useState(employeeDetailTabs[0].key);

    useEffect(() => {
        fetchEmployee(id);
        return () => clearEmployee();
    }, [id]);

    const current = useMemo(
        () =>
            employee && String(employee.id) === String(id)
                ? { id: employee.id, ...employee.attributes }
                : null,
        [employee, id]
    );

    const ActiveComponent = (employeeDetailTabs.find((tab) => tab.key === activeTab) || employeeDetailTabs[0])
        .component;

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.employee.details.title")} />
            <HeaderTitle
                title={getFormattedMessage("hrm.employee.details.title")}
                to="/app/employees"
                editLink={`/app/employees/edit/${id}`}
            />
            {current && (
                <>
                    <div className="card hrm-summary mb-5">
                        <div className="card-body hrm-summary__body">
                            {current.photo_url ? (
                                <img src={current.photo_url} alt="" className="hrm-summary__photo" />
                            ) : (
                                <span className="hrm-summary__photo hrm-summary__photo--empty">
                                    <FiUser />
                                </span>
                            )}
                            <div className="hrm-summary__main">
                                <div className="hrm-summary__name">
                                    {current.full_name}
                                    <EmployeeStatusBadge status={current.status} />
                                </div>
                                <div className="hrm-summary__sub">
                                    {current.employee_code}
                                    {current.designation_name ? ` · ${current.designation_name}` : ""}
                                </div>
                                {current.user && (
                                    <div className="hrm-summary__login">
                                        <FiLink /> {current.user.email}
                                        {current.user.role ? ` · ${current.user.role}` : ""}
                                    </div>
                                )}
                            </div>
                            <div className="hrm-summary__facts">
                                <div>
                                    <span>{getFormattedMessage("hrm.department.title")}</span>
                                    <strong>{current.department_name || "—"}</strong>
                                </div>
                                <div>
                                    <span>{getFormattedMessage("hrm.branch.label")}</span>
                                    <strong>{current.branch_name || "—"}</strong>
                                </div>
                                <div>
                                    <span>{getFormattedMessage("hrm.joining-date.label")}</span>
                                    <strong>{current.joining_date || "—"}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="hrm-tabs">
                            {employeeDetailTabs.map((tab) => (
                                <button
                                    type="button"
                                    key={tab.key}
                                    className={`hrm-tabs__tab ${activeTab === tab.key ? "hrm-tabs__tab--active" : ""}`}
                                    onClick={() => setActiveTab(tab.key)}
                                >
                                    {getFormattedMessage(tab.label)}
                                </button>
                            ))}
                        </div>
                        <div className="card-body">
                            <ActiveComponent employee={current} />
                        </div>
                    </div>
                </>
            )}
        </MasterLayout>
    );
};

const mapStateToProps = (state) => ({ employee: state.employee });

export default connect(mapStateToProps, { fetchEmployee, clearEmployee })(EmployeeDetail);
