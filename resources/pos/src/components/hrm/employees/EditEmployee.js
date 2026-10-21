import React, { useEffect, useMemo } from "react";
import { connect } from "react-redux";
import { useParams } from "react-router-dom";
import MasterLayout from "../../MasterLayout";
import HeaderTitle from "../../header/HeaderTitle";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { fetchEmployee, clearEmployee } from "../../../store/action/hrm/hrmActions";
import EmployeeForm from "./EmployeeForm";

const EditEmployee = ({ employee, fetchEmployee, clearEmployee }) => {
    const { id } = useParams();

    useEffect(() => {
        fetchEmployee(id);
        return () => clearEmployee();
    }, [id]);

    // stable object: the form resets its fields when this reference changes
    const current = useMemo(
        () =>
            employee && String(employee.id) === String(id)
                ? { id: employee.id, ...employee.attributes }
                : null,
        [employee, id]
    );

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.employee.edit.title")} />
            <HeaderTitle
                title={getFormattedMessage("hrm.employee.edit.title")}
                to={`/app/employees/detail/${id}`}
            />
            {current && <EmployeeForm employee={current} />}
        </MasterLayout>
    );
};

const mapStateToProps = (state) => ({ employee: state.employee });

export default connect(mapStateToProps, { fetchEmployee, clearEmployee })(EditEmployee);
