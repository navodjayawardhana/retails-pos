import React, { useEffect, useState } from "react";
import { Card, Row } from "react-bootstrap";
import DataTable from "react-data-table-component";
import { connect, useSelector } from "react-redux";
import moment from "moment/moment";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye } from "@fortawesome/free-solid-svg-icons";
import {
    currencySymbolHandling,
    getFormattedMessage,
    placeholderText,
} from "../../shared/sharedMethod";
import { topSellingProduct } from "../../store/action/topSellingProductAction";
import { fetchTopCustomers } from "../../store/action/topCustomersAction";
import TopCustomersChart from "./TopCustomersChart";
import { Tokens } from "../../constants";
import EmptyComponent from "../empty-component/EmptyComponent";
import "moment/min/locales.min";

const TopSellingProduct = (props) => {
    const {
        topSelling,
        topSellingProduct,
        frontSetting,
        fetchTopCustomers,
        topCustomers,
        allConfigData,
    } = props;
    const [languageCode, setLanguageCode] = useState("enGB");

    const updatedLanguage = localStorage.getItem(Tokens.UPDATED_LANGUAGE);
    const { selectedLanguage } = useSelector((state) => state);
    const messages = updatedLanguage ? updatedLanguage : selectedLanguage;
    useEffect(() => {
        topSellingProduct();
        fetchTopCustomers();
    }, []);

    useEffect(() => {
        if (messages === "en") {
            setLanguageCode("enGB");
        } else if (messages === "sp") {
            setLanguageCode("es");
        } else if (messages === "gr") {
            setLanguageCode("de");
        } else if (messages === "fr") {
            setLanguageCode("fr");
        } else if (messages === "ar") {
            setLanguageCode("ar");
        } else if (messages === "tr") {
            setLanguageCode("tr");
        } else if (messages === "vi") {
            setLanguageCode("vi");
        } else if (messages === "cn") {
            setLanguageCode("zh-cn");
        }
    }, [messages]);

    const goToDetailScreen = (productId) => {
        window.location.href = "/app/products/detail/" + productId;
    };

    const columns = [
        {
            name: getFormattedMessage("dashboard.stockAlert.product.label"),
            selector: (row) => row.name,
        },
        {
            name: getFormattedMessage("dashboard.stockAlert.quantity.label"),
            cell: (row) => (
                <span className="badge bg-light-primary me-2">
                    {row.total_quantity} {row.sale_unit}
                </span>
            ),
        },
        {
            name: getFormattedMessage("dashboard.grantTotal.label"),
            cell: (row) =>
                currencySymbolHandling(
                    allConfigData,
                    frontSetting.value && frontSetting.value.currency_symbol,
                    row.grand_total
                ),
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
                <div className="col-xxl-8 col-12">
                    <Card>
                        <Card.Header className="pb-0 px-10">
                            <h5 className="mb-0">
                                {getFormattedMessage(
                                    "dashboard.TopSellingProducts.title"
                                )}{" "}
                                ({moment().locale(languageCode).format("MMMM")})
                            </h5>
                        </Card.Header>
                        <Card.Body className="pt-7 pb-2">
                            <DataTable
                                columns={columns}
                                data={topSelling || []}
                                noDataComponent={<EmptyComponent />}
                                pagination
                                paginationPerPage={5}
                                paginationRowsPerPageOptions={[5, 10, 25]}
                            />
                        </Card.Body>
                    </Card>
                </div>
                <TopCustomersChart
                    frontSetting={frontSetting}
                    languageCode={languageCode}
                    topCustomers={topCustomers}
                    allConfigData={allConfigData}
                />
            </Row>
        </div>
    );
};

const mapStateToProps = (state) => {
    const { topSelling, topCustomers, allConfigData } = state;
    return { topSelling, topCustomers, allConfigData };
};

export default connect(mapStateToProps, {
    topSellingProduct,
    fetchTopCustomers,
})(TopSellingProduct);
