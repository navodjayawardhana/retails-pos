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
import { fetchDesignations, deleteDesignation } from "../../../store/action/hrm/hrmActions";
import DesignationForm from "./DesignationForm";

const Designations = (props) => {
    const { designations, totalRecord, isLoading, fetchDesignations, deleteDesignation } = props;
    const [formShow, setFormShow] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const lastFilter = useRef({});

    const onChange = (filter) => {
        lastFilter.current = filter;
        fetchDesignations(filter, true);
    };
    const refresh = () => fetchDesignations(lastFilter.current, false);

    const openForm = (item = null) => {
        setEditing(item);
        setFormShow(true);
    };

    const itemsValue = designations.map((designation) => ({
        id: designation.id,
        name: designation.attributes.name,
        department_id: designation.attributes.department_id,
        department_name: designation.attributes.department_name,
        description: designation.attributes.description,
        employees_count: designation.attributes.employees_count,
    }));

    const columns = [
        {
            name: getFormattedMessage("globally.input.name.label"),
            selector: (row) => row.name,
            sortField: "name",
            sortable: true,
        },
        {
            name: getFormattedMessage("hrm.department.title"),
            cell: (row) =>
                row.department_name ? (
                    <span className="badge bg-light-success">{row.department_name}</span>
                ) : (
                    "—"
                ),
        },
        {
            name: getFormattedMessage("hrm.description.label"),
            selector: (row) => row.description || "—",
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
            <TabTitle title={placeholderText("hrm.designations.title")} />
            <ReactDataTable
                columns={columns}
                items={itemsValue}
                onChange={onChange}
                isLoading={isLoading}
                totalRows={totalRecord}
                AddButton={
                    <Button variant="primary" className="table-toolbar__create" onClick={() => openForm()}>
                        <FiPlus />
                        {getFormattedMessage("hrm.designation.create.title")}
                    </Button>
                }
            />
            <DesignationForm
                show={formShow}
                designation={editing}
                handleClose={() => setFormShow(false)}
                onSaved={refresh}
            />
            {deleting && (
                <DeleteModel
                    deleteModel={!!deleting}
                    onClickDeleteModel={() => setDeleting(null)}
                    deleteUserClick={() => {
                        deleteDesignation(deleting.id, refresh);
                        setDeleting(null);
                    }}
                    name={getFormattedMessage("hrm.designation.title")}
                />
            )}
        </MasterLayout>
    );
};

const mapStateToProps = (state) => {
    const { designations, totalRecord, isLoading } = state;
    return { designations, totalRecord, isLoading };
};

export default connect(mapStateToProps, { fetchDesignations, deleteDesignation })(Designations);
