import React from "react";
import { connect, useDispatch } from "react-redux";
import { FaCamera, FaTag } from "react-icons/fa";
import { FiMinus, FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import {
    currencySymbolHandling,
    decimalValidate,
    getFormattedMessage,
} from "../../../shared/sharedMethod";
import { calculateDiscount, calculateProductCost } from "../../shared/SharedMethod";
import { addToast } from "../../../store/action/toastAction";
import { toastType } from "../../../constants";

const ProductCartList = (props) => {
    const {
        singleProduct,
        onClickUpdateItemInCart,
        onDeleteCartItem,
        frontSetting,
        setUpdateProducts,
        posAllProducts,
        allConfigData,
        isSelected,
        onSelect,
    } = props;
    const dispatch = useDispatch();
    const posProduct = posAllProducts.find(
        (product) => product.id === singleProduct.id
    );
    const totalQty = posAllProducts
        .filter((product) => product.id === singleProduct.id)
        .map((product) => product.attributes.stock.quantity);
    const imageUrl =
        posProduct?.attributes?.images?.imageUrls &&
        posProduct.attributes.images.imageUrls[0];
    const currency = frontSetting.value && frontSetting.value.currency_symbol;
    const money = (value) =>
        currencySymbolHandling(allConfigData, currency, value);

    const unitDiscount =
        Number(singleProduct.net_unit_cost) - calculateDiscount(singleProduct);
    const lineDiscount = unitDiscount * singleProduct.quantity;

    const handleIncrement = () => {
        setUpdateProducts((updateProducts) =>
            updateProducts.map((item) => {
                if (item.id === singleProduct.id) {
                    if (item.quantity >= totalQty[0]) {
                        dispatch(
                            addToast({
                                text: getFormattedMessage(
                                    "pos.product-quantity-error.message"
                                ),
                                type: toastType.ERROR,
                            })
                        );
                        return item;
                    } else {
                        return { ...item, quantity: item.quantity++ + 1 };
                    }
                } else {
                    return item;
                }
            })
        );
    };

    const handleDecrement = () => {
        if (singleProduct.quantity - 1 > 0.0) {
            setUpdateProducts((updateProducts) =>
                updateProducts.map((item) =>
                    item.id === singleProduct.id
                        ? { ...item, quantity: item.quantity-- - 1 }
                        : item
                )
            );
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        const { value } = e.target;
        if (value.match(/\./g)) {
            const [, decimal] = value.split(".");
            if (decimal?.length > 2) {
                return;
            }
        }

        setUpdateProducts((updateProducts) =>
            updateProducts.map((item) => {
                if (item.id === singleProduct.id) {
                    if (totalQty[0] < Number(e.target.value)) {
                        dispatch(
                            addToast({
                                text: getFormattedMessage(
                                    "pos.product-quantity-error.message"
                                ),
                                type: toastType.ERROR,
                            })
                        );
                        return { ...item, quantity: totalQty[0] };
                    } else {
                        return {
                            ...item,
                            quantity: Number(e.target.value),
                        };
                    }
                } else {
                    return item;
                }
            })
        );
    };

    const discountLabel =
        singleProduct.discount_type === 1 || singleProduct.discount_type === "1"
            ? `${Number(singleProduct.discount_value)}% ${getFormattedMessage("pos-touch.off.label")}`
            : getFormattedMessage("pos-touch.discount.label");

    return (
        <div
            className={`xs-row ${isSelected ? "xs-row--selected" : ""}`}
            onClick={onSelect}
        >
            <div className="xs-row__main">
                <span className="xs-row__img">
                    {imageUrl ? <img src={imageUrl} alt="" /> : <FaCamera />}
                </span>
                <div className="xs-row__item">
                    <div className="xs-row__name">{singleProduct.name}</div>
                    <div className="xs-row__sub">
                        <span>{getFormattedMessage("pos-touch.sale.label")}</span>
                        <span className="xs-row__code">{singleProduct.code}</span>
                    </div>
                </div>
                <div className="xs-row__price">
                    {money(singleProduct.net_unit_cost)}
                </div>
                <div className="xs-row__qty">{singleProduct.quantity}</div>
                <div className="xs-row__ext">
                    {money(
                        calculateProductCost(singleProduct) *
                            singleProduct.quantity
                    )}
                </div>
            </div>
            {lineDiscount > 0 && (
                <div className="xs-row__deal">
                    <FaTag className="xs-row__tag" />
                    <span className="xs-row__deal-label">{discountLabel}</span>
                    <span className="xs-row__deal-amount">
                        ({money(lineDiscount)})
                    </span>
                </div>
            )}
            {isSelected && (
                <div
                    className="xs-row__actions"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        className="xs-row__btn"
                        onClick={() => handleDecrement()}
                    >
                        <FiMinus />
                    </button>
                    <input
                        type="number"
                        value={singleProduct.quantity}
                        className="xs-row__qty-input hide-arrow"
                        onKeyPress={(event) => decimalValidate(event)}
                        onChange={(e) => handleChange(e)}
                    />
                    <button
                        type="button"
                        className="xs-row__btn"
                        onClick={() => handleIncrement()}
                    >
                        <FiPlus />
                    </button>
                    <button
                        type="button"
                        className="xs-row__btn xs-row__btn--text"
                        onClick={() => onClickUpdateItemInCart(singleProduct)}
                    >
                        <FiEdit2 />
                        {getFormattedMessage("pos-touch.fn.change-item")}
                    </button>
                    <button
                        type="button"
                        className="xs-row__btn xs-row__btn--text xs-row__btn--danger"
                        onClick={() => onDeleteCartItem(singleProduct.id)}
                    >
                        <FiTrash2 />
                        {getFormattedMessage("pos-touch.void.label")}
                    </button>
                </div>
            )}
        </div>
    );
};

export default connect(null, null)(ProductCartList);
