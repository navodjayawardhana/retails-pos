import React, { useEffect } from "react";
import { Card, Row } from "react-bootstrap";
import DataTable from "react-data-table-component";
import { connect } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye } from "@fortawesome/free-solid-svg-icons";
import {
    currencySymbolHandling,
    getFormattedMessage,
    placeholderText,
} from "../../shared/sharedMethod";
import { recentSales } from "../../store/action/recentSaleDashboardAction";
import EmptyComponent from "../empty-component/EmptyComponent";

const RecentSale = (props) => {
    const { recentSales, recentSalesDashboard, frontSetting, allConfigData } =
        props;

    useEffect(() => {
        recentSales();
    }, []);

    const goToDetailScreen = (saleId) => {
        window.location.href = "/app/sales/detail/" + saleId;
    };

    const statusBadge = (status) => {
        if (status === 1) {
            return (
                <span className="badge bg-light-success">
                    {getFormattedMessage("status.filter.complated.label")}
                </span>
            );
        }
        if (status === 2) {
            return (
                <span className="badge bg-light-primary">
                    {getFormattedMessage("status.filter.pending.label")}
                </span>
            );
        }
        if (status === 3) {
            return (
                <span className="badge bg-light-warning">
                    {getFormattedMessage("status.filter.ordered.label")}
                </span>
            );
        }
        return null;
    };

    const paymentStatusBadge = (status) => {
        if (status === 1) {
            return (
                <span className="badge bg-light-success">
                    {getFormattedMessage("payment-status.filter.paid.label")}
                </span>
            );
        }
        if (status === 2) {
            return (
                <span className="badge bg-light-warning">
                    {getFormattedMessage(
                        "payment-status.filter.unpaid.label"
                    )}
                </span>
            );
        }
        return null;
    };

    const columns = [
        {
            name: getFormattedMessage("dashboard.recentSales.reference.label"),
            selector: (row) => row.attributes.reference_code,
        },
        {
            name: getFormattedMessage("dashboard.recentSales.customer.label"),
            selector: (row) => row.attributes.customer_name,
        },
        {
            name: getFormattedMessage("dashboard.recentSales.status.label"),
            cell: (row) => statusBadge(row.attributes.status),
        },
        {
            name: getFormattedMessage("dashboard.grantTotal.label"),
            cell: (row) =>
                currencySymbolHandling(
                    allConfigData,
                    frontSetting.value && frontSetting.value.currency_symbol,
                    row.attributes.grand_total
                ),
        },
        {
            name: getFormattedMessage("dashboard.recentSales.paid.label"),
            cell: (row) =>
                currencySymbolHandling(
                    allConfigData,
                    frontSetting.value && frontSetting.value.currency_symbol,
                    row.attributes.paid_amount === null
                        ? "0.00"
                        : row.attributes.paid_amount
                ),
        },
        {
            name: getFormattedMessage(
                "dashboard.recentSales.paymentStatus.label"
            ),
            cell: (row) => paymentStatusBadge(row.attributes.payment_status),
        },
        {
            name: "",
            right: true,
            cell: (row) => (
                <button
                    title={placeholderText("globally.view.tooltip.label")}
                    className="btn text-success px-2 fs-3 border-0"
                    onClick={() => goToDetailScreen(row.id)}
                >
                    <FontAwesomeIcon icon={faEye} />
                </button>
            ),
        },
    ];

    return (
        <div className="pt-6">
            <Row className="g-4">
                <div className="col-xxl-12 col-12">
                    <Card>
                        <Card.Header className="pb-0 px-10">
                            <h5 className="mb-0">
                                {getFormattedMessage(
                                    "dashboard.recentSales.title"
                                )}
                            </h5>
                        </Card.Header>
                        <Card.Body className="pt-7 pb-2">
                            <DataTable
                                columns={columns}
                                data={recentSalesDashboard || []}
                                noDataComponent={<EmptyComponent />}
                                pagination
                                paginationPerPage={5}
                                paginationRowsPerPageOptions={[5, 10, 25]}
                            />
                        </Card.Body>
                    </Card>
                </div>
            </Row>
        </div>
    );
};

const mapStateToProps = (state) => {
    const { recentSalesDashboard, allConfigData } = state;
    return { recentSalesDashboard, allConfigData };
};

export default connect(mapStateToProps, { recentSales })(RecentSale);
