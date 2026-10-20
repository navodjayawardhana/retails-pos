import React, { useEffect, useState } from "react";
import { Button, Modal } from "react-bootstrap-v5";
import DataTable from "react-data-table-component";
import {
    currencySymbolHandling,
    getFormattedDate,
    getFormattedMessage,
    placeholderText,
} from "../sharedMethod";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencil, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useDispatch } from "react-redux";
import EditPaymentModal from "../../components/sales/EditPaymentModal";
import { deleteSalePayment } from "../../store/action/salePaymentAction";
import { fetchConfig } from "../../store/action/configAction";
import EmptyComponent from "../../components/empty-component/EmptyComponent";

const ShowPayment = (props) => {
    const {
        onShowPaymentClick,
        isShowPaymentModel,
        allSalePayments,
        currencySymbol,
        setIsShowPaymentModel,
        createPaymentItem,
        allConfigData,
    } = props;
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editSaleItem, setEditSaleItem] = useState({});
    const dispatch = useDispatch();

    useEffect(() => {
        fetchConfig();
    }, []);

    const onEditClick = (item) => {
        setIsEditModalOpen(true);
        setEditSaleItem(item);
    };

    const closeModal = () => {
        setIsEditModalOpen(!isEditModalOpen);
        setIsShowPaymentModel(false);
    };

    const onDeletClick = (paymentId) => {
        dispatch(deleteSalePayment(paymentId));
    };

    const paymentTypeLabel = (type) => {
        if (type === 1) return "Cash";
        if (type === 2) return "Cheque";
        if (type === 3) return "Bank Transfer";
        if (type === 4) return "Other";
        return null;
    };

    const columns = [
        {
            name: getFormattedMessage("react-data-table.date.column.label"),
            selector: (row) =>
                getFormattedDate(row?.payment_date, allConfigData && allConfigData),
        },
        {
            name: getFormattedMessage("globally.detail.reference"),
            selector: (row) => (row.reference ? row.reference : "N/A"),
        },
        {
            name: getFormattedMessage("expense.input.amount.label"),
            selector: (row) =>
                currencySymbolHandling(allConfigData, currencySymbol, row.amount),
        },
        {
            name: getFormattedMessage("pos-sale.detail.Paid-bt.title"),
            selector: (row) => paymentTypeLabel(row.payment_type),
        },
        {
            name: getFormattedMessage("react-data-table.action.column.label"),
            cell: (row) => (
                <>
                    <Button
                        type="button"
                        title={placeholderText("globally.edit.tooltip.label")}
                        variant="light"
                        onClick={() => onEditClick(row)}
                        className="text-success btn-sm me-1"
                    >
                        <FontAwesomeIcon icon={faPencil} />
                    </Button>
                    <Button
                        type="button"
                        title={placeholderText("globally.delete.tooltip.label")}
                        variant="light"
                        onClick={() => onDeletClick(row.id)}
                        className="btn-sm text-danger"
                    >
                        <FontAwesomeIcon icon={faTrash} />
                    </Button>
                </>
            ),
        },
    ];

    return (
        <>
            <Modal
                show={isShowPaymentModel}
                onHide={onShowPaymentClick}
                size="lg"
                keyboard={true}
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        {getFormattedMessage("globally.show.payment.label")}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <DataTable
                        columns={columns}
                        data={allSalePayments || []}
                        noDataComponent={<EmptyComponent />}
                        pagination={false}
                    />
                </Modal.Body>
            </Modal>
            <EditPaymentModal
                createPaymentItem={createPaymentItem}
                isEditModalOpen={isEditModalOpen}
                closeModal={closeModal}
                editSaleItem={editSaleItem}
            />
        </>
    );
};

export default ShowPayment;
