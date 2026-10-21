import React, { useRef, useState } from "react";
import { connect } from "react-redux";
import { Button } from "react-bootstrap-v5";
import { FiPlus } from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import ReactDataTable from "../../../shared/table/ReactDataTable";
import ActionButton from "../../../shared/action-buttons/ActionButton";
import DeleteModel from "../../../shared/action-buttons/DeleteModel";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { fetchDepartments, deleteDepartment } from "../../../store/action/hrm/hrmActions";
import DepartmentForm from "./DepartmentForm";

const Departments = (props) => {
    const { departments, totalRecord, isLoading, fetchDepartments, deleteDepartment } = props;
    const [formShow, setFormShow] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const lastFilter = useRef({});

    const onChange = (filter) => {
        lastFilter.current = filter;
        fetchDepartments(filter, true);
    };
    const refresh = () => fetchDepartments(lastFilter.current, false);

    const openForm = (item = null) => {
        setEditing(item);
        setFormShow(true);
    };

    const itemsValue = departments.map((department) => ({
        id: department.id,
        name: department.attributes.name,
        description: department.attributes.description,
        designations_count: department.attributes.designations_count,
        employees_count: department.attributes.employees_count,
    }));

    const columns = [
        {
            name: getFormattedMessage("globally.input.name.label"),
            selector: (row) => row.name,
            sortField: "name",
            sortable: true,
        },
        {
            name: getFormattedMessage("hrm.description.label"),
            selector: (row) => row.description || "—",
        },
        {
            name: getFormattedMessage("hrm.designations.title"),
            cell: (row) => <span className="badge bg-light-info">{row.designations_count}</span>,
        },
        {
            name: getFormattedMessage("hrm.employees.title"),
            cell: (row) => <span className="badge bg-light-primary">{row.employees_count}</span>,
        },
        {
            name: getFormattedMessage("react-data-table.action.column.label"),
            right: true,
            ignoreRowClick: true,
            allowOverflow: true,
            button: true,
            cell: (row) => (
                <ActionButton
                    item={row}
                    goToEditProduct={openForm}
                    isEditMode={true}
                    onClickDeleteModel={(item) => setDeleting(item)}
                />
            ),
        },
    ];

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.departments.title")} />
            <ReactDataTable
                columns={columns}
                items={itemsValue}
                onChange={onChange}
                isLoading={isLoading}
                totalRows={totalRecord}
                AddButton={
                    <Button variant="primary" className="table-toolbar__create" onClick={() => openForm()}>
                        <FiPlus />
                        {getFormattedMessage("hrm.department.create.title")}
                    </Button>
                }
            />
            <DepartmentForm
                show={formShow}
                department={editing}
                handleClose={() => setFormShow(false)}
                onSaved={refresh}
            />
            {deleting && (
                <DeleteModel
                    deleteModel={!!deleting}
                    onClickDeleteModel={() => setDeleting(null)}
                    deleteUserClick={() => {
                        deleteDepartment(deleting.id, refresh);
                        setDeleting(null);
                    }}
                    name={getFormattedMessage("hrm.department.title")}
                />
            )}
        </MasterLayout>
    );
};

const mapStateToProps = (state) => {
    const { departments, totalRecord, isLoading } = state;
    return { departments, totalRecord, isLoading };
};

export default connect(mapStateToProps, { fetchDepartments, deleteDepartment })(Departments);
