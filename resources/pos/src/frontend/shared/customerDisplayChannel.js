export const CUSTOMER_DISPLAY_CHANNEL = "pos-customer-display";
export const CUSTOMER_DISPLAY_WINDOW = "posCustomerDisplay";

export const DisplayMessage = {
    STATE: "state",
    PAID: "paid",
    HELLO: "hello",
    PHONE: "phone",
    CUSTOMER_RESULT: "customer-result",
};

export const createDisplayChannel = () =>
    typeof window !== "undefined" && "BroadcastChannel" in window
        ? new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL)
        : null;

// Compare on the last 9 digits so 0771234567, 771234567, 94771234567 and
// +94 77 123 4567 are treated as the same Sri Lankan number.
export const phoneKey = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length >= 9 ? digits.slice(-9) : "";
};

export const findCustomerByPhone = (customers, phone, excludeId) => {
    const key = phoneKey(phone);
    if (!key || !Array.isArray(customers)) return null;
    return (
        customers.find(
            (customer) =>
                Number(customer.id) !== Number(excludeId) &&
                phoneKey(customer.attributes && customer.attributes.phone) === key
        ) || null
    );
};

// Open synchronously (keeps the click's user activation so the popup isn't
// blocked), then try to move it onto a secondary monitor.
export const openCustomerDisplay = () => {
    const win = window.open(
        "/pos-display",
        CUSTOMER_DISPLAY_WINDOW,
        "popup,width=1280,height=800"
    );
    if (!win) return null;
    win.focus();
    if (window.getScreenDetails) {
        window
            .getScreenDetails()
            .then((details) => {
                const secondary = details.screens.find((screen) => !screen.isPrimary);
                if (secondary) {
                    win.moveTo(secondary.availLeft, secondary.availTop);
                    win.resizeTo(secondary.availWidth, secondary.availHeight);
                }
            })
            .catch(() => {
                // permission denied or unsupported: leave the popup where it is
            });
    }
    return win;
};
