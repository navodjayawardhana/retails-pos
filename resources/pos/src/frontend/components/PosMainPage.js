import React, { useState, useEffect, useRef } from "react";
import { connect, useDispatch, useSelector } from "react-redux";
import {
    BsInfoCircleFill,
    BsPersonPlusFill,
    BsGrid3X3GapFill,
    BsUpcScan,
} from "react-icons/bs";
import { FaBarcode, FaListUl, FaChevronRight } from "react-icons/fa";
import moment from "moment";
import { useReactToPrint } from "react-to-print";
import Category from "./Category";
import Brands from "./Brand";
import Product from "./product/Product";
import ProductCartList from "./cart-product/ProductCartList";
import {
    posSearchNameProduct,
    posSearchCodeProduct,
} from "../../store/action/pos/posfetchProductAction";
import ProductSearchbar from "./product/ProductSearchbar";
import { prepareCartArray } from "../shared/PrepareCartArray";
import ProductDetailsModel from "../shared/ProductDetailsModel";
import CartItemMainCalculation from "./cart-product/CartItemMainCalculation";
import CustomerDropDown from "./pos-dropdown/CustomerDropdown";
import WarehouseDropDown from "./pos-dropdown/WarehouseDropDown";
import { posCashPaymentAction } from "../../store/action/pos/posCashPaymentAction";
import usePosCartActions from "./cart-product/usePosCartActions";
import PosFunctionBar from "./header/PosFunctionBar";
import PosHelpModal from "./header/PosHelpModal";
import PosReturnModal from "./returnModal/PosReturnModal";
import PosStatusBar from "./header/PosStatusBar";
import PosKeypad from "./header/PosKeypad";
import CashPaymentModel from "./cart-product/paymentModel/CashPaymentModel";
import PrintData from "./printModal/PrintData";
import PaymentSlipModal from "./paymentSlipModal/PaymentSlipModal";
import { fetchFrontSetting } from "../../store/action/frontSettingAction";
import { fetchSetting } from "../../store/action/settingAction";
import { calculateProductCost } from "../shared/SharedMethod";
import {
    fetchBrandClickable,
    posAllProduct,
} from "../../store/action/pos/posAllProductAction";
import TabTitle from "../../shared/tab-title/TabTitle";
import RegisterDetailsModel from "./register-detailsModal/RegisterDetailsModel";
import PrintRegisterDetailsData from "./printModal/PrintRegisterDetailsData";
import {
    closeRegisterAction,
    fetchTodaySaleOverAllReport,
    getAllRegisterDetailsAction,
} from "../../store/action/pos/posRegisterDetailsAction";
import {
    currencySymbolHandling,
    getFormattedMessage,
    getFormattedOptions,
} from "../../shared/sharedMethod";
import { paymentMethodOptions, toastType, Tokens } from "../../constants";
import TopProgressBar from "../../shared/components/loaders/TopProgressBar";
import CustomerForm from "./customerModel/CustomerForm";
import HoldListModal from "./holdListModal/HoldListModal";
import { fetchHoldLists } from "../../store/action/pos/HoldListAction";
import { useNavigate } from "react-router";
import PosCloseRegisterDetailsModel from "../../components/posRegister/PosCloseRegisterDetailsModel.js";
import { addToast } from "../../store/action/toastAction";
import { fetchAllCustomer } from "../../store/action/customerAction";
import { FormattedMessage } from "react-intl";
import {
    createDisplayChannel,
    DisplayMessage,
    findCustomerByPhone,
    phoneKey,
} from "../shared/customerDisplayChannel";

