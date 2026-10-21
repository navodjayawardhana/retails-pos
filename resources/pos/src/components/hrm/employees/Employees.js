import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Select from "react-select";
import { FiPlus, FiUser } from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import ReactDataTable from "../../../shared/table/ReactDataTable";
import ActionButton from "../../../shared/action-buttons/ActionButton";
import DeleteModel from "../../../shared/action-buttons/DeleteModel";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import {
    fetchEmployees,
    deleteEmployee,
    fetchAllDepartments,
    fetchAllDesignations,
} from "../../../store/action/hrm/hrmActions";
import { fetchAllWarehouses } from "../../../store/action/warehouseAction";
import EmployeeStatusBadge from "./EmployeeStatusBadge";

const selectStyles = {
    container: (base) => ({ ...base, width: 170 }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const statusOptions = ["active", "resigned", "terminated"].map((status) => ({
    value: status,
    label: getFormattedMessage(`hrm.status.${status}`),
}));

const Employees = (props) => {
    const {
        employees,
        totalRecord,
        isLoading,
        allDepartments,
        allDesignations,
        warehouses,
        fetchEmployees,
        deleteEmployee,
        fetchAllDepartments,
        fetchAllDesignations,
        fetchAllWarehouses,
    } = props;
    const navigate = useNavigate();
    const [deleting, setDeleting] = useState(null);
    const [filters, setFilters] = useState({});
    const lastFilter = useRef({});
    const firstRun = useRef(true);

    useEffect(() => {
        fetchAllDepartments();
        fetchAllDesignations();
        fetchAllWarehouses();
    }, []);

    const extraFilters = () => ({
        warehouse_id: filters.warehouse_id?.value,
        department_id: filters.department_id?.value,
        designation_id: filters.designation_id?.value,
        status: filters.status?.value,
    });

    // refetch when a toolbar filter changes (table-driven changes come through onChange)
    useEffect(() => {
        if (firstRun.current) {
            firstRun.current = false;
            return;
        }
        fetchEmployees({ ...lastFilter.current, page: 1 }, true, extraFilters());
    }, [filters]);

    const onChange = (filter) => {
        lastFilter.current = filter;
        fetchEmployees(filter, true, extraFilters());
    };
    const refresh = () => fetchEmployees(lastFilter.current, false, extraFilters());

    const toOptions = (list) =>
        (list || []).map((item) => ({ value: item.id, label: item.attributes.name }));

    const filterSelect = (key, options, placeholderKey) => (
        <Select
            isClearable
            styles={selectStyles}
            menuPortalTarget={document.body}
            options={options}
            value={filters[key] || null}
            placeholder={placeholderText(placeholderKey)}
            onChange={(option) => setFilters((prev) => ({ ...prev, [key]: option }))}
        />
    );

    const itemsValue = employees.map((employee) => ({
        id: employee.id,
        code: employee.attributes.employee_code,
        name: employee.attributes.full_name,
        photo: employee.attributes.photo_url,
        department: employee.attributes.department_name,
        designation: employee.attributes.designation_name,
        branch: employee.attributes.branch_name,
        phone: employee.attributes.phone,
        status: employee.attributes.status,
        user: employee.attributes.user,
    }));

    const columns = [
        {
            name: getFormattedMessage("hrm.employee.title"),
            sortField: "first_name",
            sortable: true,
            minWidth: "240px",
            cell: (row) => (
                <Link to={`/app/employees/detail/${row.id}`} className="hrm-person text-decoration-none">
                    {row.photo ? (
                        <img src={row.photo} alt="" className="hrm-person__photo" />
                    ) : (
                        <span className="hrm-person__photo hrm-person__photo--empty">
                            <FiUser />
                        </span>
                    )}
                    <span>
                        <span className="hrm-person__name">{row.name}</span>
                        <span className="hrm-person__code">{row.code}</span>
                    </span>
                </Link>
            ),
        },
        {
            name: getFormattedMessage("hrm.department.title"),
            selector: (row) => row.department || "—",
        },
        {
            name: getFormattedMessage("hrm.designation.title"),
            selector: (row) => row.designation || "—",
        },
        {
            name: getFormattedMessage("hrm.branch.label"),
            selector: (row) => row.branch || "—",
        },
        {
            name: getFormattedMessage("globally.input.phone-number.label"),
            selector: (row) => row.phone || "—",
        },
        {
            name: getFormattedMessage("globally.detail.status"),
            sortField: "status",
            sortable: true,
            cell: (row) => <EmployeeStatusBadge status={row.status} />,
        },
        {
            name: getFormattedMessage("react-data-table.action.column.label"),
            right: true,
            ignoreRowClick: true,
            allowOverflow: true,
            button: true,
            width: "130px",
            cell: (row) => (
                <ActionButton
                    item={row}
                    isViewIcon={true}
                    goToDetailScreen={(id) => navigate(`/app/employees/detail/${id}`)}
                    goToEditProduct={(item) => navigate(`/app/employees/edit/${item.id}`)}
                    isEditMode={true}
                    onClickDeleteModel={(item) => setDeleting(item)}
                />
            ),
        },
    ];

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.employees.title")} />
            {/* stateful filters live outside the table: ReactDataTable memoizes AddButton at first render */}
            <div className="hrm-filter-bar">
                {filterSelect("warehouse_id", toOptions(warehouses), "hrm.branch.all")}
                {filterSelect("department_id", toOptions(allDepartments), "hrm.department.all")}
                {filterSelect("designation_id", toOptions(allDesignations), "hrm.designation.all")}
                {filterSelect("status", statusOptions, "hrm.status.all")}
            </div>
            <ReactDataTable
                columns={columns}
                items={itemsValue}
                onChange={onChange}
                isLoading={isLoading}
                totalRows={totalRecord}
                AddButton={
                    <Link to="/app/employees/create" className="btn btn-primary table-toolbar__create">
                        <FiPlus />
                        {getFormattedMessage("hrm.employee.create.title")}
                    </Link>
                }
            />
            {deleting && (
                <DeleteModel
                    deleteModel={!!deleting}
                    onClickDeleteModel={() => setDeleting(null)}
                    deleteUserClick={() => {
                        deleteEmployee(deleting.id, refresh);
                        setDeleting(null);
                    }}
                    name={getFormattedMessage("hrm.employee.title")}
                />
            )}
        </MasterLayout>
    );
};

const mapStateToProps = (state) => {
    const { employees, totalRecord, isLoading, allDepartments, allDesignations, warehouses } = state;
    return { employees, totalRecord, isLoading, allDepartments, allDesignations, warehouses };
};

export default connect(mapStateToProps, {
    fetchEmployees,
    deleteEmployee,
    fetchAllDepartments,
    fetchAllDesignations,
    fetchAllWarehouses,
})(Employees);
