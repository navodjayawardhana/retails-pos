import moment from "moment";
import React, { useEffect, useState } from "react";
import Modal from "react-bootstrap/Modal";
import DataTable from "react-data-table-component";
import { useSelector } from "react-redux";
import {
    currencySymbolHandling,
    getFormattedMessage,
    numValidate,
    placeholderText,
} from "../../shared/sharedMethod";
import EmptyComponent from "../empty-component/EmptyComponent";

const PosCloseRegisterDetailsModel = ({
    showCloseDetailsModal,
    handleCloseRegisterDetails,
    setShowCloseDetailsModal,
}) => {
    const { frontSetting, allConfigData, closeRegisterDetails } = useSelector(
        (state) => state
    );
    const currencySymbol =
        frontSetting &&
        frontSetting.value &&
        frontSetting.value.currency_symbol;

    const [formValue, setFormsValue] = useState({
        cash_in_hand_while_closing: 0,
        notes: "",
    });

    useEffect(() => {
        if (closeRegisterDetails) {
            setFormsValue((data) => ({
                ...data,
                cash_in_hand_while_closing: closeRegisterDetails
                    ? closeRegisterDetails?.total_cash_amount?.toFixed(2)
                    : 0,
            }));
        }
    }, [closeRegisterDetails]);

    const onChangeInput = (e) => {
        setFormsValue((data) => ({
            ...data,
            [e.target.name]: e.target.value,
        }));
    };

    const paymentBreakdownColumns = [
        {
            name: getFormattedMessage("select.payment-type.label"),
            selector: (row) => row.label,
        },
        {
            name: getFormattedMessage("expense.input.amount.label"),
            selector: (row) => row.value,
        },
    ];

    const paymentBreakdownRows = [
        {
            label: getFormattedMessage("globally.input.cash-in-hand.label"),
            value: currencySymbolHandling(
                allConfigData,
                currencySymbol,
                closeRegisterDetails?.cash_in_hand
            ),
        },
        {
            label: getFormattedMessage("cash.label"),
            value: currencySymbolHandling(
                allConfigData,
                currencySymbol,
                closeRegisterDetails?.today_sales_cash_payment
            ),
        },
        {
            label: getFormattedMessage("payment-type.filter.cheque.label"),
            value: currencySymbolHandling(
                allConfigData,
                currencySymbol,
                closeRegisterDetails?.today_sales_cheque_payment
            ),
        },
        {
            label: getFormattedMessage(
                "payment-type.filter.bank-transfer.label"
            ),
            value: currencySymbolHandling(
                allConfigData,
                currencySymbol,
                closeRegisterDetails?.today_sales_bank_transfer_payment
            ),
        },
        {
            label: getFormattedMessage("payment-type.filter.other.label"),
            value: currencySymbolHandling(
                allConfigData,
                currencySymbol,
                closeRegisterDetails?.today_sales_other_payment
            ),
        },
    ];

    const summaryColumns = [
        { name: "", selector: (row) => row.label },
        { name: "", selector: (row) => row.value },
    ];

    const summaryRows = [
        {
            label: getFormattedMessage("register.total-sales.label"),
            value: currencySymbolHandling(
                allConfigData,
                currencySymbol,
                closeRegisterDetails?.today_sales_amount
            ),
        },
        {
            label: getFormattedMessage("register.total-refund.title"),
            value: currencySymbolHandling(
                allConfigData,
                currencySymbol,
                closeRegisterDetails?.today_sales_return_amount
            ),
        },
        {
            label: getFormattedMessage("register.total-payment.title"),
            value: currencySymbolHandling(
                allConfigData,
                currencySymbol,
                closeRegisterDetails?.today_sales_payment_amount
            ),
        },
    ];

    return (
        <>
            <Modal
                size="lg"
                aria-labelledby="example-custom-modal-styling-title"
                show={showCloseDetailsModal}
                onHide={() => setShowCloseDetailsModal(false)}
                className="registerModel-content"
            >
                <Modal.Header closeButton>
                    <Modal.Title id="example-modal-sizes-title-lg">
                        {getFormattedMessage("globally.close-register.title")} (
                        {moment(Date()).format("MMMM Do YYYY")})
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-6">
                        <DataTable
                            columns={paymentBreakdownColumns}
                            data={paymentBreakdownRows}
                            noDataComponent={<EmptyComponent />}
                            pagination={false}
                        />
                    </div>

                    <DataTable
                        columns={summaryColumns}
                        data={summaryRows}
                        noDataComponent={<EmptyComponent />}
                        pagination={false}
                        noTableHead
                    />

                    <div className="row mt-5">
                        <div className="col-md-6 mb-3">
                            <label className="form-label">
                                {getFormattedMessage(
                                    "globally.total-cash.label"
                                )}
                                :{" "}
                            </label>
                            <span className="required" />
                            <input
                                type="text"
                                name="cash_in_hand_while_closing"
                                autoComplete="off"
                                className="form-control"
                                value={formValue.cash_in_hand_while_closing}
                                onKeyPress={(e) => numValidate(e)}
                                onChange={(e) => onChangeInput(e)}
                            />
                        </div>
                        <div className="col-md-12 mb-3">
                            <label className="form-label">
                                {getFormattedMessage(
                                    "globally.input.note.label"
                                )}
                                :
                            </label>
                            {/* <span className='required' /> */}
                            <textarea
                                type="text"
                                rows="4"
                                cols="50"
                                name="notes"
                                className="form-control"
                                placeholder={placeholderText(
                                    "globally.input.note.placeholder.label"
                                )}
                                onChange={(e) => onChangeInput(e)}
                                value={formValue.notes}
                            />
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer className="justify-content-end pt-2 pb-3">
                    {/* <button className='btn btn-primary text-white'
                    onClick={printRegisterDetails}
                >{getFormattedMessage("print.title")}</button> */}
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowCloseDetailsModal(false)}
                    >
                        {getFormattedMessage("pos-close-btn.title")}
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => handleCloseRegisterDetails(formValue)}
                    >
                        {getFormattedMessage("globally.close-register.title")}
                    </button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default PosCloseRegisterDetailsModel;
