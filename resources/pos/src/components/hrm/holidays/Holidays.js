import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Button } from "react-bootstrap-v5";
import Select from "react-select";
import { FiPlus } from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import ReactDataTable from "../../../shared/table/ReactDataTable";
import ActionButton from "../../../shared/action-buttons/ActionButton";
import DeleteModel from "../../../shared/action-buttons/DeleteModel";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { fetchHolidays, deleteHoliday } from "../../../store/action/hrm/attendanceActions";
import { fetchAllWarehouses } from "../../../store/action/warehouseAction";
import HolidayForm, { HOLIDAY_TYPES } from "./HolidayForm";

const TYPE_BADGE = {
    poya: "bg-light-warning",
    public: "bg-light-primary",
    mercantile: "bg-light-info",
    company: "bg-light-success",
};

const filterStyles = {
    container: (base) => ({ ...base, minWidth: 170 }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const Holidays = ({ holidays, warehouses, totalRecord, isLoading, fetchHolidays, deleteHoliday, fetchAllWarehouses }) => {
    const [formShow, setFormShow] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const thisYear = new Date().getFullYear();
    const [year, setYear] = useState({ value: thisYear, label: String(thisYear) });
    const [type, setType] = useState(null);
    const lastFilter = useRef({});
    const firstRun = useRef(true);

    const extra = () => ({ year: year ? year.value : undefined, type: type ? type.value : undefined });

    useEffect(() => {
        fetchAllWarehouses();
    }, []);

    useEffect(() => {
        if (firstRun.current) {
            firstRun.current = false;
            return;
        }
        fetchHolidays({ ...lastFilter.current, page: 1 }, true, extra());
    }, [year, type]);

    const onChange = (filter) => {
        lastFilter.current = filter;
        fetchHolidays(filter, true, extra());
    };
    const refresh = () => fetchHolidays(lastFilter.current, false, extra());

    const yearOptions = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2].map((y) => ({ value: y, label: String(y) }));
    const typeOptions = HOLIDAY_TYPES.map((t) => ({ value: t, label: placeholderText(`hrm.holiday.type.${t}`) }));

    const itemsValue = holidays.map((holiday) => ({ id: holiday.id, ...holiday.attributes }));

    const columns = [
        { name: getFormattedMessage("hrm.holiday.date.label"), selector: (row) => row.date, sortField: "date", sortable: true },
        { name: getFormattedMessage("hrm.day.label"), selector: (row) => row.day_name },
        { name: getFormattedMessage("globally.input.name.label"), selector: (row) => row.name, sortField: "name", sortable: true },
        {
            name: getFormattedMessage("hrm.holiday.type.label"),
            cell: (row) => <span className={`badge ${TYPE_BADGE[row.type] || "bg-light"}`}>{getFormattedMessage(`hrm.holiday.type.${row.type}`)}</span>,
        },
        {
            name: getFormattedMessage("hrm.holiday.paid"),
            cell: (row) => (
                <span className={`badge ${row.is_paid ? "bg-light-success" : "bg-light-danger"}`}>
                    {getFormattedMessage(row.is_paid ? "hrm.yes" : "hrm.no")}
                </span>
            ),
        },
        { name: getFormattedMessage("hrm.branch.label"), selector: (row) => row.branch_name || getFormattedMessage("hrm.holiday.all-branches") },
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
            <TabTitle title={placeholderText("hrm.holidays.title")} />
            <div className="hrm-filter-bar">
                <Select options={yearOptions} styles={filterStyles} menuPortalTarget={document.body} value={year} onChange={setYear} />
                <Select isClearable options={typeOptions} styles={filterStyles} menuPortalTarget={document.body}
                    value={type} placeholder={placeholderText("hrm.holiday.type.all")} onChange={setType} />
            </div>
            <ReactDataTable
                columns={columns}
                items={itemsValue}
                onChange={onChange}
                isLoading={isLoading}
                totalRows={totalRecord}
                AddButton={
                    <Button variant="primary" className="table-toolbar__create" onClick={() => { setEditing(null); setFormShow(true); }}>
                        <FiPlus /> {getFormattedMessage("hrm.holiday.create.title")}
                    </Button>
                }
            />
            <HolidayForm show={formShow} holiday={editing} warehouses={warehouses} handleClose={() => setFormShow(false)} onSaved={refresh} />
            {deleting && (
                <DeleteModel
                    deleteModel={!!deleting}
                    onClickDeleteModel={() => setDeleting(null)}
                    deleteUserClick={() => {
                        deleteHoliday(deleting.id).then(refresh).catch(() => {});
                        setDeleting(null);
                    }}
                    name={getFormattedMessage("hrm.holiday.title")}
                />
            )}
        </MasterLayout>
    );
};

const mapStateToProps = (state) => {
    const { holidays, warehouses, totalRecord, isLoading } = state;
    return { holidays, warehouses, totalRecord, isLoading };
};

export default connect(mapStateToProps, { fetchHolidays, deleteHoliday, fetchAllWarehouses })(Holidays);
