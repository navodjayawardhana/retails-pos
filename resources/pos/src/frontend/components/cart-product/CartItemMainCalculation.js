import React from "react";
import {
    currencySymbolHandling,
    decimalValidate,
    getFormattedMessage,
    numValidate,
    placeholderText,
} from "../../../shared/sharedMethod";

const CartItemMainCalculation = (props) => {
    const {
        totalQty,
        subTotal,
        cartItemValue,
        onChangeCart,
        grandTotal,
        frontSetting,
        allConfigData,
        onChangeTaxCart,
    } = props;
    const currency = frontSetting.value && frontSetting.value.currency_symbol;

    return (
        <div className="xs-offers">
            <label className="xs-field">
                <span className="xs-field__label">
                    {getFormattedMessage("purchase.order-item.table.discount.column.label")}
                </span>
                <span className="xs-field__control">
                    <input
                        type="text"
                        id="discount"
                        name="discount"
                        inputMode="decimal"
                        onChange={(e) => onChangeCart(e)}
                        onKeyPress={(event) => decimalValidate(event)}
                        value={cartItemValue.discount === 0 ? "" : cartItemValue.discount}
                        placeholder={placeholderText("purchase.order-item.table.discount.column.label")}
                    />
                    <span className="xs-field__suffix">{currency}</span>
                </span>
            </label>
            <label className="xs-field">
                <span className="xs-field__label">
                    {getFormattedMessage("globally.detail.tax")}
                </span>
                <span className="xs-field__control">
                    <input
                        type="text"
                        id="tax"
                        name="tax"
                        inputMode="decimal"
                        onChange={(e) => onChangeTaxCart(e)}
                        onKeyPress={(event) => numValidate(event)}
                        value={cartItemValue.tax === 0 ? "" : cartItemValue.tax}
                        placeholder={placeholderText("globally.detail.tax")}
                    />
                    <span className="xs-field__suffix">%</span>
                </span>
            </label>
            <label className="xs-field">
                <span className="xs-field__label">
                    {getFormattedMessage("purchase.input.shipping.label")}
                </span>
                <span className="xs-field__control">
                    <input
                        type="text"
                        id="shipping"
                        name="shipping"
                        inputMode="decimal"
                        onChange={(e) => onChangeCart(e)}
                        onKeyPress={(event) => decimalValidate(event)}
                        value={cartItemValue.shipping === 0 ? "" : cartItemValue.shipping}
                        placeholder={placeholderText("purchase.input.shipping.label")}
                    />
                    <span className="xs-field__suffix">{currency}</span>
                </span>
            </label>
            <div className="xs-offers__summary">
                <div>
                    <span>{getFormattedMessage("pos-total-qty.title")}</span>
                    <strong>{totalQty ? totalQty : "0"}</strong>
                </div>
                <div>
                    <span>{getFormattedMessage("pos.subtotal.small.title")}</span>
                    <strong>{currencySymbolHandling(allConfigData, currency, subTotal ? subTotal : "0.00")}</strong>
                </div>
                <div>
                    <span>{getFormattedMessage("pos-total.title")}</span>
                    <strong>{currencySymbolHandling(allConfigData, currency, grandTotal ? grandTotal : "0.00")}</strong>
                </div>
            </div>
        </div>
    );
};
export default CartItemMainCalculation;
