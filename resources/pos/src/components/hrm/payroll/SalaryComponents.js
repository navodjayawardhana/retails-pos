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
import { fetchSalaryComponents, deleteSalaryComponent } from "../../../store/action/hrm/payrollActions";
import SalaryComponentForm from "./SalaryComponentForm";
import { num } from "./payrollShared";

const YesNo = ({ value, positive = "bg-light-success" }) => (
    <span className={`badge ${value ? positive : "bg-light"}`}>{getFormattedMessage(value ? "hrm.yes" : "hrm.no")}</span>
);

const SalaryComponents = ({ salaryComponents, totalRecord, isLoading, fetchSalaryComponents, deleteSalaryComponent }) => {
    const [formShow, setFormShow] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const lastFilter = useRef({});

    const onChange = (filter) => {
        lastFilter.current = filter;
        fetchSalaryComponents(filter, true);
    };
    const refresh = () => fetchSalaryComponents(lastFilter.current, false);

    const itemsValue = salaryComponents.map((c) => ({ id: c.id, ...c.attributes }));

    const columns = [
        {
            name: getFormattedMessage("globally.input.name.label"),
            sortField: "name",
            sortable: true,
            minWidth: "220px",
            cell: (row) => (
                <span>
                    <span className="hrm-person__name d-block">{row.name}</span>
                    <span className="hrm-person__code">{row.code}</span>
                </span>
            ),
        },
        {
            name: getFormattedMessage("hrm.salary-component.type"),
            sortField: "type",
            sortable: true,
            cell: (row) => (
                <span className={`badge ${row.type === "earning" ? "bg-light-success" : "bg-light-danger"}`}>
                    {getFormattedMessage(`hrm.salary-component.type.${row.type}`)}
                </span>
            ),
        },
        {
            name: getFormattedMessage("hrm.salary-component.default"),
            sortField: "default_value",
            sortable: true,
            cell: (row) =>
                row.calculation === "percent_of_basic"
                    ? `${num(row.default_value)}% ${placeholderText("hrm.salary-component.of-basic")}`
                    : num(row.default_value),
        },
        { name: getFormattedMessage("hrm.salary-component.epf-liable"), cell: (row) => (row.type === "earning" ? <YesNo value={row.epf_liable} positive="bg-light-info" /> : "—") },
        { name: getFormattedMessage("hrm.salary-component.taxable"), cell: (row) => <YesNo value={row.taxable} positive="bg-light-warning" /> },
        {
            name: getFormattedMessage("globally.detail.status"),
            cell: (row) => (
                <span className={`badge ${row.is_active ? "bg-light-success" : "bg-light-dark"}`}>
                    {getFormattedMessage(row.is_active ? "hrm.leave-type.active" : "hrm.leave-type.inactive")}
                </span>
            ),
        },
        {
            name: getFormattedMessage("react-data-table.action.column.label"),
            right: true,
            ignoreRowClick: true,
            allowOverflow: true,
            button: true,
            width: "120px",
            cell: (row) => (
                <ActionButton
                    item={row}
                    goToEditProduct={(item) => { setEditing(item); setFormShow(true); }}
                    isEditMode={true}
                    onClickDeleteModel={(item) => setDeleting(item)}
                />
            ),
        },
    ];

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.salary-components.title")} />
            <p className="hrm-form-hint mb-4">{getFormattedMessage("hrm.salary-components.hint")}</p>
            <ReactDataTable
                columns={columns}
                items={itemsValue}
                onChange={onChange}
                isLoading={isLoading}
                totalRows={totalRecord}
                AddButton={
                    <Button variant="primary" className="table-toolbar__create" onClick={() => { setEditing(null); setFormShow(true); }}>
                        <FiPlus /> {getFormattedMessage("hrm.salary-component.create.title")}
                    </Button>
                }
            />
            <SalaryComponentForm show={formShow} component={editing} handleClose={() => setFormShow(false)} onSaved={refresh} />
            {deleting && (
                <DeleteModel
                    deleteModel={!!deleting}
                    onClickDeleteModel={() => setDeleting(null)}
                    deleteUserClick={() => {
                        deleteSalaryComponent(deleting.id).then(refresh).catch(() => {});
                        setDeleting(null);
                    }}
                    name={getFormattedMessage("hrm.salary-component.title")}
                />
            )}
        </MasterLayout>
    );
};

const mapStateToProps = (state) => {
    const { salaryComponents, totalRecord, isLoading } = state;
    return { salaryComponents, totalRecord, isLoading };
};

export default connect(mapStateToProps, { fetchSalaryComponents, deleteSalaryComponent })(SalaryComponents);
