import React, { useEffect } from 'react';
import { Card, Row } from 'react-bootstrap';
import DataTable from 'react-data-table-component';
import { connect } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import { getFormattedMessage, placeholderText } from '../../shared/sharedMethod';
import { fetchStockAlert } from "../../store/action/stockAlertAction";
import EmptyComponent from "../empty-component/EmptyComponent";

const StockAlert = ( props ) => {
    const { fetchStockAlert, stockAlertDetails } = props

    useEffect( () => {
        fetchStockAlert();
    }, [] );

    const goToDetailScreen = ( productId ) => {
        window.location.href = '/app/products/detail/' + productId;
    };

    const columns = [
        {
            name: getFormattedMessage( "dashboard.stockAlert.code.label" ),
            selector: ( row ) => row.code,
        },
        {
            name: getFormattedMessage( "dashboard.stockAlert.product.label" ),
            selector: ( row ) => row.name,
        },
        {
            name: getFormattedMessage( "dashboard.stockAlert.warehouse.label" ),
            selector: ( row ) => row.stock.warehouse.name,
        },
        {
            name: getFormattedMessage( "dashboard.stockAlert.quantity.label" ),
            cell: ( row ) => (
                <div>
                    <div className='badge bg-light-info me-2'><span>{row.stock.quantity}</span></div>
                    <span className='badge bg-light-success me-2'><span>{row.stock.product_unit_name}</span></span>
                </div>
            ),
        },
        {
            name: getFormattedMessage( "dashboard.stockAlert.alertQuantity.label" ),
            cell: ( row ) => (
                <div>
                    <div className="badge bg-light-danger me-2">{row.stock_alert}</div>
                    <span className='badge bg-light-success me-2'><span>{row.stock.product_unit_name}</span></span>
                </div>
            ),
        },
        {
            name: "",
            right: true,
            cell: ( row ) => (
                <button
                    title={placeholderText( 'globally.view.tooltip.label' )}
                    className='btn text-success px-2 fs-3 border-0'
                    onClick={() => goToDetailScreen( row.id )}
                >
                    <FontAwesomeIcon icon={faEye} />
                </button>
            ),
        },
    ];

    return (
        <div className='pt-6'>
            <Row className='g-4'>
                <div className='col-12'>
                    <Card>
                        <Card.Header className='pb-0 px-10'>
                            <h5 className="mb-0">{getFormattedMessage( "dashboard.stockAlert.title" )}</h5>
                        </Card.Header>
                        <Card.Body className='pt-7 pb-2'>
                            <DataTable
                                columns={columns}
                                data={stockAlertDetails || []}
                                noDataComponent={<EmptyComponent />}
                                pagination
                                paginationPerPage={5}
                                paginationRowsPerPageOptions={[5, 10, 25]}
                            />
                        </Card.Body>
                    </Card>
                </div>
            </Row>
        </div>
    )
}

const mapStateToProps = ( state ) => {
    const { stockAlertDetails } = state;
    return { stockAlertDetails }
};

export default connect( mapStateToProps, { fetchStockAlert } )( StockAlert );
