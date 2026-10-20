import React, { useEffect, useRef, useState } from "react";
import { FormattedMessage } from "react-intl";
import { FiDelete, FiCheckCircle, FiAlertCircle, FiUser } from "react-icons/fi";
import moment from "moment";
import TabTitle from "../../../shared/tab-title/TabTitle";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import {
    createDisplayChannel,
    DisplayMessage,
} from "../../shared/customerDisplayChannel";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];
const MAX_DIGITS = 12;
const THANK_YOU_MS = 8000;

const formatPhone = (digits) => {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
};

const CustomerDisplay = () => {
    const placeholder = placeholderText("pos-display.phone.placeholder");
    const pageTitle = placeholderText("pos-display.title");
    const [state, setState] = useState(null);
    const [paid, setPaid] = useState(null);
    const [digits, setDigits] = useState("");
    // idle | looking | found | notFound
    const [lookup, setLookup] = useState("idle");
    const [foundName, setFoundName] = useState("");
    const [now, setNow] = useState(moment());
    const channelRef = useRef(null);
    const listRef = useRef(null);
    const paidTimer = useRef(null);
    const itemCountRef = useRef(0);

    useEffect(() => {
        const channel = createDisplayChannel();
        if (!channel) return undefined;
        channelRef.current = channel;
        channel.onmessage = ({ data }) => {
            if (!data) return;
            if (data.type === DisplayMessage.STATE) {
                setState(data.payload);
            } else if (data.type === DisplayMessage.PAID) {
                setPaid(data.payload);
                clearTimeout(paidTimer.current);
                paidTimer.current = setTimeout(() => setPaid(null), THANK_YOU_MS);
            } else if (data.type === DisplayMessage.CUSTOMER_RESULT) {
                if (data.payload && data.payload.found) {
                    setFoundName(data.payload.name);
                    setLookup("found");
                } else {
                    setLookup("notFound");
                }
            }
        };
        channel.postMessage({ type: DisplayMessage.HELLO });
        return () => {
            clearTimeout(paidTimer.current);
            channel.close();
        };
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setNow(moment()), 1000);
        return () => clearInterval(timer);
    }, []);

    const items = (state && state.items) || [];
    const totals = (state && state.totals) || {};
    const company = (state && state.company) || {};
    const cartCustomer = state && state.customer;
    const isEmpty = items.length === 0;

    // next sale started, or the sale finished / was cancelled on the POS
    useEffect(() => {
        const previous = itemCountRef.current;
        if (items.length > previous && paid) {
            clearTimeout(paidTimer.current);
            setPaid(null);
        }
        if (previous > 0 && items.length === 0) {
            setDigits("");
            setLookup("idle");
            setFoundName("");
        }
        itemCountRef.current = items.length;
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [items.length]);

    // mirror the cashier's customer selection (phone match or manual pick)
    useEffect(() => {
        if (cartCustomer && cartCustomer.name) {
            setFoundName(cartCustomer.name);
            setLookup("found");
        } else {
            setFoundName("");
            setDigits("");
            setLookup((current) => (current === "found" ? "idle" : current));
        }
    }, [cartCustomer && cartCustomer.name]);

    const pressKey = (key) => {
        if (lookup === "looking") return;
        if (lookup === "notFound") setLookup("idle");
        if (key === "clear") {
            setDigits("");
        } else if (key === "back") {
            setDigits((value) => value.slice(0, -1));
        } else if (digits.length < MAX_DIGITS) {
            setDigits((value) => value + key);
        }
    };

    const submitPhone = () => {
        if (digits.length < 9 || !channelRef.current) return;
        setLookup("looking");
        channelRef.current.postMessage({
            type: DisplayMessage.PHONE,
            payload: digits,
        });
    };

    const tryAgain = () => {
        setDigits("");
        setLookup("idle");
    };

    const renderPhonePanel = () => {
        if (lookup === "found") {
            return (
                <div className="xs-cd-phone__result xs-cd-phone__result--found">
                    <FiCheckCircle />
                    <div className="xs-cd-phone__result-title">
                        <FormattedMessage
                            id="pos-display.welcome-back"
                            values={{ name: foundName }}
                        />
                    </div>
                </div>
            );
        }
        if (lookup === "notFound") {
            return (
                <div className="xs-cd-phone__result xs-cd-phone__result--missing">
                    <FiAlertCircle />
                    <div className="xs-cd-phone__result-title">
                        {getFormattedMessage("pos-display.not-registered")}
                    </div>
                    <button type="button" className="xs-cd-btn" onClick={tryAgain}>
                        {getFormattedMessage("pos-display.try-again")}
                    </button>
                </div>
            );
        }
        return (
            <>
                <div className="xs-cd-phone__title">
                    {getFormattedMessage("pos-display.phone.title")}
                </div>
                <div className={`xs-cd-phone__value ${digits ? "" : "xs-cd-phone__value--empty"}`}>
                    {digits ? formatPhone(digits) : placeholder}
                </div>
                <div className="xs-cd-keypad">
                    {KEYS.map((key) => (
                        <button
                            type="button"
                            key={key}
                            className={`xs-cd-key ${key === "clear" || key === "back" ? "xs-cd-key--fn" : ""}`}
                            onClick={() => pressKey(key)}
                        >
                            {key === "back" ? (
                                <FiDelete />
                            ) : key === "clear" ? (
                                getFormattedMessage("pos-display.clear")
                            ) : (
                                key
                            )}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    className="xs-cd-btn xs-cd-btn--submit"
                    disabled={digits.length < 9 || lookup === "looking"}
                    onClick={submitPhone}
                >
                    {lookup === "looking"
                        ? getFormattedMessage("pos-display.looking-up")
                        : getFormattedMessage("pos-display.submit")}
                </button>
            </>
        );
    };

    if (paid) {
        return (
            <div className="xs-cd xs-cd--thanks">
                <TabTitle title={pageTitle} />
                <FiCheckCircle className="xs-cd-thanks__icon" />
                <div className="xs-cd-thanks__title">
                    {getFormattedMessage("pos-display.thank-you")}
                </div>
                <div className="xs-cd-thanks__rows">
                    <div>
                        <span>{getFormattedMessage("pos-display.total-paid")}</span>
                        <strong>{paid.grandTotal}</strong>
                    </div>
                    <div>
                        <span>{getFormattedMessage("pos-display.received")}</span>
                        <strong>{paid.received}</strong>
                    </div>
                    <div>
                        <span>{getFormattedMessage("pos-display.change")}</span>
                        <strong>{paid.change}</strong>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="xs-cd">
            <TabTitle title={pageTitle} />
            <header className="xs-cd-top">
                <div className="xs-cd-top__brand">
                    {company.logo && <img src={company.logo} alt="" />}
                    <span>{company.name}</span>
                </div>
                <div className="xs-cd-top__clock">
                    <span>{now.format("DD MMM YYYY")}</span>
                    <strong>{now.format("hh:mm:ss A")}</strong>
                </div>
            </header>
            <main className="xs-cd-main">
                <section className="xs-cd-sale">
                    {isEmpty ? (
                        <div className="xs-cd-idle">
                            {company.logo && (
                                <img className="xs-cd-idle__logo" src={company.logo} alt="" />
                            )}
                            <div className="xs-cd-idle__title">
                                <FormattedMessage
                                    id="pos-display.welcome"
                                    values={{ company: company.name || "" }}
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            {cartCustomer && (
                                <div className="xs-cd-customer">
                                    <FiUser /> {cartCustomer.name}
                                </div>
                            )}
                            <div className="xs-cd-items" ref={listRef}>
                                {items.map((item, index) => (
                                    <div className="xs-cd-item" key={`${item.code}-${index}`}>
                                        <div className="xs-cd-item__info">
                                            <div className="xs-cd-item__name">{item.name}</div>
                                            <div className="xs-cd-item__qty">
                                                {item.qty} × {item.unitPrice}
                                            </div>
                                        </div>
                                        <div className="xs-cd-item__total">{item.subTotal}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="xs-cd-totals">
                                <div>
                                    <span>{getFormattedMessage("pos-touch.items.label")}</span>
                                    <span>{totals.items}</span>
                                </div>
                                <div>
                                    <span>{getFormattedMessage("pos-touch.subtotal.label")}</span>
                                    <span>{totals.subtotal}</span>
                                </div>
                                {totals.discountRaw > 0 && (
                                    <div>
                                        <span>{getFormattedMessage("pos-touch.discount.label")}</span>
                                        <span>− {totals.discount}</span>
                                    </div>
                                )}
                                {totals.taxRaw > 0 && (
                                    <div>
                                        <span>{getFormattedMessage("pos-touch.tax.label")}</span>
                                        <span>{totals.tax}</span>
                                    </div>
                                )}
                                {totals.shippingRaw > 0 && (
                                    <div>
                                        <span>{getFormattedMessage("pos-display.shipping")}</span>
                                        <span>{totals.shipping}</span>
                                    </div>
                                )}
                            </div>
                            <div className="xs-cd-grand">
                                <span>{getFormattedMessage("pos-display.total")}</span>
                                <strong>{totals.grandTotal}</strong>
                            </div>
                        </>
                    )}
                </section>
                <aside className="xs-cd-phone">{renderPhonePanel()}</aside>
            </main>
        </div>
    );
};

export default CustomerDisplay;
