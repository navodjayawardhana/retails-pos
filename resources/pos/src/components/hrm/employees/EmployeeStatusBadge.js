import React from "react";
import { getFormattedMessage } from "../../../shared/sharedMethod";

const statusClass = {
    active: "bg-light-success",
    resigned: "bg-light-warning",
    terminated: "bg-light-danger",
};

const EmployeeStatusBadge = ({ status }) =>
    status ? (
        <span className={`badge ${statusClass[status] || "bg-light-info"}`}>
            {getFormattedMessage(`hrm.status.${status}`)}
        </span>
    ) : null;

export default EmployeeStatusBadge;
