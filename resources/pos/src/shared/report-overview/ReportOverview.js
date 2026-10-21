import React from "react";
import { useSelector } from "react-redux";
import ReactApexChart from "react-apexcharts";
import moment from "moment";
import { FiArrowUpRight, FiArrowDownRight, FiMinus, FiBarChart2 } from "react-icons/fi";
import { formatAmount, placeholderText } from "../sharedMethod";
import { useReportSummary } from "../../store/action/reportSummaryAction";

const PALETTE = ["#1E3A8A", "#0AC074", "#FFB821", "#0099FB", "#F62947", "#6275AD", "#9AA6CA"];

// KPIs where a rise is bad news (shown red when up, green when down)
const LOWER_IS_BETTER = ["due", "cost", "expenses", "late", "absent", "out", "low", "returns",
    "sale_returns", "purchase_returns", "shortfall", "items", "pending"];

const t = (key) => (key ? placeholderText(key) : "");

const formatCategory = (value) => {
    if (typeof value !== "string") return value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return moment(value).format("DD MMM");
    if (/^\d{4}-\d{2}$/.test(value)) return moment(value + "-01").format("MMM YY");
    return value;
};

const ReportOverview = ({ type, params = {}, showKpis = true }) => {
    const { frontSetting, allConfigData } = useSelector((state) => state);
    const { loading, data } = useReportSummary(type, params);
    const symbol = (frontSetting && frontSetting.value && frontSetting.value.currency_symbol) || "";
    const right = allConfigData && allConfigData.is_currency_right === "true";

    // formatAmount only shortens positive numbers, so keep the sign aside
    const compactNumber = (number) => (number < 0 ? "-" : "") + formatAmount(Math.round(Math.abs(number)));
    const money = (value, compact = false) => {
        const number = Number(value || 0);
        const text = compact
            ? compactNumber(number)
            : number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return right ? `${text} ${symbol}` : `${symbol} ${text}`;
    };
    const formatValue = (value, format, compact = false) => {
        if (format === "currency") return money(value, compact);
        if (format === "percent") return `${Number(value || 0).toFixed(1)}%`;
        const number = Number(value || 0);
        return compact ? compactNumber(number) : number.toLocaleString("en-US", { maximumFractionDigits: 2 });
    };

    if (loading && !data) {
        return (
            <div className="report-overview">
                {showKpis && (
                    <div className="report-overview__kpis">
                        {[0, 1, 2, 3].map((i) => <div key={i} className="report-kpi report-kpi--skeleton" />)}
                    </div>
                )}
                <div className="report-overview__charts">
                    <div className="report-chart report-chart--skeleton report-chart--span-2" />
                    <div className="report-chart report-chart--skeleton" />
                </div>
            </div>
        );
    }

    if (!data || data.forbidden || (!data.kpis.length && !data.charts.length)) {
        return null;
    }

    const period = data.period;
    const periodLabel = period
        ? period.start === period.end
            ? moment(period.start).format("DD MMM YYYY")
            : `${moment(period.start).format("DD MMM YYYY")} – ${moment(period.end).format("DD MMM YYYY")}`
        : null;

    const renderChart = (chart, index) => {
        const isDonut = chart.type === "donut";
        const colors = chart.colors || PALETTE;
        const hasData = isDonut
            ? (chart.series || []).some((v) => Number(v) > 0)
            : (chart.series || []).some((s) => (s.data || []).some((v) => Number(v) !== 0));
        const categories = chart.categories_key
            ? chart.categories_key.map(t)
            : (chart.categories || []).map(formatCategory);

        const options = isDonut
            ? {
                  chart: { fontFamily: "Poppins, Helvetica, sans-serif" },
                  labels: chart.labels_key ? chart.labels_key.map(t) : chart.labels || [],
                  colors,
                  legend: { position: "bottom", markers: { radius: 12 } },
                  dataLabels: { enabled: false },
                  stroke: { width: 2, colors: ["#fff"] },
                  plotOptions: { pie: { donut: { size: "65%" } } },
                  tooltip: { theme: "dark", y: { formatter: (v) => formatValue(v, chart.format) } },
              }
            : {
                  chart: {
                      fontFamily: "Poppins, Helvetica, sans-serif",
                      toolbar: { show: false },
                      stacked: !!chart.stacked,
                      zoom: { enabled: false },
                  },
                  colors,
                  dataLabels: { enabled: false },
                  stroke: { curve: "smooth", width: chart.type === "bar" ? 0 : 3 },
                  fill: chart.type === "area"
                      ? { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0.05 } }
                      : { opacity: 1 },
                  plotOptions: {
                      bar: {
                          horizontal: !!chart.horizontal,
                          distributed: !!chart.distributed,
                          borderRadius: 4,
                          columnWidth: "55%",
                          barHeight: "65%",
                      },
                  },
                  legend: { show: (chart.series || []).length > 1 && !chart.distributed, position: "top", horizontalAlign: "right" },
                  grid: { borderColor: "rgba(0,0,0,0.06)", strokeDashArray: 4 },
                  xaxis: {
                      categories,
                      labels: {
                          rotate: -45,
                          hideOverlappingLabels: true,
                          formatter: chart.horizontal ? (v) => formatValue(v, chart.format, true) : undefined,
                      },
                      tickAmount: !chart.horizontal && categories.length > 14 ? 10 : undefined,
                  },
                  yaxis: {
                      labels: {
                          formatter: chart.horizontal ? undefined : (v) => formatValue(v, chart.format, true),
                          maxWidth: 160,
                      },
                  },
                  tooltip: { theme: "dark", y: { formatter: (v) => formatValue(v, chart.format) } },
              };
        const series = isDonut
            ? (chart.series || []).map(Number)
            : (chart.series || []).map((s) => ({ name: t(s.name_key) || s.name, data: s.data }));
        const span = Math.min(3, chart.span || 1);
        const height = chart.horizontal ? Math.max(150, categories.length * 36 + 70) : 280;

        return (
            <div key={index} className={`report-chart report-chart--span-${span}`}>
                <div className="report-chart__title">{t(chart.title_key)}</div>
                {hasData ? (
                    <ReactApexChart
                        key={`${chart.type}-${index}-${categories.length}`}
                        options={options}
                        series={series}
                        type={isDonut ? "donut" : chart.type}
                        height={height}
                    />
                ) : (
                    <div className="report-chart__empty">
                        <FiBarChart2 />
                        <span>{t("report-summary.no-data")}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`report-overview ${loading ? "report-overview--loading" : ""}`}>
            {periodLabel && (
                <div className="report-overview__period">
                    {period.is_default ? t("report-summary.default-period") + " · " : ""}
                    {periodLabel}
                </div>
            )}
            {showKpis && data.kpis.length > 0 && (
                <div className="report-overview__kpis">
                    {data.kpis.map((kpi) => {
                        const change = kpi.change_pct;
                        const worse = LOWER_IS_BETTER.includes(kpi.key);
                        const tone = change === null || change === 0
                            ? "flat"
                            : (change > 0) !== worse ? "good" : "bad";
                        return (
                            <div key={kpi.key} className="report-kpi">
                                <div className="report-kpi__label">{t(kpi.label_key)}</div>
                                <div className="report-kpi__value">{formatValue(kpi.value, kpi.format)}</div>
                                {change !== null && (
                                    <div className={`report-kpi__change report-kpi__change--${tone}`}>
                                        {change > 0 ? <FiArrowUpRight /> : change < 0 ? <FiArrowDownRight /> : <FiMinus />}
                                        {Math.abs(change).toFixed(1)}%
                                        <span className="report-kpi__vs">{t("report-summary.vs-previous")}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            {data.charts.length > 0 && (
                <div className="report-overview__charts">{data.charts.map(renderChart)}</div>
            )}
        </div>
    );
};

export default ReportOverview;
