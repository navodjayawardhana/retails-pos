import React, { useState } from "react";
import { FiDelete } from "react-icons/fi";
import { getFormattedMessage } from "../../../shared/sharedMethod";

const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "back"];

const PosKeypad = (props) => {
    const { onEnterItem, onSetQty } = props;
    const [value, setValue] = useState("");

    const press = (key) => {
        if (key === "back") {
            setValue((v) => v.slice(0, -1));
        } else if (key === "." && value.includes(".")) {
            return;
        } else {
            setValue((v) => (v + key).slice(0, 30));
        }
    };

    const submit = (handler) => {
        if (value.trim() === "") return;
        handler(value.trim());
        setValue("");
    };

    return (
        <div className="xs-keypad">
            <div className="xs-keypad__display">{value || "0"}</div>
            <div className="xs-keypad__grid">
                {KEYS.map((key) => (
                    <button
                        type="button"
                        key={key}
                        className="xs-keypad__key"
                        onClick={() => press(key)}
                    >
                        {key === "back" ? <FiDelete /> : key}
                    </button>
                ))}
                <button
                    type="button"
                    className="xs-keypad__key xs-keypad__key--muted"
                    onClick={() => setValue("")}
                >
                    {getFormattedMessage("pos-touch.keypad.clear")}
                </button>
                <button
                    type="button"
                    className="xs-keypad__key xs-keypad__key--muted"
                    onClick={() => submit(onSetQty)}
                >
                    {getFormattedMessage("pos-touch.keypad.qty")}
                </button>
                <button
                    type="button"
                    className="xs-keypad__key xs-keypad__key--primary"
                    onClick={() => submit(onEnterItem)}
                >
                    {getFormattedMessage("pos-touch.keypad.enter")}
                </button>
            </div>
        </div>
    );
};

export default PosKeypad;
