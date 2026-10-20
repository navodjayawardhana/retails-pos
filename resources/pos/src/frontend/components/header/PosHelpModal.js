import React from "react";
import { Modal } from "react-bootstrap";
import {
    FiShoppingCart,
    FiEdit3,
    FiUser,
    FiPercent,
    FiPauseCircle,
    FiCreditCard,
    FiCornerUpLeft,
    FiSettings,
} from "react-icons/fi";
import { getFormattedMessage } from "../../../shared/sharedMethod";

const sections = [
    { key: "sell", icon: <FiShoppingCart /> },
    { key: "cart", icon: <FiEdit3 /> },
    { key: "customer", icon: <FiUser /> },
    { key: "discount", icon: <FiPercent /> },
    { key: "hold", icon: <FiPauseCircle /> },
    { key: "pay", icon: <FiCreditCard /> },
    { key: "return", icon: <FiCornerUpLeft /> },
    { key: "register", icon: <FiSettings /> },
];

const shortcuts = [
    { keys: "F1", label: "pos-touch.fn.help" },
    { keys: "F2", label: "pos-touch.fn.find-item" },
    { keys: "F3", label: "pos-touch.fn.customer-options" },
    { keys: "F4", label: "pos-touch.fn.add-discount" },
    { keys: "F6", label: "pos-touch.fn.change-item" },
    { keys: "F7", label: "pos-touch.fn.suspend-transaction" },
    { keys: "F8", label: "pos-touch.fn.extended-transaction" },
    { keys: "F9", label: "pos-touch.fn.register-options" },
    { keys: "F10", label: "pos-touch.fn.return-item" },
    { keys: "Alt+S", label: "pos-touch.fn.add-tenders" },
    { keys: "Alt+R", label: "pos-touch.fn.cancel-sale" },
    { keys: "Alt+Q", label: "pos-touch.help.key.scan" },
];

const PosHelpModal = ({ show, onHide }) => (
    <Modal show={show} onHide={onHide} size="lg" centered className="xs-help-modal">
        <Modal.Header closeButton>
            <Modal.Title>{getFormattedMessage("pos-touch.help.title")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <div className="xs-help">
                <div className="xs-help__sections">
                    {sections.map((section) => (
                        <div className="xs-help__item" key={section.key}>
                            <span className="xs-help__icon">{section.icon}</span>
                            <div>
                                <div className="xs-help__item-title">
                                    {getFormattedMessage(`pos-touch.help.${section.key}.title`)}
                                </div>
                                <div className="xs-help__item-text">
                                    {getFormattedMessage(`pos-touch.help.${section.key}.text`)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="xs-help__keys">
                    <div className="xs-help__keys-title">
                        {getFormattedMessage("pos-touch.help.shortcuts.title")}
                    </div>
                    {shortcuts.map((shortcut) => (
                        <div className="xs-help__key-row" key={shortcut.keys}>
                            <kbd>{shortcut.keys}</kbd>
                            <span>{getFormattedMessage(shortcut.label)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </Modal.Body>
    </Modal>
);

export default PosHelpModal;
