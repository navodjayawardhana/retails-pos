import React, { useEffect, useState } from "react";
import moment from "moment";
import { FaRegKeyboard, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { getFormattedMessage } from "../../../shared/sharedMethod";

const PosStatusBar = (props) => {
    const {
        heldCount,
        onHeldClick,
        cashierName,
        warehouseName,
        onKeyboardClick,
        onWarehouseClick,
        onRegisterClick,
        onHelp,
    } = props;
    const [now, setNow] = useState(new Date());
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);
        window.addEventListener("online", goOnline);
        window.addEventListener("offline", goOffline);
        return () => {
            clearInterval(timer);
            window.removeEventListener("online", goOnline);
            window.removeEventListener("offline", goOffline);
        };
    }, []);

    return (
        <>
            <button type="button" className="xs-notice" onClick={onHeldClick}>
                {heldCount} {getFormattedMessage("pos-touch.held-sales.label")}
            </button>
            <div className="xs-status">
                <button type="button" className="xs-status__cell xs-status__keyboard"
                        onClick={onKeyboardClick}>
                    <FaRegKeyboard />
                </button>
                <div className="xs-status__cell xs-status__mode">
                    {getFormattedMessage("pos-touch.sale.label")}
                </div>
                <div className="xs-status__cell xs-status__user">{cashierName}</div>
                <div className={`xs-status__cell xs-status__ok ${isOnline ? "" : "xs-status__ok--off"}`}>
                    {isOnline
                        ? getFormattedMessage("pos-touch.online.label")
                        : getFormattedMessage("pos-touch.offline.label")}
                    {isOnline ? <FaCheckCircle /> : <FaTimesCircle />}
                </div>
                <button type="button" className="xs-status__cell xs-status__ok xs-status__ok--wide"
                        onClick={onWarehouseClick}>
                    {warehouseName}
                    <FaCheckCircle />
                </button>
                <button type="button" className="xs-status__cell xs-status__ok"
                        onClick={onRegisterClick}>
                    {getFormattedMessage("pos-touch.register.label")}
                    <FaCheckCircle />
                </button>
                <div className="xs-status__cell xs-status__date">
                    {moment(now).format("MM/DD/YYYY")}
                </div>
                <div className="xs-status__cell xs-status__time">
                    {moment(now).format("h:mm A")}
                </div>
                <button type="button" className="xs-status__cell xs-status__help" onClick={onHelp}>
                    <span className="xs-help-pill">? F1</span>
                </button>
            </div>
        </>
    );
};

export default PosStatusBar;
