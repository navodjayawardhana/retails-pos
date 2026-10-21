import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import Select from "react-select";
import ReactApexChart from "react-apexcharts";
import { Card, Row } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
    FiUsers,
    FiUserCheck,
    FiClock,
    FiCalendar,
    FiInbox,
    FiDollarSign,
    FiCheck,
    FiX,
} from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { fetchHrDashboard } from "../../../store/action/hrm/dashboardActions";
import { approveLeave, rejectLeave } from "../../../store/action/hrm/leaveActions";
import { fetchAllWarehouses } from "../../../store/action/warehouseAction";
import { portalStyles, toOptions, useMoney } from "../payroll/payrollShared";

const COLORS = ["#1E3A8A", "#0AC074", "#FFB821", "#0099FB", "#F62947", "#6275AD", "#9AA6CA"];

const Kpi = ({ icon, color, value, label, onClick }) => (
    <div className="col-xxl-2 col-xl-4 col-sm-6 widget" onClick={onClick}>
        <div className={`widget-card bg-white rounded-10 px-5 py-6 d-flex align-items-center justify-content-between my-3 ${onClick ? "cursor-pointer" : ""}`}>
            <div className={`${color} widget-icon rounded-10 d-flex align-items-center justify-content-center text-white fs-2`}>
                {icon}
            </div>
            <div className="text-end">
                <h2 className="fs-1 fw-bolder text-gray-900 mb-1">{value}</h2>
                <h3 className="mb-0 fs-6 fw-500 text-gray-600">{label}</h3>
            </div>
        </div>
    </div>
);

const ListCard = ({ title, children, empty }) => (
    <Card className="h-100">
        <Card.Header className="pb-0 px-7">
            <h5 className="mb-0">{title}</h5>
        </Card.Header>
        <Card.Body className="pt-0 px-7 hr-dash-list">
            {children && children.length ? children : <div className="text-gray-600 py-5 text-center">{empty}</div>}
        </Card.Body>
    </Card>
);

const baseChart = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins, Helvetica, sans-serif" },
    dataLabels: { enabled: false },
    legend: { position: "top", horizontalAlign: "right", markers: { radius: 12 } },
    tooltip: { theme: "dark" },
    grid: { borderColor: "rgba(0,0,0,0.06)", strokeDashArray: 4 },
};

