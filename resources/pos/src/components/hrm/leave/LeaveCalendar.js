import React, { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import Select from "react-select";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { fetchLeaveCalendar } from "../../../store/action/hrm/leaveActions";
import { fetchAllDepartments } from "../../../store/action/hrm/hrmActions";
import { fetchAllWarehouses } from "../../../store/action/warehouseAction";
import { currentMonthString, todayString, weekdayLabel } from "../attendance/attendanceShared";
import { LeaveTypeTag } from "./leaveShared";

const filterStyles = {
    container: (base) => ({ ...base, minWidth: 170 }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const pad = (n) => String(n).padStart(2, "0");

const shiftMonth = (month, delta) => {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(y, m - 1 + delta, 1);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
};

const LeaveCalendar = ({ warehouses, allDepartments, fetchLeaveCalendar, fetchAllWarehouses, fetchAllDepartments }) => {
    const [month, setMonth] = useState(currentMonthString());
    const [branch, setBranch] = useState(null);
    const [department, setDepartment] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllWarehouses();
        fetchAllDepartments();
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchLeaveCalendar({ month, warehouse_id: branch?.value, department_id: department?.value })
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [month, branch, department]);

    // weeks of the month (Sunday first); each cell { date, day, inMonth }
    const weeks = useMemo(() => {
        const [y, m] = month.split("-").map(Number);
        const first = new Date(y, m - 1, 1);
        const start = new Date(y, m - 1, 1 - first.getDay());
        const result = [];
        const cursor = new Date(start);
        do {
            const week = [];
            for (let i = 0; i < 7; i++) {
                week.push({
                    date: `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`,
                    day: cursor.getDate(),
                    inMonth: cursor.getMonth() === m - 1,
                });
                cursor.setDate(cursor.getDate() + 1);
            }
            result.push(week);
        } while (cursor.getMonth() === m - 1);
        return result;
    }, [month]);

    const itemsOn = (date) =>
        data ? data.items.filter((item) => item.from_date <= date && item.to_date >= date) : [];

    const legend = useMemo(() => {
        if (!data) return [];
        const seen = {};
        data.items.forEach((item) => {
            seen[item.leave_type_id] = { name: item.leave_type_name, color: item.leave_type_color };
        });
        return Object.values(seen);
    }, [data]);

    const toOptions = (list) => (list || []).map((item) => ({ value: item.id, label: item.attributes.name }));
    const today = todayString();
    const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleString(undefined, { month: "long", year: "numeric" });

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.leave-calendar.title")} />
            <div className="hrm-filter-bar">
                <div className="hrm-cal-nav">
                    <button type="button" className="btn btn-outline-secondary table-toolbar__filter" onClick={() => setMonth(shiftMonth(month, -1))}>
                        <FiChevronLeft />
                    </button>
                    <input type="month" className="form-control hrm-filter-bar__date" value={month}
                        onChange={(e) => e.target.value && setMonth(e.target.value)} />
                    <button type="button" className="btn btn-outline-secondary table-toolbar__filter" onClick={() => setMonth(shiftMonth(month, 1))}>
                        <FiChevronRight />
                    </button>
                </div>
                <Select isClearable styles={filterStyles} menuPortalTarget={document.body} options={toOptions(warehouses)}
                    value={branch} placeholder={placeholderText("hrm.branch.all")} onChange={setBranch} />
                <Select isClearable styles={filterStyles} menuPortalTarget={document.body} options={toOptions(allDepartments)}
                    value={department} placeholder={placeholderText("hrm.department.all")} onChange={setDepartment} />
            </div>
            <div className="card">
                <div className="card-body">
                    <div className="hrm-cal-head">
                        <h3 className="hrm-section-title mb-0">{monthLabel}</h3>
                        <div className="hrm-cal-legend">
                            {legend.map((item) => <LeaveTypeTag key={item.name} name={item.name} color={item.color} />)}
                            <span className="hrm-cal-legend__pending">{getFormattedMessage("hrm.leave.status.pending")}</span>
                        </div>
                    </div>
                    {loading && !data ? (
                        <div className="empty-state"><div className="empty-state__text">{getFormattedMessage("globally.loading.label")}</div></div>
                    ) : (
                        <div className="hrm-cal">
                            <div className="hrm-cal__row hrm-cal__row--head">
                                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                                    <div className="hrm-cal__wd" key={day}>{weekdayLabel(day).slice(0, 3)}</div>
                                ))}
                            </div>
                            {weeks.map((week) => (
                                <div className="hrm-cal__row" key={week[0].date}>
                                    {week.map((cell) => {
                                        const items = cell.inMonth ? itemsOn(cell.date) : [];
                                        return (
                                            <div key={cell.date}
                                                className={`hrm-cal__cell ${cell.inMonth ? "" : "hrm-cal__cell--out"} ${cell.date === today ? "hrm-cal__cell--today" : ""}`}>
                                                <div className="hrm-cal__day">{cell.day}</div>
                                                {items.slice(0, 4).map((item) => (
                                                    <div key={item.id}
                                                        className={`hrm-cal__item ${item.status === "pending" ? "hrm-cal__item--pending" : ""}`}
                                                        style={{ borderLeftColor: item.leave_type_color, backgroundColor: `${item.leave_type_color}1A` }}
                                                        title={`${item.employee_name} · ${item.leave_type_name}${item.is_half_day ? " (½)" : ""} · ${placeholderText(`hrm.leave.status.${item.status}`)}`}>
                                                        {item.employee_name}{item.is_half_day ? " ½" : ""}
                                                    </div>
                                                ))}
                                                {items.length > 4 && (
                                                    <div className="hrm-cal__more">+{items.length - 4}</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </MasterLayout>
    );
};

const mapStateToProps = (state) => {
    const { warehouses, allDepartments } = state;
    return { warehouses, allDepartments };
};

export default connect(mapStateToProps, { fetchLeaveCalendar, fetchAllWarehouses, fetchAllDepartments })(LeaveCalendar);
