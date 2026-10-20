import React, { useEffect } from "react";
import { connect } from "react-redux";
import Modal from "react-bootstrap/Modal";
import { fetchFrontSetting } from "../../store/action/frontSettingAction";
import DataTable from "react-data-table-component";
import { fetchTransferDetails } from "../../store/action/transferDetailsAction";
import {
    currencySymbolHandling,
    getFormattedDate,
    getFormattedMessage,
} from "../../shared/sharedMethod";
import EmptyComponent from "../empty-component/EmptyComponent";

const TransferDetails = (props) => {
    const {
        onDetails,
        lgShow,
        setLgShow,
        fetchFrontSetting,
        frontSetting,
        transferDetails,
        fetchTransferDetails,
        allConfigData,
    } = props;

    useEffect(() => {
        fetchFrontSetting();
    }, []);

    const currencySymbol =
        frontSetting &&
        frontSetting.value &&
        frontSetting.value.currency_symbol;

    useEffect(() => {
        if (onDetails !== null) {
            fetchTransferDetails(onDetails);
        }
    }, [onDetails]);

    const onsetLgShow = () => {
        setLgShow(false);
    };

    return (
        <div>
            <Modal
                className="tranfer_model"
                size="lg"
                aria-labelledby="example-custom-modal-styling-title"
                show={lgShow}
                onHide={() => onsetLgShow()}
            >
                <Modal.Header closeButton>
                    <Modal.Title id="example-modal-sizes-title-lg">
                        {getFormattedMessage("transfer.details.title")}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <DataTable
                        columns={[
                            {
                                name: getFormattedMessage(
                                    "react-data-table.date.column.label"
                                ),
                                selector: (row) =>
                                    getFormattedDate(row.date, allConfigData),
                            },
                            {
                                name: getFormattedMessage(
                                    "globally.detail.reference"
                                ),
                                selector: (row) => row.reference_code,
                            },
                            {
                                name: getFormattedMessage(
                                    "transfer.from-warehouse.title"
                                ),
                                selector: (row) => row.from_warehouse?.name,
                            },
                            {
                                name: getFormattedMessage(
                                    "transfer.to-warehouse.title"
                                ),
                                selector: (row) => row.to_warehouse?.name,
                            },
                            {
                                name: getFormattedMessage(
                                    "globally.detail.grand.total"
                                ),
                                cell: (row) =>
                                    currencySymbolHandling(
                                        allConfigData,
                                        currencySymbol,
                                        row.grand_total
                                    ),
                            },
                            {
                                name: getFormattedMessage(
                                    "globally.detail.status"
                                ),
                                selector: (row) =>
                                    (row.status === 1 && "Completed") ||
                                    (row.status === 2 && "Sent") ||
                                    (row.status === 3 && "Pending"),
                            },
                        ]}
                        data={
                            transferDetails && transferDetails.attributes
                                ? [transferDetails.attributes]
                                : []
                        }
                        noDataComponent={<EmptyComponent />}
                        pagination={false}
                    />

                    <DataTable
                        columns={[
                            {
                                name: getFormattedMessage("pos-product.title"),
                                selector: (row) => row.product.name,
                            },
                            {
                                name: getFormattedMessage(
                                    "product.product-details.code-product.label"
                                ),
                                selector: (row) => row.product.code,
                            },
                            {
                                name: getFormattedMessage(
                                    "dashboard.stockAlert.quantity.label"
                                ),
                                selector: (row) => row.quantity,
                            },
                            {
                                name: getFormattedMessage("pos-sub-total.title"),
                                cell: (row) =>
                                    currencySymbolHandling(
                                        allConfigData,
                                        currencySymbol,
                                        row.sub_total
                                    ),
                            },
                        ]}
                        data={
                            transferDetails &&
                            transferDetails.attributes &&
                            transferDetails.attributes.transfer_items
                                ? transferDetails.attributes.transfer_items
                                : []
                        }
                        noDataComponent={<EmptyComponent />}
                        pagination={false}
                    />
                </Modal.Body>
            </Modal>
        </div>
    );
};

const mapStateToProps = (state) => {
    const { transferDetails, isLoading, frontSetting, allConfigData } = state;
    return { transferDetails, isLoading, frontSetting, allConfigData };
};

export default connect(mapStateToProps, {
    fetchFrontSetting,
    fetchTransferDetails,
})(TransferDetails);
