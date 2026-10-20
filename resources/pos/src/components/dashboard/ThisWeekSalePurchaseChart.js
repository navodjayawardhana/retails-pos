import React, { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { Card, NavDropdown } from "react-bootstrap";
import {
    getFormattedMessage,
    placeholderText,
    currencySymbolHandling,
} from "../../shared/sharedMethod";
import { Row } from "react-bootstrap-v5";
import { connect } from "react-redux";
import { weekSalePurchases } from "../../store/action/weeksalePurchaseAction";
import { yearlyTopProduct } from "../../store/action/yearlyTopProductAction";
import moment from "moment";
import TopSellingProductChart from "./TopSellingProductChart";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

const ThisWeekSalePurchaseChart = (props) => {
    const {
        frontSetting,
        weekSalePurchases,
        weekSalePurchase,
        yearTopProduct,
        yearlyTopProduct,
        allConfigData,
    } = props;

    const [chartType, setChartType] = useState("bar");
    const year = new Date();

    useEffect(() => {
        weekSalePurchases();
        yearlyTopProduct();
    }, []);

    const currency = frontSetting
        ? frontSetting.value && frontSetting.value.currency_symbol
        : "$";

    const yFormatter = (value) =>
        currencySymbolHandling(allConfigData, currency ? currency : "", value, true);

    const categories = weekSalePurchase ? weekSalePurchase.dates : [];

    const series = [
        {
            name: placeholderText("sales.title"),
            data: weekSalePurchase ? weekSalePurchase.sales : [],
        },
        {
            name: placeholderText("purchases.title"),
            data: weekSalePurchase ? weekSalePurchase.purchases : [],
        },
    ];

    const chartOptions = {
        chart: {
            type: chartType === "bar" ? "bar" : "area",
            toolbar: { show: false },
            fontFamily: "Poppins, Helvetica, sans-serif",
        },
        colors: ["#1E3A8A", "#0AC074"],
        dataLabels: { enabled: false },
        stroke: {
            curve: "smooth",
            width: chartType === "bar" ? 0 : 3,
        },
        fill:
            chartType === "bar"
                ? { opacity: 1 }
                : {
                      type: "gradient",
                      gradient: {
                          shadeIntensity: 1,
                          opacityFrom: 0.35,
                          opacityTo: 0.05,
                          stops: [0, 90, 100],
                      },
                  },
        plotOptions: {
            bar: {
                columnWidth: "45%",
                borderRadius: 6,
                borderRadiusApplication: "end",
            },
        },
        grid: {
            borderColor: "rgba(0, 0, 0, 0.06)",
            strokeDashArray: 4,
            xaxis: { lines: { show: false } },
        },
        xaxis: {
            categories,
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            labels: {
                formatter: (value) => yFormatter(value),
            },
        },
        legend: {
            position: "top",
            horizontalAlign: "right",
            markers: { radius: 12 },
        },
        tooltip: {
            theme: "dark",
            y: {
                formatter: (value) => yFormatter(value),
            },
        },
    };

    return (
        <Row className="g-4">
            <div className="col-xxl-8 col-12">
                <Card>
                    <Card.Header className="pb-0 px-10">
                        <h5 className="mb-0">
                            {getFormattedMessage(
                                "dashboard.ThisWeekSales&Purchases.title"
                            )}
                        </h5>
                        <div className="mb-2 chart-dropdown">
                            <NavDropdown
                                title={<FontAwesomeIcon icon={faBars} />}
                            >
                                <NavDropdown.Item
                                    href="#"
                                    className={`${
                                        chartType === "bar" ? "text-primary" : ""
                                    } fs-6`}
                                    onClick={() => setChartType("bar")}
                                >
                                    {getFormattedMessage("bar.title")}
                                </NavDropdown.Item>
                                <NavDropdown.Item
                                    href="#"
                                    className={`${
                                        chartType === "line" ? "text-primary" : ""
                                    } fs-6`}
                                    onClick={() => setChartType("line")}
                                >
                                    {getFormattedMessage("line.title")}
                                </NavDropdown.Item>
                            </NavDropdown>
                        </div>
                    </Card.Header>
                    <Card.Body>
                        {weekSalePurchase && currency && (
                            <ReactApexChart
                                options={chartOptions}
                                series={series}
                                type={chartOptions.chart.type}
                                height={340}
                            />
                        )}
                    </Card.Body>
                </Card>
            </div>
            <div className="col-xxl-4 col-12">
                <Card>
                    <Card.Header className="pb-0 px-0 justify-content-center">
                        <h4 className="mb-3 me-1">
                            {getFormattedMessage(
                                "dashboard.TopSellingProducts.title"
                            )}
                        </h4>
                        <h4>({moment(year).format("YYYY")})</h4>
                    </Card.Header>
                    <Card.Body className="p-3">
                        <TopSellingProductChart
                            yearTopProduct={yearTopProduct}
                            frontSetting={frontSetting}
                        />
                    </Card.Body>
                </Card>
            </div>
        </Row>
    );
};

const mapStateToProps = (state) => {
    const { weekSalePurchase, yearTopProduct, allConfigData } = state;
    return { weekSalePurchase, yearTopProduct, allConfigData };
};

export default connect(mapStateToProps, {
    weekSalePurchases,
    yearlyTopProduct,
})(ThisWeekSalePurchaseChart);
