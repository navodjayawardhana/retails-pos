import React from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import ReactApexChart from "react-apexcharts";
import { currencySymbolHandling } from "../sharedMethod";

const Widget = (props) => {
    const {
        title,
        value,
        currency,
        icon,
        className,
        onClick,
        allConfigData,
        sparklineData,
        sparklineColor,
    } = props;

    const sparklineOptions = {
        chart: { sparkline: { enabled: true } },
        stroke: { curve: "smooth", width: 2 },
        fill: {
            type: "gradient",
            gradient: { opacityFrom: 0.35, opacityTo: 0 },
        },
        colors: [sparklineColor || "#1E3A8A"],
        tooltip: { enabled: false },
    };

    const renderTooltip = (props) => (
        <Tooltip id="button-tooltip" {...props}>
            {currency} {value}
        </Tooltip>
    );

    const isClickable = className && className.includes("cursor-pointer");

    return (
        <div className="col-xxl-3 col-xl-4 col-sm-6 widget" onClick={onClick}>
            <div
                className={`widget-card bg-white shadow-md rounded-10 p-xxl-7 px-6 py-7 d-flex align-items-center justify-content-between my-3 ${
                    isClickable ? "cursor-pointer" : ""
                }`}
            >
                <div
                    className={`${className} widget-icon rounded-10 d-flex align-items-center justify-content-center`}
                >
                    {icon}
                </div>
                <div className="text-end">
                    <OverlayTrigger
                        placement="bottom"
                        delay={{ show: 250, hide: 400 }}
                        overlay={renderTooltip}
                    >
                        <h2 className="fs-1-xxl fw-bolder text-gray-900">
                            {currencySymbolHandling(
                                allConfigData,
                                currency,
                                value,
                                true
                            )}
                        </h2>
                    </OverlayTrigger>
                    <h3 className="mb-0 fs-6 fw-500 text-gray-600">{title}</h3>
                </div>
                {sparklineData && sparklineData.length > 0 && (
                    <div className="widget-sparkline">
                        <ReactApexChart
                            options={sparklineOptions}
                            series={[{ data: sparklineData }]}
                            type="area"
                            height={36}
                            width="100%"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
export default Widget;
