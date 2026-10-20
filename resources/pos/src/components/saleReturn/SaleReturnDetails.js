import React, { useEffect } from "react";
import MasterLayout from "../MasterLayout";
import Form from "react-bootstrap/Form";
import { connect } from "react-redux";
import { Col, Row } from "react-bootstrap-v5";
import DataTable from "react-data-table-component";
import { useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faEnvelope,
    faLocationDot,
    faMobileAlt,
    faUser,
} from "@fortawesome/free-solid-svg-icons";
import HeaderTitle from "../header/HeaderTitle";
import TabTitle from "../../shared/tab-title/TabTitle";
import {
    currencySymbolHandling,
    getFormattedMessage,
    placeholderText,
} from "../../shared/sharedMethod";
import { fetchSaleReturnDetails } from "../../store/action/salesReturnDetailAction";
import TopProgressBar from "../../shared/components/loaders/TopProgressBar";
import EmptyComponent from "../empty-component/EmptyComponent";
import DetailSummary from "../../shared/components/DetailSummary";

const SaleReturnDetails = (props) => {
    const {
        fetchSaleReturnDetails,
        saleReturnDetails,
        frontSetting,
        allConfigData,
    } = props;
    const { id } = useParams();

    useEffect(() => {
        fetchSaleReturnDetails(id);
    }, []);

    const columns = [
        {
            name: getFormattedMessage("globally.detail.product"),
            cell: (row) => (
                <>
                    {row.product && row.product.code} (
                    {row.product && row.product.name})
                </>
            ),
        },
        {
            name: getFormattedMessage("globally.detail.net-unit-price"),
            cell: (row) =>
                currencySymbolHandling(
                    allConfigData,
                    frontSetting.value && frontSetting.value.currency_symbol,
                    row.net_unit_price
                ),
        },
        {
            name: getFormattedMessage("globally.detail.quantity"),
            selector: (row) => row.quantity,
        },
        {
            name: getFormattedMessage("globally.detail.unit-price"),
            cell: (row) =>
                currencySymbolHandling(
                    allConfigData,
                    frontSetting.value && frontSetting.value.currency_symbol,
                    row.product_price
                ),
        },
        {
            name: getFormattedMessage("globally.detail.discount"),
            cell: (row) =>
                currencySymbolHandling(
                    allConfigData,
                    frontSetting.value && frontSetting.value.currency_symbol,
                    row.discount_amount
                ),
        },
        {
            name: getFormattedMessage("globally.detail.tax"),
            cell: (row) =>
                currencySymbolHandling(
                    allConfigData,
                    frontSetting.value && frontSetting.value.currency_symbol,
                    row.tax_amount
                ),
        },
        {
            name: getFormattedMessage("globally.detail.subtotal"),
            cell: (row) =>
                currencySymbolHandling(
                    allConfigData,
                    frontSetting.value && frontSetting.value.currency_symbol,
                    row.sub_total
                ),
        },
    ];

    return (
        <MasterLayout>
            <TopProgressBar />
            <HeaderTitle
                title={getFormattedMessage("sale-return.details.title")}
                to="/app/sale-return"
            />
            <TabTitle title={placeholderText("sale-return.details.title")} />
            <div className="card">
                <div className="card-body">
                    <Form>
                        <div className="row">
                            <div className="col-12">
                                <DetailSummary
                                    details={saleReturnDetails}
                                    partyLabel="customer.title"
                                    partyName={saleReturnDetails && saleReturnDetails.customer && saleReturnDetails.customer.name}
                                    allConfigData={allConfigData}
                                    frontSetting={frontSetting}
                                />
                            </div>
                        </div>
                        <Row className="custom-line-height">
                            <Col md={4}>
                                <h5 className="text-gray-600 bg-light p-4 mb-0 text-uppercase">
                                    {getFormattedMessage(
                                        "sale.detail.customer.info"
                                    )}
                                </h5>
                                <div className="p-4">
                                    <div className="d-flex align-items-center pb-1">
                                        <FontAwesomeIcon
                                            icon={faUser}
                                            className="text-primary me-2 fs-5"
                                        />
                                        {saleReturnDetails.customer &&
                                            saleReturnDetails.customer.name}
                                    </div>
                                    <div className="d-flex align-items-center pb-1">
                                        <FontAwesomeIcon
                                            icon={faEnvelope}
                                            className="text-primary me-2 fs-5"
                                        />
                                        {saleReturnDetails.customer &&
                                            saleReturnDetails.customer.email}
                                    </div>
                                    <div className="d-flex align-items-center pb-1">
                                        <FontAwesomeIcon
                                            icon={faMobileAlt}
                                            className="text-primary me-2 fs-5"
                                        />
                                        {saleReturnDetails.customer &&
                                            saleReturnDetails.customer.phone}
                                    </div>
                                    <div className="d-flex align-items-center">
                                        <FontAwesomeIcon
                                            icon={faLocationDot}
                                            className="text-primary me-2 fs-5"
                                        />
                                        {saleReturnDetails.customer &&
                                            saleReturnDetails.customer.address}
                                    </div>
                                </div>
                            </Col>
                            <Col md={4}>
                                <h5 className="text-gray-600 bg-light p-4 mb-0 text-uppercase">
                                    {getFormattedMessage(
                                        "globally.detail.company.info"
                                    )}
                                </h5>
                                <div className="p-4">
                                    <div className="d-flex align-items-center pb-1">
                                        <FontAwesomeIcon
                                            icon={faUser}
                                            className="text-primary me-2 fs-5"
                                        />
                                        {saleReturnDetails.company_info &&
                                            saleReturnDetails.company_info
                                                .company_name}
                                    </div>
                                    <div className="d-flex align-items-center pb-1">
                                        <FontAwesomeIcon
                                            icon={faEnvelope}
                                            className="text-primary me-2 fs-5"
                                        />
                                        {saleReturnDetails.company_info &&
                                            saleReturnDetails.company_info
                                                .email}
                                    </div>
                                    <div className="d-flex align-items-center pb-1">
                                        <FontAwesomeIcon
                                            icon={faMobileAlt}
                                            className="text-primary me-2 fs-5"
                                        />
                                        {saleReturnDetails.company_info &&
                                            saleReturnDetails.company_info
                                                .phone}
                                    </div>
                                    <div className="d-flex align-items-center">
                                        <FontAwesomeIcon
                                            icon={faLocationDot}
                                            className="text-primary me-2 fs-5"
                                        />
                                        {saleReturnDetails.company_info &&
                                            saleReturnDetails.company_info
                                                .address}
                                    </div>
                                </div>
                            </Col>
                            <Col md={4}>
                                <h5 className="text-gray-600 bg-light p-4 mb-0 text-uppercase">
                                    {getFormattedMessage(
                                        "sale.detail.invoice.info"
                                    )}
                                </h5>
                                <div className="p-4">
                                    <div className="pb-1">
                                        <span className="me-2">
                                            {getFormattedMessage(
                                                "globally.detail.reference"
                                            )}{" "}
                                            :
                                        </span>
                                        <span>
                                            {saleReturnDetails &&
                                                saleReturnDetails.reference_code}
                                        </span>
                                    </div>
                                    <div className="pb-1">
                                        <span className="me-2">
                                            {getFormattedMessage(
                                                "globally.detail.status"
                                            )}{" "}
                                            :
                                        </span>
                                        {(saleReturnDetails &&
                                            saleReturnDetails.status === 1 && (
                                                <span className="badge bg-light-success">
                                                    <span>Received</span>
                                                </span>
                                            )) ||
                                            (saleReturnDetails.status === 2 && (
                                                <span className="badge bg-light-primary">
                                                    <span>Pending</span>
                                                </span>
                                            )) ||
                                            (saleReturnDetails.status === 3 && (
                                                <span className="badge bg-light-warning">
                                                    <span>Ordered</span>
                                                </span>
                                            ))}
                                    </div>
                                    <div className="pb-1">
                                        <span className="me-2">
                                            {getFormattedMessage(
                                                "globally.detail.warehouse"
                                            )}{" "}
                                            :
                                        </span>
                                        <span>
                                            {saleReturnDetails.warehouse &&
                                                saleReturnDetails.warehouse
                                                    .name}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="me-2">
                                            {getFormattedMessage(
                                                "globally.detail.payment.status"
                                            )}{" "}
                                            :
                                        </span>
                                        <span className="badge bg-light-success">
                                            <span>Unpaid</span>
                                        </span>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                        <div className="mt-5">
                            <h5 className="font-weight-bold text-center mb-5">
                                {getFormattedMessage(
                                    "globally.detail.order.summary"
                                )}
                            </h5>
                            <DataTable
                                columns={columns}
                                data={
                                    saleReturnDetails.sale_return_items || []
                                }
                                noDataComponent={<EmptyComponent />}
                                pagination={false}
                            />
                        </div>
                        <div className="col-xxl-5 col-lg-6 col-md-6 col-12 float-end">
                            <div className="card">
                                <div className="card-body pt-7 pb-2">
                                    <div className="table-responsive">
                                        <table className="table border">
                                            <tbody>
                                                <tr>
                                                    <td className="py-3">
                                                        {getFormattedMessage(
                                                            "globally.detail.order.tax"
                                                        )}
                                                    </td>
                                                    <td className="py-3">
                                                        {currencySymbolHandling(
                                                            allConfigData,
                                                            frontSetting.value &&
                                                                frontSetting
                                                                    .value
                                                                    .currency_symbol,
                                                            saleReturnDetails &&
                                                                saleReturnDetails.tax_amount >
                                                                    0
                                                                ? saleReturnDetails.tax_amount
                                                                : "0.00"
                                                        )}{" "}
                                                        (
                                                        {saleReturnDetails &&
                                                            parseFloat(
                                                                saleReturnDetails.tax_rate
                                                            ).toFixed(2)}
                                                        %)
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-3">
                                                        {getFormattedMessage(
                                                            "globally.detail.discount"
                                                        )}
                                                    </td>
                                                    <td className="py-3">
                                                        {currencySymbolHandling(
                                                            allConfigData,
                                                            frontSetting.value &&
                                                                frontSetting
                                                                    .value
                                                                    .currency_symbol,
                                                            saleReturnDetails &&
                                                                saleReturnDetails.discount
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-3">
                                                        {getFormattedMessage(
                                                            "globally.detail.shipping"
                                                        )}
                                                    </td>
                                                    <td className="py-3">
                                                        {currencySymbolHandling(
                                                            allConfigData,
                                                            frontSetting.value &&
                                                                frontSetting
                                                                    .value
                                                                    .currency_symbol,
                                                            saleReturnDetails &&
                                                                saleReturnDetails.shipping
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-3 text-primary">
                                                        {getFormattedMessage(
                                                            "globally.detail.grand.total"
                                                        )}
                                                    </td>
                                                    <td className="py-3 text-primary">
                                                        {currencySymbolHandling(
                                                            allConfigData,
                                                            frontSetting.value &&
                                                                frontSetting
                                                                    .value
                                                                    .currency_symbol,
                                                            saleReturnDetails &&
                                                                saleReturnDetails.grand_total
                                                        )}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Form>
                </div>
            </div>
        </MasterLayout>
    );
};

const mapStateToProps = (state) => {
    const { saleReturnDetails, frontSetting, allConfigData } = state;
    return { saleReturnDetails, frontSetting, allConfigData };
};

export default connect(mapStateToProps, { fetchSaleReturnDetails })(
    SaleReturnDetails
);
