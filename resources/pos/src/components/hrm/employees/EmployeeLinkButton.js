import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { FiBriefcase, FiUserPlus } from "react-icons/fi";
import { Permissions } from "../../../constants";
import { placeholderText } from "../../../shared/sharedMethod";

// Users list/detail: "View employee" when the user is linked, otherwise "Make employee"
// (opens the employee form prefilled from the user and pre-linked).
const EmployeeLinkButton = ({ userId, employeeId, withLabel = false }) => {
    const { config } = useSelector((state) => state);
    if (!config || config.indexOf(Permissions.MANAGE_EMPLOYEES) === -1) return null;

    const linked = !!employeeId;
    const title = placeholderText(linked ? "hrm.view-employee" : "hrm.make-employee");
    const to = linked ? `/app/employees/detail/${employeeId}` : `/app/employees/create?user_id=${userId}`;

    if (withLabel) {
        return (
            <Link to={to} className="btn btn-outline-primary">
                {linked ? <FiBriefcase /> : <FiUserPlus />}
                {title}
            </Link>
        );
    }

    return (
        <Link
            to={to}
            title={title}
            className={`action-btn ${linked ? "action-btn--view" : "action-btn--edit"}`}
            onClick={(e) => e.stopPropagation()}
        >
            {linked ? <FiBriefcase /> : <FiUserPlus />}
        </Link>
    );
};

export default EmployeeLinkButton;
