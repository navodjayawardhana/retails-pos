import React, { useEffect, useState } from "react";
import { Image, Modal } from "react-bootstrap-v5";
import DataTable from "react-data-table-component";
import { getFormattedMessage } from "../../shared/sharedMethod";
import EmptyComponent from "../empty-component/EmptyComponent";

const WareHouseDetailsModal = (props) => {

    const { show, productData, setShow } = props;
    const [warehouse, setWarehouse] = useState([]);
    const [product, setProduct] = useState([]);

    useEffect(() => {
        if (show) {
            const warehouse =
                productData &&
                productData.warehouse &&
                productData.warehouse.map((item) => item);
            setWarehouse(warehouse);
            setProduct(productData);
        }
    }, [show]);

    const clearField = () => {
        setShow(false);
    }

    const unitBadge = (productUnit) => {
        if (productUnit === "1") {
            return (
                <span className="badge bg-light-success me-2">
                    <span>{getFormattedMessage("unit.filter.piece.label")}</span>
                </span>
            );
        }
        if (productUnit === "2") {
            return (
                <span className="badge bg-light-primary me-2">
                    <span>{getFormattedMessage("unit.filter.meter.label")}</span>
                </span>
            );
        }
        if (productUnit === "3") {
            return (
                <span className="badge bg-light-warning me-2">
                    <span>{getFormattedMessage("unit.filter.kilogram.label")}</span>
                </span>
            );
        }
        return null;
    };

    const columns = [
        {
            name: getFormattedMessage("dashboard.stockAlert.warehouse.label"),
            selector: (row) => row.name,
        },
        {
            name: getFormattedMessage("dashboard.stockAlert.quantity.label"),
            cell: (row) => (
                <div>
                    <div className="badge bg-light-info me-2">
                        <span>{row.total_quantity}</span>
                    </div>
                    {unitBadge(product.product_unit)}
                </div>
            ),
        },
    ];

    return <Modal show={show} size="xl"
        onHide={clearField}
        keyboard={true}
    >
        <Modal.Header closeButton>
            <Modal.Title>{getFormattedMessage("products.warehouse.title")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <div className="col-md-12">
                <div className="text-center">
                    <Image
                        src={
                            product &&
                            product.barcode_url
                        }
                        alt={
                            product &&
                            product.name
                        }
                        className="product_brcode"
                    />
                    <div className="mt-3">
                        {product &&
                            product.code}
                    </div>
                </div>
            </div>

            <div className="mt-2">
                <div>
                    <DataTable
                        columns={columns}
                        data={warehouse || []}
                        noDataComponent={<EmptyComponent />}
                        pagination={false}
                    />
                </div>
            </div>
        </Modal.Body>
    </Modal>;
}

export default WareHouseDetailsModal;
