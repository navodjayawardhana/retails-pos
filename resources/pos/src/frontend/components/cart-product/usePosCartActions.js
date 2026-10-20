import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import moment from "moment";
import { addToast } from "../../../store/action/toastAction";
import { toastType } from "../../../constants";
import { getFormattedMessage } from "../../../shared/sharedMethod";
import { addHoldList } from "../../../store/action/pos/HoldListAction";
import ResetCartConfirmationModal from "./ResetCartConfirmationModal";
import HoldCartConfirmationModal from "./HoldCartConfirmationModal";

const usePosCartActions = (props) => {
    const {
        updateProducts,
        setCashPayment,
        cartItemValue,
        grandTotal,
        subTotal,
        setCartItemValue,
        setUpdateProducts,
        holdListId,
        setHoldListValue,
        selectedCustomerOption,
        selectedOption,
        cashPaymentValue,
        setUpdateHoldList,
    } = props;
    const dispatch = useDispatch();
    const qtyCart = updateProducts.filter((a) => a.quantity === 0);
    const [isReset, setIsReset] = useState(false);
    const [isHold, setIsHold] = useState(false);

    const openPaymentModel = () => {
        if (
            !updateProducts.length > 0 ||
            qtyCart.length > 0 ||
            cartItemValue.tax > 100 ||
            Number(cartItemValue.shipping) > Number(subTotal)
        ) {
            !updateProducts.length > 0 &&
                dispatch(
                    addToast({
                        text: getFormattedMessage(
                            "pos.cash-payment.product-error.message"
                        ),
                        type: toastType.ERROR,
                    })
                );
            qtyCart.length > 0 &&
                dispatch(
                    addToast({
                        text: getFormattedMessage(
                            "pos.cash-payment.quantity-error.message"
                        ),
                        type: toastType.ERROR,
                    })
                );
            updateProducts.length > 0 &&
                cartItemValue.tax > 100 &&
                dispatch(
                    addToast({
                        text: getFormattedMessage(
                            "pos.cash-payment.tax-error.message"
                        ),
                        type: toastType.ERROR,
                    })
                );
            updateProducts.length > 0 &&
                Number(cartItemValue.shipping) > Number(subTotal) &&
                dispatch(
                    addToast({
                        text: getFormattedMessage(
                            "pos.cash-payment.sub-total-amount-error.message"
                        ),
                        type: toastType.ERROR,
                    })
                );
        } else if (updateProducts.length > 0 && !qtyCart.length) {
            setCashPayment(true);
        }
    };

    const resetPaymentModel = () => {
        if (
            updateProducts.length > 0 ||
            qtyCart.length < 0 ||
            cartItemValue.tax > 100 ||
            Number(cartItemValue.discount) > grandTotal ||
            Number(cartItemValue.shipping) > Number(subTotal)
        ) {
            setIsReset(true);
        }
    };

    const holdPaymentModel = () => {
        if (
            updateProducts.length > 0 ||
            qtyCart.length < 0 ||
            cartItemValue.tax > 100 ||
            Number(cartItemValue.discount) > grandTotal ||
            Number(cartItemValue.shipping) > Number(subTotal)
        ) {
            setIsHold(true);
        } else {
            !updateProducts.length > 0 &&
                dispatch(
                    addToast({
                        text: getFormattedMessage(
                            "pos.cash-payment.product-error.message"
                        ),
                        type: toastType.ERROR,
                    })
                );
        }
    };

    const handleKeyPress = (event) => {
        if (event.altKey && event.code === "KeyR") {
            return resetPaymentModel();
        } else if (event.altKey && event.code === "KeyS") {
            return openPaymentModel();
        }
    };

    useEffect(() => {
        window.addEventListener("keydown", handleKeyPress);
        return () => {
            window.removeEventListener("keydown", handleKeyPress);
        };
    }, [handleKeyPress]);

    const onConfirm = () => {
        setUpdateProducts([]);
        setCartItemValue({
            discount: 0,
            tax: 0,
            shipping: 0,
        });
        setIsReset(false);
        setIsHold(false);
    };

    const prepareFormData = () => {
        return {
            reference_code: holdListId.referenceNumber,
            date: moment(new Date()).format("YYYY-MM-DD"),
            customer_id:
                selectedCustomerOption && selectedCustomerOption[0]
                    ? selectedCustomerOption[0].value
                    : selectedCustomerOption && selectedCustomerOption.value,
            warehouse_id:
                selectedOption && selectedOption[0]
                    ? selectedOption[0].value
                    : selectedOption && selectedOption.value,
            hold_items: updateProducts ? updateProducts : [],
            tax_rate: cartItemValue.tax ? cartItemValue.tax : 0,
            discount: cartItemValue.discount ? cartItemValue.discount : 0,
            shipping: cartItemValue.shipping ? cartItemValue.shipping : 0,
            grandTotal: grandTotal,
            subTotal: subTotal,
            note: cashPaymentValue.notes,
            discount_applied: cartItemValue.discount_applied,
        };
    };

    const onConfirmHoldList = () => {
        if (!holdListId.referenceNumber) {
            dispatch(
                addToast({
                    text: getFormattedMessage("hold-list.reference-code.error"),
                    type: toastType.ERROR,
                })
            );
        } else {
            dispatch(addHoldList(prepareFormData()));
            setIsHold(false);
            setUpdateProducts([]);
            setCartItemValue({
                discount: 0,
                tax: 0,
                shipping: 0,
            });
            setUpdateHoldList(true);
        }
    };

    const onCancel = () => {
        setIsReset(false);
        setIsHold(false);
    };

    const onChangeInput = (e) => {
        e.preventDefault();
        setHoldListValue((inputs) => ({
            ...inputs,
            referenceNumber: e.target.value,
        }));
    };

    const confirmationModals = (
        <>
            {isReset && (
                <ResetCartConfirmationModal
                    onConfirm={onConfirm}
                    onCancel={onCancel}
                    itemName={getFormattedMessage("globally.detail.product")}
                />
            )}
            {isHold && (
                <HoldCartConfirmationModal
                    onChangeInput={onChangeInput}
                    onConfirm={onConfirmHoldList}
                    onCancel={onCancel}
                    itemName={getFormattedMessage("globally.detail.product")}
                />
            )}
        </>
    );

    return {
        openPaymentModel,
        resetPaymentModel,
        holdPaymentModel,
        confirmationModals,
    };
};

export default usePosCartActions;
