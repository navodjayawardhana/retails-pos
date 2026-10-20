import React, { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { FiSearch, FiArrowLeft, FiMinus, FiPlus } from "react-icons/fi";
import apiConfig from "../../../config/apiConfig";
import { apiBaseURL, toastType } from "../../../constants";
import { addToast } from "../../../store/action/toastAction";
import { addSaleReturn } from "../../../store/action/salesReturnAction";
import {
    calculateCartTotalAmount,
    subTotalCount,
} from "../../../shared/calculation/calculation";
import {
    currencySymbolHandling,
    getFormattedMessage,
    placeholderText,
} from "../../../shared/sharedMethod";

// Order-level discount/tax/shipping start at 0 for a return, as in CreateSaleReturn.
const RETURN_TOTALS = { discount: 0, tax_rate: 0, shipping: 0 };

const paymentStatusKey = {
    1: "payment-status.filter.paid.label",
    2: "payment-status.filter.unpaid.label",
    3: "payment-status.filter.partial.label",
};

const PosReturnModal = ({ show, onHide }) => {
    const dispatch = useDispatch();
    const { frontSetting, allConfigData } = useSelector((state) => state);
    const [query, setQuery] = useState("");
    const [sales, setSales] = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    const [sale, setSale] = useState(null);
    const [items, setItems] = useState([]);
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);

    const currency = frontSetting?.value?.currency_symbol;
    const money = (value) =>
        currencySymbolHandling(allConfigData, currency, value || 0);

    const showError = (text) =>
        dispatch(addToast({ text, type: toastType.ERROR }));

    useEffect(() => {
        if (!show) {
            setQuery("");
            setSale(null);
            setItems([]);
            setNote("");
            return;
        }
        const timer = setTimeout(() => loadSales(query), 300);
        return () => clearTimeout(timer);
    }, [show, query]);

    const loadSales = (search) => {
        setLoadingList(true);
        let url =
            apiBaseURL.SALES +
            "?sort=-created_at&page[size]=20&page[number]=1";
        if (search.trim()) {
            url += "&filter[search]=" + encodeURIComponent(search.trim());
        }
        apiConfig
            .get(url)
            .then((response) => setSales(response.data.data || []))
            .catch(({ response }) =>
                showError(response?.data?.message || "Error")
            )
            .finally(() => setLoadingList(false));
    };

    // Builds items exactly like CreateSaleReturn does for the admin return form.
    const selectSale = (row) => {
        apiConfig
            .get(apiBaseURL.SALES + "/" + row.id + "/edit")
            .then((response) => {
                const data = response.data.data;
                setSale(data);
                setNote(data.attributes.note || "");
                setItems(
                    data.attributes.sale_items.map((item) => ({
                        code: item.product && item.product.code,
                        name: item.product && item.product.name,
                        product_unit: item.product.product_unit,
                        product_id: item.product_id,
                        short_name: item.sale_unit && item.sale_unit.short_name,
                        stock_alert: item.product && item.product.stock_alert,
                        product_price: item.product_price,
                        fix_net_unit: item.product_price,
                        net_unit_price: item.product_price,
                        tax_type: item.tax_type,
                        tax_value: item.tax_value,
                        tax_amount: item.tax_amount,
                        discount_type: item.discount_type,
                        discount_value: item.discount_value,
                        discount_amount: item.discount_amount,
                        isEdit: true,
                        stock: "",
                        sold_quantity: item.quantity,
                        sub_total: item.sub_total,
                        sale_unit: item.sale_unit && item.sale_unit.id,
                        quantity: 0,
                        id: item.id,
                        sale_item_id: item.id,
                        newItem: "",
                        isSaleReturn: true,
                    }))
                );
            })
            .catch(({ response }) =>
                showError(response?.data?.message || "Error")
            );
    };

    const setQty = (index, value) => {
        setItems((current) =>
            current.map((item, i) => {
                if (i !== index) return item;
                const qty = Math.max(
                    0,
                    Math.min(Number(item.sold_quantity), Number(value) || 0)
                );
                const next = { ...item, quantity: qty };
                next.sub_total = Number(subTotalCount(next));
                return next;
            })
        );
    };

    const returnItems = items.filter((item) => Number(item.quantity) > 0);
    const returnTotal = calculateCartTotalAmount(returnItems, RETURN_TOTALS);

    // Same payload shape as SaleReturnForm.prepareFormData.
    const onSubmit = async () => {
        if (returnItems.length === 0) {
            showError(getFormattedMessage("pos-touch.return.no-qty.message"));
            return;
        }
        const attrs = sale.attributes;
        const payload = {
            date: moment(attrs.date).toDate(),
            customer_id: attrs.customer_id,
            warehouse_id: attrs.warehouse_id,
            discount: "0.00",
            tax_rate: "0.00",
            tax_amount: "0.00",
            sale_return_items: returnItems,
            shipping: "0.00",
            grand_total: Number(returnTotal),
            received_amount: 0,
            payment_type: 0,
            paid_amount: 0,
            status: attrs.status === 1 ? 1 : 2,
            note: note,
            sale_id: sale.id,
            sale_reference: attrs.reference_code,
        };
        setSaving(true);
        await dispatch(addSaleReturn(payload, () => onHide()));
        setSaving(false);
    };

    return (
        <Modal show={show} onHide={onHide} size="xl" centered className="xs-return-modal">
            <Modal.Header closeButton>
                <Modal.Title>
                    {getFormattedMessage("sale-return.title")}
                    {sale && (
                        <span className="xs-return__ref">
                            {sale.attributes.reference_code}
                        </span>
                    )}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {!sale ? (
                    <div className="xs-return">
                        <div className="xs-return__search">
                            <FiSearch />
                            <input
                                autoFocus
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={placeholderText(
                                    "pos-touch.return.search.placeholder"
                                )}
                            />
                        </div>
                        <div className="xs-return__list">
                            {loadingList && sales.length === 0 && (
                                <div className="xs-return__empty">…</div>
                            )}
                            {!loadingList && sales.length === 0 && (
                                <div className="xs-return__empty">
                                    {getFormattedMessage("sale.product.table.no-data.label")}
                                </div>
                            )}
                            {sales.map((row) => {
                                const attrs = row.attributes;
                                const returned = attrs.is_return === 1;
                                return (
                                    <div className="xs-return__sale" key={row.id}>
                                        <div className="xs-return__sale-main">
                                            <div className="xs-return__sale-ref">
                                                {attrs.reference_code}
                                                {returned && (
                                                    <span className="xs-return__badge">
                                                        {getFormattedMessage("pos-touch.return.returned.label")}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="xs-return__sale-meta">
                                                {moment(attrs.date).format("YYYY-MM-DD")} · {attrs.customer_name} ·{" "}
                                                {attrs.payment_status && paymentStatusKey[attrs.payment_status]
                                                    ? getFormattedMessage(paymentStatusKey[attrs.payment_status])
                                                    : ""}
                                            </div>
                                        </div>
                                        <div className="xs-return__sale-total">
                                            {money(attrs.grand_total)}
                                        </div>
                                        <button
                                            type="button"
                                            className="xs-return__select"
                                            disabled={returned}
                                            onClick={() => selectSale(row)}
                                        >
                                            {getFormattedMessage("pos-touch.return.select.label")}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="xs-return">
                        <div className="xs-return__info">
                            <span>{sale.attributes.customer_name}</span>
                            <span>{sale.attributes.warehouse_name}</span>
                            <span>{moment(sale.attributes.date).format("YYYY-MM-DD")}</span>
                        </div>
                        <div className="xs-return__items">
                            <div className="xs-return__item xs-return__item--head">
                                <span>{getFormattedMessage("pos-product.title")}</span>
                                <span>{getFormattedMessage("pos-touch.return.sold.label")}</span>
                                <span>{getFormattedMessage("pos-touch.unit-price.label")}</span>
                                <span>{getFormattedMessage("pos-touch.return.qty.label")}</span>
                                <span>{getFormattedMessage("pos-sub-total.title")}</span>
                            </div>
                            {items.map((item, index) => (
                                <div className="xs-return__item" key={item.id}>
                                    <span>
                                        <strong>{item.name}</strong>
                                        <small>{item.code}</small>
                                    </span>
                                    <span>
                                        {item.sold_quantity} {item.short_name}
                                    </span>
                                    <span>{money(item.product_price)}</span>
                                    <span className="xs-return__stepper">
                                        <button
                                            type="button"
                                            onClick={() => setQty(index, Number(item.quantity) - 1)}
                                            disabled={Number(item.quantity) <= 0}
                                        >
                                            <FiMinus />
                                        </button>
                                        <input
                                            type="number"
                                            min={0}
                                            max={item.sold_quantity}
                                            value={item.quantity}
                                            onChange={(e) => setQty(index, e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setQty(index, Number(item.quantity) + 1)}
                                            disabled={Number(item.quantity) >= Number(item.sold_quantity)}
                                        >
                                            <FiPlus />
                                        </button>
                                    </span>
                                    <span>
                                        {money(Number(item.quantity) > 0 ? subTotalCount(item) : 0)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <textarea
                            className="xs-return__note"
                            rows={2}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={placeholderText("globally.input.notes.label")}
                        />
                        <div className="xs-return__footer">
                            <button
                                type="button"
                                className="xs-return__back"
                                onClick={() => setSale(null)}
                            >
                                <FiArrowLeft /> {getFormattedMessage("globally.back-btn")}
                            </button>
                            <div className="xs-return__total">
                                {getFormattedMessage("pos-touch.return.total.label")}:{" "}
                                <strong>{money(returnTotal)}</strong>
                            </div>
                            <button
                                type="button"
                                className="xs-return__submit"
                                disabled={saving || returnItems.length === 0}
                                onClick={onSubmit}
                            >
                                {getFormattedMessage("pos-touch.return.submit.label")}
                            </button>
                        </div>
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default PosReturnModal;
