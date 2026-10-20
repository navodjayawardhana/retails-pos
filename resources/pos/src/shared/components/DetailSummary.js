import React from "react";
import { FiHash, FiUser, FiHome, FiCalendar } from "react-icons/fi";
import {
    currencySymbolHandling,
    getFormattedDate,
    getFormattedMessage,
} from "../sharedMethod";

// Summary header card shown at the top of transaction detail pages.
const DetailSummary = (props) => {
    const {
        details,
        partyLabel,
        partyName,
        allConfigData,
        frontSetting,
    } = props;
    if (!details) return null;

    const currency = frontSetting && frontSetting.value && frontSetting.value.currency_symbol;
    const date = details.date || details.created_at;

    const items = [
        {
            icon: <FiHash />,
            label: getFormattedMessage("globally.detail.reference"),
            value: details.reference_code,
        },
        partyLabel && {
            icon: <FiUser />,
            label: getFormattedMessage(partyLabel),
            value: partyName,
        },
        {
            icon: <FiHome />,
            label: getFormattedMessage("globally.detail.warehouse"),
            value: details.warehouse && details.warehouse.name,
        },
        date && {
            icon: <FiCalendar />,
            label: getFormattedMessage("react-data-table.date.column.label"),
            value: getFormattedDate(date, allConfigData),
        },
    ].filter(Boolean);

    return (
        <div className="detail-summary">
            <div className="detail-summary__items">
                {items.map((item, index) => (
                    <div className="detail-summary__item" key={index}>
                        <span className="detail-summary__icon">{item.icon}</span>
                        <div>
                            <div className="detail-summary__label">{item.label}</div>
                            <div className="detail-summary__value">{item.value || "—"}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="detail-summary__total">
                <div className="detail-summary__label">
                    {getFormattedMessage("dashboard.grantTotal.label")}
                </div>
                <div className="detail-summary__amount">
                    {currencySymbolHandling(allConfigData, currency, details.grand_total || 0)}
                </div>
            </div>
        </div>
    );
};

export default DetailSummary;
