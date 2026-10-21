import React from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import MasterLayout from "../../MasterLayout";
import HeaderTitle from "../../header/HeaderTitle";
import TabTitle from "../../../shared/tab-title/TabTitle";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import EmployeeForm from "./EmployeeForm";

// /app/employees/create?user_id=5 prefills from that user and pre-links it ("Make employee").
const CreateEmployee = () => {
    const [searchParams] = useSearchParams();
    const userId = Number(searchParams.get("user_id")) || null;
    const { employeeAvailableUsers } = useSelector((state) => state);
    const prefillUser =
        userId && (employeeAvailableUsers || []).find((user) => user.id === userId);

    return (
        <MasterLayout>
            <TabTitle title={placeholderText("hrm.employee.create.title")} />
            <HeaderTitle title={getFormattedMessage("hrm.employee.create.title")} to="/app/employees" />
            <EmployeeForm prefillUser={prefillUser || null} />
        </MasterLayout>
    );
};

export default CreateEmployee;