const HrDashboard = ({ warehouses, fetchHrDashboard, fetchAllWarehouses, approveLeave, rejectLeave }) => {
    const money = useMoney();
    const navigate = useNavigate();
    const [warehouse, setWarehouse] = useState(null);
    const [data, setData] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const load = () =>
        fetchHrDashboard(warehouse?.value).then(setData).catch(() => setData(null));

    useEffect(() => {
        fetchAllWarehouses();
    }, []);

    useEffect(() => {
        load();
    }, [warehouse]);

    const decide = (id, approve) => {
        setBusyId(id);
        (approve ? approveLeave(id, "") : rejectLeave(id, ""))
            .then(load)
            .catch(() => {})
            .finally(() => setBusyId(null));
    };

    const kpis = data ? data.kpis : {};
    const trend = data ? data.trend : [];

    const trendChart = {
        ...baseChart,
        chart: { ...baseChart.chart, type: "area", stacked: false },
        colors: ["#0AC074", "#FFB821", "#F62947", "#0099FB"],
        stroke: { curve: "smooth", width: 2 },
        fill: { type: "gradient", gradient: { opacityFrom: 0.3, opacityTo: 0.02 } },
        xaxis: { categories: trend.map((t) => t.date.slice(5)), tickAmount: 10, axisBorder: { show: false }, axisTicks: { show: false } },
    };
    const trendSeries = [
        { name: placeholderText("hrm.dashboard.present"), data: trend.map((t) => t.present) },
        { name: placeholderText("hrm.dashboard.late"), data: trend.map((t) => t.late) },
        { name: placeholderText("hrm.dashboard.absent"), data: trend.map((t) => t.absent) },
        { name: placeholderText("hrm.dashboard.on-leave"), data: trend.map((t) => t.leave) },
    ];

    const donut = (rows, valueKey) => ({
        options: {
            ...baseChart,
            labels: rows.map((r) => r.name),
            colors: COLORS,
            legend: { position: "bottom", markers: { radius: 12 } },
            stroke: { width: 2, colors: ["#fff"] },
            plotOptions: { pie: { donut: { size: "62%" } } },
        },
        series: rows.map((r) => Number(r[valueKey])),
    });

    const payroll = data ? data.payroll_cost : [];
    const payrollChart = {
        ...baseChart,
        chart: { ...baseChart.chart, type: "bar" },
        colors: ["#1E3A8A", "#0AC074"],
        plotOptions: { bar: { columnWidth: "45%", borderRadius: 5 } },
        xaxis: { categories: payroll.map((p) => p.month), axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { formatter: (v) => money(v) } },
        tooltip: { theme: "dark", y: { formatter: (v) => money(v) } },
    };
    const payrollSeries = [
        { name: placeholderText("hrm.dashboard.gross"), data: payroll.map((p) => p.gross) },
        { name: placeholderText("hrm.dashboard.net"), data: payroll.map((p) => p.net) },
    ];

    const leaveRange = (row) =>
        row.from_date === row.to_date ? row.from_date : `${row.from_date} → ${row.to_date}`;

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.dashboard.title")} />
            <div className="hrm-filter-bar">
                <Select isClearable styles={portalStyles} menuPortalTarget={document.body} options={toOptions(warehouses)}
                    value={warehouse} placeholder={placeholderText("hrm.branch.all")} onChange={setWarehouse} />
                <span className="flex-grow-1" />
                {data && <span className="text-gray-600">{data.date}</span>}
            </div>

            <Row className="g-0 mx-n3">
                <Kpi icon={<FiUsers />} color="bg-primary" value={kpis.active_employees ?? "–"}
                    label={getFormattedMessage("hrm.dashboard.active-employees")} onClick={() => navigate("/app/employees")} />
                <Kpi icon={<FiUserCheck />} color="bg-success" value={kpis.present_today ?? "–"}
                    label={getFormattedMessage("hrm.dashboard.present-today")} onClick={() => navigate("/app/attendance")} />
                <Kpi icon={<FiClock />} color="bg-warning" value={kpis.late_today ?? "–"}
                    label={getFormattedMessage("hrm.dashboard.late-today")} onClick={() => navigate("/app/attendance")} />
                <Kpi icon={<FiCalendar />} color="bg-info" value={kpis.on_leave_today ?? "–"}
                    label={getFormattedMessage("hrm.dashboard.on-leave-today")} onClick={() => navigate("/app/leave-calendar")} />
                <Kpi icon={<FiInbox />} color="bg-danger" value={kpis.pending_leave ?? "–"}
                    label={getFormattedMessage("hrm.dashboard.pending-leave")} onClick={() => navigate("/app/leave-requests")} />
                <Kpi icon={<FiDollarSign />} color="bg-primary" value={kpis.payroll_status ? money(kpis.payroll_net) : "–"}
                    label={
                        <>
                            {getFormattedMessage("hrm.dashboard.payroll-this-month")}
                            {kpis.payroll_status ? ` · ${kpis.payroll_status}` : ""}
                        </>
                    }
                    onClick={() => navigate("/app/payroll-runs")} />
            </Row>

            <Row className="g-4 mt-1">
                <div className="col-xxl-8 col-12">
                    <Card className="h-100">
                        <Card.Header className="pb-0 px-7"><h5 className="mb-0">{getFormattedMessage("hrm.dashboard.attendance-trend")}</h5></Card.Header>
                        <Card.Body>
                            {data && <ReactApexChart type="area" height={300} options={trendChart} series={trendSeries} />}
                        </Card.Body>
                    </Card>
                </div>
                <div className="col-xxl-4 col-12">
                    <Card className="h-100">
                        <Card.Header className="pb-0 px-7"><h5 className="mb-0">{getFormattedMessage("hrm.dashboard.headcount-department")}</h5></Card.Header>
                        <Card.Body>
                            {data && data.by_department.length > 0 ? (
                                <ReactApexChart type="donut" height={300} {...donut(data.by_department, "count")} />
                            ) : <div className="text-gray-600 py-5 text-center">{getFormattedMessage("hrm.dashboard.no-data")}</div>}
                        </Card.Body>
                    </Card>
                </div>
                <div className="col-xxl-8 col-12">
                    <Card className="h-100">
                        <Card.Header className="pb-0 px-7"><h5 className="mb-0">{getFormattedMessage("hrm.dashboard.payroll-cost")}</h5></Card.Header>
                        <Card.Body>
                            {data && <ReactApexChart type="bar" height={300} options={payrollChart} series={payrollSeries} />}
                        </Card.Body>
                    </Card>
                </div>
                <div className="col-xxl-4 col-12">
                    <Card className="h-100">
                        <Card.Header className="pb-0 px-7"><h5 className="mb-0">{getFormattedMessage("hrm.dashboard.leave-by-type")}</h5></Card.Header>
                        <Card.Body>
                            {data && data.leave_by_type.length > 0 ? (
                                <ReactApexChart type="donut" height={300} {...donut(data.leave_by_type, "days")} />
                            ) : <div className="text-gray-600 py-5 text-center">{getFormattedMessage("hrm.dashboard.no-data")}</div>}
                        </Card.Body>
                    </Card>
                </div>
                <div className="col-xxl-4 col-12">
                    <Card className="h-100">
                        <Card.Header className="pb-0 px-7"><h5 className="mb-0">{getFormattedMessage("hrm.dashboard.headcount-branch")}</h5></Card.Header>
                        <Card.Body>
                            {data && data.by_branch.length > 0 ? (
                                <ReactApexChart type="donut" height={280} {...donut(data.by_branch, "count")} />
                            ) : <div className="text-gray-600 py-5 text-center">{getFormattedMessage("hrm.dashboard.no-data")}</div>}
                        </Card.Body>
                    </Card>
                </div>
                <div className="col-xxl-4 col-md-6 col-12">
                    <ListCard title={getFormattedMessage("hrm.dashboard.absent-late-today")} empty={getFormattedMessage("hrm.dashboard.everyone-in")}>
                        {data && [
                            ...data.late_today.map((p) => (
                                <div className="hr-dash-row" key={`l${p.employee_id}`}>
                                    <span><strong>{p.name}</strong><small>{p.employee_code} · {p.department || "—"}</small></span>
                                    <span className="badge bg-light-warning">{getFormattedMessage("hrm.dashboard.late")} {p.late_minutes}m</span>
                                </div>
                            )),
                            ...data.absent_today.map((p) => (
                                <div className="hr-dash-row" key={`a${p.employee_id}`}>
                                    <span><strong>{p.name}</strong><small>{p.employee_code} · {p.department || "—"}</small></span>
                                    <span className={`badge ${p.reason === "absent" ? "bg-light-danger" : "bg-light-secondary text-gray-700"}`}>
                                        {getFormattedMessage(p.reason === "absent" ? "hrm.dashboard.absent" : "hrm.dashboard.not-marked")}
                                    </span>
                                </div>
                            )),
                        ]}
                    </ListCard>
                </div>
                <div className="col-xxl-4 col-md-6 col-12">
                    <ListCard title={getFormattedMessage("hrm.dashboard.upcoming-leave")} empty={getFormattedMessage("hrm.dashboard.no-upcoming-leave")}>
                        {data && data.upcoming_leave.map((r) => (
                            <div className="hr-dash-row" key={r.id}>
                                <span><strong>{r.name}</strong><small>{r.type} · {leaveRange(r)}</small></span>
                                <span className={`badge ${r.status === "approved" ? "bg-light-success" : "bg-light-warning"}`}>{r.days}d</span>
                            </div>
                        ))}
                    </ListCard>
                </div>
                <div className="col-12">
                    <ListCard title={getFormattedMessage("hrm.dashboard.pending-approvals")} empty={getFormattedMessage("hrm.dashboard.no-pending")}>
                        {data && data.pending_leave.map((r) => (
                            <div className="hr-dash-row" key={r.id}>
                                <span><strong>{r.name}</strong><small>{r.type} · {leaveRange(r)} · {r.days}d</small></span>
                                <span className="d-flex gap-2">
                                    <button type="button" className="action-btn action-btn--view" disabled={busyId === r.id}
                                        title={placeholderText("hrm.dashboard.approve")} onClick={() => decide(r.id, true)}><FiCheck /></button>
                                    <button type="button" className="action-btn action-btn--delete" disabled={busyId === r.id}
                                        title={placeholderText("hrm.dashboard.reject")} onClick={() => decide(r.id, false)}><FiX /></button>
                                </span>
                            </div>
                        ))}
                    </ListCard>
                </div>
            </Row>
        </MasterLayout>
    );
};

const mapStateToProps = (state) => ({ warehouses: state.warehouses });

export default connect(mapStateToProps, { fetchHrDashboard, fetchAllWarehouses, approveLeave, rejectLeave })(HrDashboard);
