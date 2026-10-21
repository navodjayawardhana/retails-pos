import React, { useEffect, useRef, useState } from "react";
import { FaRegListAlt } from "react-icons/fa";
import PosCalculator from "./PosCalculator";
import { getFormattedMessage } from "../../../shared/sharedMethod";
import PosRegisterOpenAlertModel from "../../../components/posRegister/PosRegisterOpenAlertModel";
import { openCustomerDisplay } from "../../shared/customerDisplayChannel";
import { useDispatch } from "react-redux";
import { myClockOut } from "../../../store/action/hrm/attendanceActions";

const PosFunctionBar = (props) => {
    const {
        onCancelSale,
        onHelp,
        onReturnItem,
        onChangeItem,
        onAddDiscount,
        onExtendedTransaction,
        onFindItem,
        onAddTenders,
        onCustomerOptions,
        onSuspendTransaction,
        onRegisterDetails,
        onCloseRegister,
        openCalculator,
        setOpenCalculator,
    } = props;
    const dispatch = useDispatch();
    const [showROAlertModel, setShowROAlertModel] = useState(false);
    const [registerMenu, setRegisterMenu] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(
        !!document.fullscreenElement
    );
    const menuRef = useRef(null);

    useEffect(() => {
        const onChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", onChange);
        return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);

    useEffect(() => {
        if (!registerMenu) return;
        const close = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setRegisterMenu(false);
            }
        };
        document.addEventListener("pointerdown", close);
        return () => document.removeEventListener("pointerdown", close);
    }, [registerMenu]);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    };

    // fKey: handled by the listener below. Alt+R / Alt+S are already handled
    // in usePosCartActions, so those tiles only display their hint.
    const tiles = [
        { key: "cancel-sale", onClick: onCancelSale, hint: "Alt+R" },
        { key: "help", onClick: onHelp, fKey: "F1" },
        { key: "return-item", onClick: onReturnItem, fKey: "F10" },
        { key: "change-item", onClick: onChangeItem, menu: true, fKey: "F6" },
        { key: "add-discount", onClick: onAddDiscount, menu: true, fKey: "F4" },
        {
            key: "extended-transaction",
            onClick: onExtendedTransaction,
            menu: true,
            fKey: "F8",
        },
        {
            key: "register-options",
            onClick: () => setRegisterMenu((open) => !open),
            menu: true,
            fKey: "F9",
        },
        { key: "find-item", onClick: onFindItem, menu: true, fKey: "F2" },
        { key: "add-tenders", onClick: onAddTenders, hint: "Alt+S" },
        { key: "customer-options", onClick: onCustomerOptions, menu: true, fKey: "F3" },
        { key: "suspend-transaction", onClick: onSuspendTransaction, fKey: "F7" },
    ];

    const tilesRef = useRef(tiles);
    tilesRef.current = tiles;

    useEffect(() => {
        const onKeyDown = (event) => {
            const tile = tilesRef.current.find((t) => t.fKey === event.key);
            if (!tile) return;
            event.preventDefault();
            // don't fire screen functions underneath an open dialog
            if (document.querySelector(".modal.show")) return;
            tile.onClick();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const registerOptions = [
        {
            label: getFormattedMessage("pos-display.open.label"),
            onClick: openCustomerDisplay,
        },
        {
            label: getFormattedMessage("register.details.title"),
            onClick: onRegisterDetails,
        },
        {
            // HRM: clock out the employee linked to this login (toast explains if not linked)
            label: getFormattedMessage("hrm.attendance.clock-out"),
            onClick: () => dispatch(myClockOut("pos")).catch(() => {}),
        },
        {
            label: getFormattedMessage("globally.close-register.title"),
            onClick: onCloseRegister,
        },
        {
            label: getFormattedMessage("pos-touch.calculator.label"),
            onClick: () => setOpenCalculator(!openCalculator),
        },
        {
            label: isFullscreen
                ? getFormattedMessage("pos-touch.exit-full-screen.label")
                : getFormattedMessage("pos-touch.full-screen.label"),
            onClick: toggleFullScreen,
        },
        {
            label: getFormattedMessage("dashboard.title"),
            onClick: () => setShowROAlertModel(true),
        },
    ];

    return (
        <>
            <div className="xs-fnbar">
                {tiles.map((tile) => (
                    <div className="xs-fn-wrap" key={tile.key}
                         ref={tile.key === "register-options" ? menuRef : null}>
                        <button
                            type="button"
                            className="xs-fn"
                            onClick={(e) => {
                                e.stopPropagation();
                                tile.onClick();
                            }}
                        >
                            <span className="xs-fn__label">
                                {getFormattedMessage(`pos-touch.fn.${tile.key}`)}
                            </span>
                            {(tile.fKey || tile.hint) && (
                                <kbd className="xs-fn__key">
                                    {tile.fKey || tile.hint}
                                </kbd>
                            )}
                            {tile.menu && (
                                <FaRegListAlt className="xs-fn__menu" />
                            )}
                        </button>
                        {tile.key === "register-options" && registerMenu && (
                            <div className="xs-fn-menu">
                                {registerOptions.map((option, index) => (
                                    <button
                                        type="button"
                                        key={index}
                                        className="xs-fn-menu__item"
                                        onClick={() => {
                                            setRegisterMenu(false);
                                            option.onClick();
                                        }}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {openCalculator && (
                <PosCalculator
                    opneCalculatorModel={() => setOpenCalculator(false)}
                />
            )}
            <PosRegisterOpenAlertModel
                showROAlertModel={showROAlertModel}
                setShowROAlertModel={setShowROAlertModel}
            />
        </>
    );
};

export default PosFunctionBar;