const PosMainPage = (props) => {
    const {
        onClickFullScreen,
        posAllProducts,
        customCart,
        posCashPaymentAction,
        frontSetting,
        fetchFrontSetting,
        settings,
        fetchSetting,
        paymentDetails,
        allConfigData,
        fetchBrandClickable,
        posAllTodaySaleOverAllReport,
        fetchHoldLists,
        holdListData,
    } = props;
    const componentRef = useRef();
    const registerDetailsRef = useRef();
    // const [play] = useSound('https://s3.amazonaws.com/freecodecamp/drums/Heater-4_1.mp3');
    const [openCalculator, setOpenCalculator] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [updateProducts, setUpdateProducts] = useState([]);
    const [isOpenCartItemUpdateModel, setIsOpenCartItemUpdateModel] =
        useState(false);
    const [product, setProduct] = useState(null);
    const [cartProductIds, setCartProductIds] = useState([]);
    const [newCost, setNewCost] = useState("");
    const [paymentPrint, setPaymentPrint] = useState({});
    const [cashPayment, setCashPayment] = useState(false);
    const [modalShowPaymentSlip, setModalShowPaymentSlip] = useState(false);
    const [modalShowCustomer, setModalShowCustomer] = useState(false);
    const [productMsg, setProductMsg] = useState(0);
    const [brandId, setBrandId] = useState();
    const [categoryId, setCategoryId] = useState();
    const [selectedCustomerOption, setSelectedCustomerOption] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const [updateHolList, setUpdateHoldList] = useState(false);
    const [hold_ref_no, setHold_ref_no] = useState("");
    const [cartItemValue, setCartItemValue] = useState({
        discount: 0,
        tax: 0,
        shipping: 0,
    });
    const [cashPaymentValue, setCashPaymentValue] = useState({
        notes: "",
        payment_status: {
            label: getFormattedMessage("dashboard.recentSales.paid.label"),
            value: 1,
        },
    });
    const [errors, setErrors] = useState({ notes: "" });
    // const [searchString, setSearchString] = useState('');
    const [changeReturn, setChangeReturn] = useState(0);
    const [showCloseDetailsModal, setShowCloseDetailsModal] = useState(false);
    const { closeRegisterDetails } = useSelector((state) => state);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    //total Qty on cart item
    const localCart = updateProducts.map((updateQty) =>
        Number(updateQty.quantity)
    );
    const totalQty =
        localCart.length > 0 &&
        localCart.reduce((cart, current) => {
            return cart + current;
        });

    //subtotal on cart item
    const localTotal = updateProducts.map(
        (updateQty) =>
            calculateProductCost(updateQty).toFixed(2) * updateQty.quantity
    );
    const subTotal =
        localTotal.length > 0 &&
        localTotal.reduce((cart, current) => {
            return cart + current;
        });

    const [holdListId, setHoldListValue] = useState({
        referenceNumber: "",
    });

    //grand total on cart item
    const discountTotal = subTotal - cartItemValue.discount;
    const taxTotal = (discountTotal * cartItemValue.tax) / 100;
    const mainTotal = discountTotal + taxTotal;
    const grandTotal = (
        Number(mainTotal) + Number(cartItemValue.shipping)
    ).toFixed(2);

    useEffect(() => {
        setPaymentPrint({
            ...paymentPrint,
            barcode_url:
                paymentDetails.attributes &&
                paymentDetails.attributes.barcode_url,
            reference_code:
                paymentDetails.attributes &&
                paymentDetails.attributes.reference_code,
        });
    }, [paymentDetails]);

    useEffect(() => {
        setSelectedCustomerOption(
            settings.attributes && {
                value: Number(settings.attributes.default_customer),
                label: settings.attributes.customer_name,
            }
        );
        setSelectedOption(
            settings.attributes && {
                value: Number(settings.attributes.default_warehouse),
                label: settings.attributes.warehouse_name,
            }
        );
    }, [settings]);

    useEffect(() => {
        fetchSetting();
        fetchFrontSetting();
        fetchTodaySaleOverAllReport();
        fetchHoldLists();
    }, []);

    useEffect(() => {
        if (updateHolList === true) {
            fetchHoldLists();
            setUpdateHoldList(false);
        }
    }, [updateHolList]);

    useEffect(() => {
        setUpdateProducts(updateProducts);
    }, [quantity, grandTotal]);

    const handleValidation = () => {
        let errors = {};
        let isValid = false;
        if (
            cashPaymentValue["notes"] &&
            cashPaymentValue["notes"].length > 100
        ) {
            errors["notes"] =
                "The notes must not be greater than 100 characters";
        } else {
            isValid = true;
        }
        setErrors(errors);
        return isValid;
    };

    //filter on category id
    const setCategory = (item) => {
        setCategoryId(item);
    };

    useEffect(() => {
        if (selectedOption) {
            fetchBrandClickable(
                brandId,
                categoryId,
                selectedOption.value && selectedOption.value
            );
        }
    }, [selectedOption, brandId, categoryId]);

    //filter on brand id
    const setBrand = (item) => {
        setBrandId(item);
    };

    const onChangeInput = (e) => {
        e.preventDefault();
        setCashPaymentValue((inputs) => ({
            ...inputs,
            [e.target.name]: e.target.value,
        }));
    };

    const onPaymentStatusChange = (obj) => {
        setCashPaymentValue((inputs) => ({ ...inputs, payment_status: obj }));
    };

    const onChangeReturnChange = (change) => {
        setChangeReturn(change);
    };

    // payment type dropdown functionality
    const paymentTypeFilterOptions = getFormattedOptions(paymentMethodOptions);
    const paymentTypeDefaultValue = paymentTypeFilterOptions.map((option) => {
        return {
            value: option.id,
            label: option.name,
        };
    });
    const [paymentValue, setPaymentValue] = useState({
        payment_type: paymentTypeDefaultValue[0],
    });

    const onPaymentTypeChange = (obj) => {
        setPaymentValue({ ...paymentValue, payment_type: obj });
    };

    const onChangeCart = (event) => {
        const { value } = event.target;
        // check if value includes a decimal point
        if (value.match(/\./g)) {
            const [, decimal] = value.split(".");
            // restrict value to only 2 decimal places
            if (decimal?.length > 2) {
                // do nothing
                return;
            }
        }
        setCartItemValue((inputs) => ({
            ...inputs,
            [event.target.name]: value,
        }));
    };

    const onChangeTaxCart = (event) => {
        const min = 0;
        const max = 100;
        const { value } = event.target;
        const values = Math.max(min, Math.min(max, Number(value)));
        // check if value includes a decimal point
        if (value.match(/\./g)) {
            const [, decimal] = value.split(".");
            // restrict value to only 2 decimal places
            if (decimal?.length > 2) {
                // do nothing
                return;
            }
        }
        setCartItemValue((inputs) => ({
            ...inputs,
            [event.target.name]: values,
        }));
    };

    //payment slip model onchange
    const handleCashPayment = () => {
        setCashPaymentValue({
            notes: "",
            payment_status: {
                label: getFormattedMessage("dashboard.recentSales.paid.label"),
                value: 1,
            },
        });
        setCashPayment(!cashPayment);
    };

    const updateCost = (item) => {
        setNewCost(item);
    };

    //product details model onChange
    const openProductDetailModal = () => {
        setIsOpenCartItemUpdateModel(!isOpenCartItemUpdateModel);
    };

    //product details model updated value
    const onClickUpdateItemInCart = (item) => {
        setProduct(item);
        setIsOpenCartItemUpdateModel(true);
    };

    const onProductUpdateInCart = () => {
        const localCart = updateProducts.slice();
        updateCart(localCart);
    };

    //updated Qty function
    const updatedQty = (qty) => {
        setQuantity(qty);
    };

    const updateCart = (cartProducts) => {
        setUpdateProducts(cartProducts);
    };

    //cart item delete
    const onDeleteCartItem = (productId) => {
        const existingCart = updateProducts.filter((e) => e.id !== productId);
        updateCart(existingCart);
    };

    //product add to cart function
    const addToCarts = (items) => {
        updateCart(items);
    };

    // create customer model
    const customerModel = (val) => {
        setModalShowCustomer(val);
    };

    //prepare data for print Model
    const preparePrintData = () => {
        const formValue = {
            products: updateProducts,
            discount: cartItemValue.discount ? cartItemValue.discount : 0,
            tax: cartItemValue.tax ? cartItemValue.tax : 0,
            cartItemPrint: cartItemValue,
            taxTotal: taxTotal,
            grandTotal: grandTotal,
            shipping: cartItemValue.shipping,
            subTotal: subTotal,
            frontSetting: frontSetting,
            customer_name: selectedCustomerOption,
            settings: settings,
            note: cashPaymentValue.notes,
            changeReturn,
            payment_status: cashPaymentValue.payment_status,
        };
        return formValue;
    };

    //prepare data for payment api
    const prepareData = (updateProducts) => {
        const formValue = {
            date: moment(new Date()).format("YYYY-MM-DD"),
            customer_id:
                selectedCustomerOption && selectedCustomerOption[0]
                    ? selectedCustomerOption[0].value
                    : selectedCustomerOption && selectedCustomerOption.value,
            warehouse_id:
                selectedOption && selectedOption[0]
                    ? selectedOption[0].value
                    : selectedOption && selectedOption.value,
            sale_items: updateProducts,
            grand_total: grandTotal,
            payment_status: 1,
            payment_type: paymentValue?.payment_type?.value,
            discount: cartItemValue.discount,
            shipping: cartItemValue.shipping,
            tax_rate: cartItemValue.tax,
            note: cashPaymentValue.notes,
            status: 1,
            hold_ref_no: hold_ref_no,
            payment_status: cashPaymentValue?.payment_status?.value,
        };
        return formValue;
    };

    //cash payment method
    const onCashPayment = (event) => {
        event.preventDefault();
        const valid = handleValidation();
        if (valid) {
            const received =
                cashPaymentValue.received_amount !== undefined &&
                cashPaymentValue.received_amount !== ""
                    ? Number(cashPaymentValue.received_amount)
                    : Number(grandTotal);
            pendingPaidRef.current = {
                grandTotal: money(grandTotal),
                received: money(received.toFixed(2)),
                change: money(Math.max(Number(changeReturn) || 0, 0).toFixed(2)),
            };
            posCashPaymentAction(
                prepareData(updateProducts),
                setUpdateProducts,
                setModalShowPaymentSlip,
                posAllProduct,
                {
                    brandId,
                    categoryId,
                    selectedOption,
                }
            );
            // setModalShowPaymentSlip(true);
            setCashPayment(false);
            setPaymentPrint(preparePrintData);
            setCartItemValue({
                discount: 0,
                tax: 0,
                shipping: 0,
            });
            setCashPaymentValue({
                notes: "",
                payment_status: {
                    label: getFormattedMessage(
                        "dashboard.recentSales.paid.label"
                    ),
                    value: 1,
                },
            });
            setCartProductIds("");
        }
    };

    const printPaymentReceiptPdf = () => {
        document.getElementById("printReceipt").click();
    };

    const printRegisterDetails = () => {
        document.getElementById("printRegisterDetailsId").click();
    };

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
    });

    const handleRegisterDetailsPrint = useReactToPrint({
        content: () => registerDetailsRef.current,
    });

    //payment print
    const loadPrintBlock = () => {
        return (
            <div className="d-none">
                <button id="printReceipt" onClick={handlePrint}>
                    Print this out!
                </button>
                <PrintData
                    ref={componentRef}
                    paymentType={paymentValue.payment_type.label}
                    allConfigData={allConfigData}
                    updateProducts={paymentPrint}
                />
            </div>
        );
    };

    //Register details  slip
    const loadRegisterDetailsPrint = () => {
        return (
            <div className="d-none">
                <button
                    id="printRegisterDetailsId"
                    onClick={handleRegisterDetailsPrint}
                >
                    Print this out!
                </button>
                <PrintRegisterDetailsData
                    ref={registerDetailsRef}
                    allConfigData={allConfigData}
                    frontSetting={frontSetting}
                    posAllTodaySaleOverAllReport={posAllTodaySaleOverAllReport}
                    updateProducts={paymentPrint}
                    closeRegisterDetails={closeRegisterDetails}
                />
            </div>
        );
    };

    //payment slip
    const loadPaymentSlip = () => {
        return (
            <div className="d-none">
                <PaymentSlipModal
                    printPaymentReceiptPdf={printPaymentReceiptPdf}
                    setPaymentValue={setPaymentValue}
                    setModalShowPaymentSlip={setModalShowPaymentSlip}
                    settings={settings}
                    frontSetting={frontSetting}
                    modalShowPaymentSlip={modalShowPaymentSlip}
                    allConfigData={allConfigData}
                    paymentDetails={paymentDetails}
                    updateProducts={paymentPrint}
                    paymentType={paymentValue.payment_type.label}
                    paymentTypeDefaultValue={paymentTypeDefaultValue}
                />
            </div>
        );
    };
    const [isDetails, setIsDetails] = useState(null);
    const [lgShow, setLgShow] = useState(false);
    const [holdShow, setHoldShow] = useState(false);

    const onClickDetailsModel = (isDetails = null) => {
        setLgShow(true);
    };

    const onClickHoldModel = (isDetails = null) => {
        setHoldShow(true);
    };

    const handleClickCloseRegister = () => {
        dispatch(getAllRegisterDetailsAction());
        setShowCloseDetailsModal(true);
    };

    const handleCloseRegisterDetails = (data) => {
        if (data.cash_in_hand_while_closing.toString().trim()?.length === 0) {
            dispatch(
                addToast({
                    text: getFormattedMessage(
                        "pos.cclose-register.enter-total-cash.message"
                    ),
                    type: toastType.ERROR,
                })
            );
        } else {
            setShowCloseDetailsModal(false);
            dispatch(closeRegisterAction(data, navigate));
        }
    };

    const [activeTab, setActiveTab] = useState("info");
    const [showHelp, setShowHelp] = useState(false);
    const [showReturn, setShowReturn] = useState(false);
    const permissions = useSelector((state) => state.config);
    const [selectedCartId, setSelectedCartId] = useState(null);
    const [externalSearch, setExternalSearch] = useState(null);

    const {
        openPaymentModel,
        resetPaymentModel,
        holdPaymentModel,
        confirmationModals,
    } = usePosCartActions({
        updateProducts,
        setCashPayment,
        cartItemValue,
        grandTotal,
        subTotal,
        setCartItemValue,
        setUpdateProducts,
        holdListId,
        setHoldListValue,
        selectedCustomerOption,
        selectedOption,
        cashPaymentValue,
        setUpdateHoldList,
    });

    const selectedCartItem = updateProducts.find(
        (item) => item.id === selectedCartId
    );
    const optionLabel = (option) =>
        Array.isArray(option) ? option[0]?.label : option?.label;
    const currencySymbol =
        frontSetting.value && frontSetting.value.currency_symbol;
    const money = (value) =>
        currencySymbolHandling(allConfigData, currencySymbol, value || 0);
    const cashierName =
        localStorage.getItem(Tokens.UPDATED_FIRST_NAME) &&
        localStorage.getItem(Tokens.UPDATED_LAST_NAME)
            ? `${localStorage.getItem(Tokens.UPDATED_FIRST_NAME)} ${localStorage.getItem(Tokens.UPDATED_LAST_NAME)}`
            : `${localStorage.getItem(Tokens.FIRST_NAME) || ""} ${localStorage.getItem(Tokens.LAST_NAME) || ""}`.trim();
    const companyName =
        frontSetting.value && frontSetting.value.company_name;

    // ---------- customer-facing display (second monitor) ----------
    const customers = useSelector((state) => state.customers);
    const displayChannelRef = useRef(null);
    const displayStateRef = useRef(null);
    const displayLookupRef = useRef({});
    const pendingPaidRef = useRef(null);

    const displayState = {
        items: updateProducts.map((item) => {
            const unit = calculateProductCost(item);
            return {
                name: item.name,
                code: item.code,
                qty: Number(item.quantity),
                unitPrice: money(unit.toFixed(2)),
                subTotal: money((unit * item.quantity).toFixed(2)),
            };
        }),
        totals: {
            items: totalQty || 0,
            subtotal: money(Number(subTotal || 0).toFixed(2)),
            discount: money(Number(cartItemValue.discount || 0).toFixed(2)),
            tax: money(Number(taxTotal || 0).toFixed(2)),
            shipping: money(Number(cartItemValue.shipping || 0).toFixed(2)),
            grandTotal: money(grandTotal),
            discountRaw: Number(cartItemValue.discount || 0),
            taxRaw: Number(taxTotal || 0),
            shippingRaw: Number(cartItemValue.shipping || 0),
            grandTotalRaw: Number(grandTotal),
        },
        currency: currencySymbol || "",
        company: {
            name: companyName || "",
            logo: (frontSetting.value && frontSetting.value.logo) || "",
        },
        customer:
            selectedCustomerOption &&
            Number(
                Array.isArray(selectedCustomerOption)
                    ? selectedCustomerOption[0]?.value
                    : selectedCustomerOption.value
            ) !== Number(settings.attributes && settings.attributes.default_customer)
                ? { name: optionLabel(selectedCustomerOption) }
                : null,
    };
    displayStateRef.current = displayState;
    displayLookupRef.current = {
        customers,
        defaultCustomerId: settings.attributes && settings.attributes.default_customer,
    };
    const displayStateJson = JSON.stringify(displayState);

    useEffect(() => {
        dispatch(fetchAllCustomer());
        const channel = createDisplayChannel();
        if (!channel) return undefined;
        displayChannelRef.current = channel;
        channel.onmessage = ({ data }) => {
            if (!data) return;
            if (data.type === DisplayMessage.HELLO) {
                channel.postMessage({
                    type: DisplayMessage.STATE,
                    payload: displayStateRef.current,
                });
            } else if (data.type === DisplayMessage.PHONE) {
                const phone = String(data.payload || "");
                const { customers: list, defaultCustomerId } =
                    displayLookupRef.current;
                const customer = phoneKey(phone)
                    ? findCustomerByPhone(list, phone, defaultCustomerId)
                    : null;
                if (customer) {
                    setSelectedCustomerOption({
                        value: Number(customer.id),
                        label: customer.attributes.name,
                    });
                    channel.postMessage({
                        type: DisplayMessage.CUSTOMER_RESULT,
                        payload: { found: true, name: customer.attributes.name },
                    });
                } else {
                    channel.postMessage({
                        type: DisplayMessage.CUSTOMER_RESULT,
                        payload: { found: false },
                    });
                    dispatch(
                        addToast({
                            text: (
                                <FormattedMessage
                                    id="pos-display.cashier.not-registered"
                                    values={{ phone }}
                                />
                            ),
                            type: toastType.WARNING,
                        })
                    );
                }
            }
        };
        return () => {
            channel.close();
            displayChannelRef.current = null;
        };
    }, []);

    useEffect(() => {
        const channel = displayChannelRef.current;
        if (channel) {
            channel.postMessage({
                type: DisplayMessage.STATE,
                payload: displayStateRef.current,
            });
        }
    }, [displayStateJson]);

    useEffect(() => {
        const channel = displayChannelRef.current;
        if (channel && pendingPaidRef.current) {
            channel.postMessage({
                type: DisplayMessage.PAID,
                payload: pendingPaidRef.current,
            });
        }
        pendingPaidRef.current = null;
    }, [paymentDetails]);

    const showWarning = (key) =>
        dispatch(
            addToast({
                text: getFormattedMessage(key),
                type: toastType.WARNING,
            })
        );

    const focusScanInput = () => {
        const input = document.querySelector('input[data-test="search-input"]');
        input && input.focus();
    };

    const onChangeSelectedItem = () => {
        if (selectedCartItem) {
            onClickUpdateItemInCart(selectedCartItem);
        } else {
            showWarning("pos-touch.select-item.message");
        }
    };

    const onKeypadSetQty = (value) => {
        if (!selectedCartItem) {
            showWarning("pos-touch.select-item.message");
            return;
        }
        const qty = Number(value);
        if (!qty || qty <= 0) return;
        const stock = posAllProducts
            .filter((product) => product.id === selectedCartItem.id)
            .map((product) => product.attributes.stock.quantity)[0];
        if (stock < qty) {
            dispatch(
                addToast({
                    text: getFormattedMessage("pos.product-quantity-error.message"),
                    type: toastType.ERROR,
                })
            );
        }
        setUpdateProducts((products) =>
            products.map((item) =>
                item.id === selectedCartItem.id
                    ? { ...item, quantity: stock < qty ? stock : qty }
                    : item
            )
        );
    };

    const tabs = [
        { key: "info", label: "pos-touch.tab.info", icon: <BsInfoCircleFill /> },
        { key: "offers", label: "pos-touch.tab.offers", icon: <FaBarcode /> },
        { key: "customer", label: "pos-touch.tab.customer", icon: <BsPersonPlusFill /> },
        { key: "keypad", label: "pos-touch.tab.keypad", icon: <BsGrid3X3GapFill /> },
        { key: "stream", label: "pos-touch.tab.stream", icon: <FaListUl /> },
    ];

    return (
        <div className="pos-screen xs-pos">
            <TabTitle title="POS" />
            <TopProgressBar />
            {loadPrintBlock()}
            {loadPaymentSlip()}
            {loadRegisterDetailsPrint()}
            <div className="xs-main">
                <section className="xs-left">
                    <nav className="xs-tabs">
                        {tabs.map((tab) => (
                            <button
                                type="button"
                                key={tab.key}
                                className={`xs-tab ${activeTab === tab.key ? "xs-tab--active" : ""}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                <span className="xs-tab__icon">{tab.icon}</span>
                                <span className="xs-tab__label">
                                    {getFormattedMessage(tab.label)}
                                </span>
                            </button>
                        ))}
                    </nav>
                    <div className="xs-panel">
                        {activeTab === "info" && (
                            <div className="xs-info">
                                <h2 className="xs-info__title">
                                    {companyName ? `${companyName} ` : ""}
                                    {getFormattedMessage("pos-touch.info.title")}
                                </h2>
                                <p className="xs-info__text">
                                    {getFormattedMessage("pos-touch.info.line1")}
                                    <br />
                                    {getFormattedMessage("pos-touch.info.line2")}
                                </p>
                                <p className="xs-info__text">
                                    {getFormattedMessage("pos-touch.info.line3")}
                                </p>
                                <p className="xs-info__text xs-info__text--muted">
                                    {getFormattedMessage("pos-touch.shortcuts.label")}
                                </p>
                            </div>
                        )}
                        {activeTab === "offers" && (
                            <CartItemMainCalculation
                                totalQty={totalQty}
                                subTotal={subTotal}
                                grandTotal={grandTotal}
                                cartItemValue={cartItemValue}
                                onChangeCart={onChangeCart}
                                allConfigData={allConfigData}
                                frontSetting={frontSetting}
                                onChangeTaxCart={onChangeTaxCart}
                            />
                        )}
                        {activeTab === "customer" && (
                            <div className="xs-customer">
                                <CustomerDropDown
                                    setSelectedCustomerOption={setSelectedCustomerOption}
                                    selectedCustomerOption={selectedCustomerOption}
                                    customerModel={customerModel}
                                />
                                <WarehouseDropDown
                                    setSelectedOption={setSelectedOption}
                                    selectedOption={selectedOption}
                                />
                            </div>
                        )}
                        {activeTab === "keypad" && (
                            <PosKeypad
                                onEnterItem={(value) =>
                                    setExternalSearch({ value, nonce: Date.now() })
                                }
                                onSetQty={onKeypadSetQty}
                            />
                        )}
                        {(
                            <div className={`right-content xs-stream ${activeTab === "stream" ? "" : "d-none"}`}>
                                <Category
                                    setCategory={setCategory}
                                    brandId={brandId}
                                    selectedOption={selectedOption}
                                />
                                <Brands
                                    categoryId={categoryId}
                                    setBrand={setBrand}
                                    selectedOption={selectedOption}
                                />
                                <Product
                                    cartProducts={updateProducts}
                                    updateCart={addToCarts}
                                    customCart={customCart}
                                    setCartProductIds={setCartProductIds}
                                    cartProductIds={cartProductIds}
                                    settings={settings}
                                    productMsg={productMsg}
                                    selectedOption={selectedOption}
                                />
                            </div>
                        )}
                    </div>
                    <div className="xs-scan">
                        <div className="xs-scan__body">
                            <h3 className="xs-scan__title">
                                {getFormattedMessage("pos-touch.scan.title")}
                            </h3>
                            <ProductSearchbar
                                customCart={customCart}
                                setUpdateProducts={setUpdateProducts}
                                updateProducts={updateProducts}
                                externalSearch={externalSearch}
                            />
                            <p className="xs-scan__hint">
                                {getFormattedMessage("pos-touch.scan.hint")}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="xs-scan__icon"
                            onClick={focusScanInput}
                            aria-label={getFormattedMessage("pos-touch.scan.title")}
                        >
                            <BsUpcScan />
                        </button>
                    </div>
                </section>
                <section className="xs-right">
                    <header className="xs-cart-head">
                        <span className="xs-cart-head__name">
                            {optionLabel(selectedCustomerOption) ||
                                getFormattedMessage("pos-touch.walk-in.label")}
                        </span>
                        <span className="xs-cart-head__badge">
                            {frontSetting.value && frontSetting.value.logo ? (
                                <img src={frontSetting.value.logo} alt="" />
                            ) : (
                                "POS"
                            )}
                        </span>
                    </header>
                    <div className="xs-cart-cols">
                        <span className="xs-cart-cols__trans">
                            {getFormattedMessage("pos-touch.trans.label")}{" "}
                            {holdListId.referenceNumber ||
                                getFormattedMessage("pos-touch.trans.new")}
                        </span>
                        <span className="xs-cart-cols__price">
                            {getFormattedMessage("pos-touch.unit-price.label")}
                        </span>
                        <span className="xs-cart-cols__qty">
                            {getFormattedMessage("pos-touch.qty.label")}
                        </span>
                        <span className="xs-cart-cols__ext">
                            {getFormattedMessage("pos-touch.ext-price.label")}
                        </span>
                    </div>
                    <div className="xs-cart-rows">
                        {updateProducts && updateProducts.length ? (
                            updateProducts.map((updateProduct, index) => (
                                <ProductCartList
                                    singleProduct={updateProduct}
                                    key={index + 1}
                                    index={index}
                                    posAllProducts={posAllProducts}
                                    onClickUpdateItemInCart={onClickUpdateItemInCart}
                                    updatedQty={updatedQty}
                                    updateCost={updateCost}
                                    onDeleteCartItem={onDeleteCartItem}
                                    quantity={quantity}
                                    frontSetting={frontSetting}
                                    newCost={newCost}
                                    allConfigData={allConfigData}
                                    setUpdateProducts={setUpdateProducts}
                                    isSelected={selectedCartId === updateProduct.id}
                                    onSelect={() =>
                                        setSelectedCartId(
                                            selectedCartId === updateProduct.id
                                                ? null
                                                : updateProduct.id
                                        )
                                    }
                                />
                            ))
                        ) : (
                            <div className="xs-cart-empty">
                                {getFormattedMessage("sale.product.table.no-data.label")}
                            </div>
                        )}
                    </div>
                    <div className="xs-cart-totals">
                        <span>
                            {getFormattedMessage("pos-touch.items.label")}{" "}
                            {totalQty ? totalQty : 0}
                        </span>
                        <span>
                            {getFormattedMessage("pos-touch.tax.label")}{" "}
                            {money(taxTotal)}
                        </span>
                        <span>
                            {getFormattedMessage("pos-touch.fees.label")}{" "}
                            {money(cartItemValue.shipping)}
                        </span>
                        <span>
                            {getFormattedMessage("pos-touch.subtotal.label")}{" "}
                            {money(subTotal)}
                        </span>
                    </div>
                    <div className="xs-cart-due">
                        <span className="xs-cart-due__associate">
                            {getFormattedMessage("pos-touch.associate.label")}:{" "}
                            {cashierName}
                        </span>
                        <button
                            type="button"
                            className="xs-cart-due__pay"
                            onClick={openPaymentModel}
                        >
                            {getFormattedMessage("pos-touch.amount-due.label")}{" "}
                            {money(grandTotal)}
                            <FaChevronRight />
                            <kbd className="xs-fn__key xs-fn__key--inline">Alt+S</kbd>
                        </button>
                    </div>
                </section>
            </div>
            <PosFunctionBar
                onCancelSale={resetPaymentModel}
                onHelp={() => setShowHelp(true)}
                onReturnItem={() =>
                    permissions && permissions.includes("manage_sale_return")
                        ? setShowReturn(true)
                        : showWarning("pos-touch.return.no-permission.message")
                }
                onChangeItem={onChangeSelectedItem}
                onAddDiscount={() => setActiveTab("offers")}
                onExtendedTransaction={onClickHoldModel}
                onFindItem={() => {
                    setActiveTab("stream");
                    focusScanInput();
                }}
                onAddTenders={openPaymentModel}
                onCustomerOptions={() => setActiveTab("customer")}
                onSuspendTransaction={holdPaymentModel}
                onRegisterDetails={onClickDetailsModel}
                onCloseRegister={handleClickCloseRegister}
                openCalculator={openCalculator}
                setOpenCalculator={setOpenCalculator}
            />
            <PosStatusBar
                heldCount={holdListData.length ? holdListData.length : 0}
                onHeldClick={onClickHoldModel}
                cashierName={cashierName}
                warehouseName={optionLabel(selectedOption)}
                onKeyboardClick={() => setActiveTab("keypad")}
                onWarehouseClick={() => setActiveTab("customer")}
                onRegisterClick={onClickDetailsModel}
                onHelp={() => setShowHelp(true)}
            />
            {confirmationModals}
            {isOpenCartItemUpdateModel && (
                <ProductDetailsModel
                    openProductDetailModal={openProductDetailModal}
                    productModelId={product.id}
                    onProductUpdateInCart={onProductUpdateInCart}
                    updateCost={updateCost}
                    cartProduct={product}
                    isOpenCartItemUpdateModel={isOpenCartItemUpdateModel}
                    frontSetting={frontSetting}
                />
            )}
            {cashPayment && (
                <CashPaymentModel
                    cashPayment={cashPayment}
                    totalQty={totalQty}
                    cartItemValue={cartItemValue}
                    onChangeInput={onChangeInput}
                    onPaymentStatusChange={onPaymentStatusChange}
                    cashPaymentValue={cashPaymentValue}
                    allConfigData={allConfigData}
                    subTotal={subTotal}
                    onPaymentTypeChange={onPaymentTypeChange}
                    grandTotal={grandTotal}
                    onCashPayment={onCashPayment}
                    taxTotal={taxTotal}
                    handleCashPayment={handleCashPayment}
                    settings={settings}
                    errors={errors}
                    paymentTypeDefaultValue={paymentTypeDefaultValue}
                    paymentTypeFilterOptions={paymentTypeFilterOptions}
                    onChangeReturnChange={onChangeReturnChange}
                    setPaymentValue={setPaymentValue}
                />
            )}
            {lgShow && (
                <RegisterDetailsModel
                    printRegisterDetails={printRegisterDetails}
                    frontSetting={frontSetting}
                    lgShow={lgShow}
                    setLgShow={setLgShow}
                />
            )}
            {holdShow && (
                <HoldListModal
                    setUpdateHoldList={setUpdateHoldList}
                    setCartItemValue={setCartItemValue}
                    setUpdateProducts={setUpdateProducts}
                    updateProduct={updateProducts}
                    printRegisterDetails={printRegisterDetails}
                    frontSetting={frontSetting}
                    holdListData={holdListData}
                    setHold_ref_no={setHold_ref_no}
                    holdShow={holdShow}
                    setHoldShow={setHoldShow}
                    addCart={addToCarts}
                    updateCart={updateCart}
                    setSelectedCustomerOption={setSelectedCustomerOption}
                    setSelectedOption={setSelectedOption}
                />
            )}
            {modalShowCustomer && (
                <CustomerForm
                    show={modalShowCustomer}
                    hide={setModalShowCustomer}
                />
            )}
            <PosHelpModal show={showHelp} onHide={() => setShowHelp(false)} />
            <PosReturnModal show={showReturn} onHide={() => setShowReturn(false)} />
            <PosCloseRegisterDetailsModel
                showCloseDetailsModal={showCloseDetailsModal}
                handleCloseRegisterDetails={handleCloseRegisterDetails}
                setShowCloseDetailsModal={setShowCloseDetailsModal}
            />
        </div>
    );
};

const mapStateToProps = (state) => {
    const {
        posAllProducts,
        frontSetting,
        settings,
        cashPayment,
        allConfigData,
        posAllTodaySaleOverAllReport,
        holdListData,
    } = state;
    return {
        holdListData,
        posAllProducts,
        frontSetting,
        settings,
        paymentDetails: cashPayment,
        customCart: prepareCartArray(posAllProducts),
        allConfigData,
        posAllTodaySaleOverAllReport,
    };
};

export default connect(mapStateToProps, {
    fetchSetting,
    fetchFrontSetting,
    posSearchNameProduct,
    posCashPaymentAction,
    posSearchCodeProduct,
    posAllProduct,
    fetchBrandClickable,
    fetchHoldLists,
})(PosMainPage);
