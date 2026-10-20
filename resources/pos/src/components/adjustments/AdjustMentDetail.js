import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import Modal from 'react-bootstrap/Modal';
import { fetchFrontSetting } from '../../store/action/frontSettingAction';
import { getAdjustmentDetails } from '../../store/action/adjustMentDetailsAction';
import DataTable from 'react-data-table-component';
import moment from 'moment';
import { getFormattedMessage } from '../../shared/sharedMethod';
import EmptyComponent from '../empty-component/EmptyComponent';

const AdjustMentDetail = ( props ) => {
    const { onDetails, lgShow, setLgShow, fetchFrontSetting, adjustmentsDetails, getAdjustmentDetails } = props;

    useEffect( () => {
        fetchFrontSetting()
    }, [] )

    useEffect( () => {
        if ( onDetails !== null ) {
            getAdjustmentDetails( onDetails )
        }
    }, [ onDetails ] )

    const onsetLgShow = () => {
        setLgShow( false )
    }

    return (
        <div>
            <Modal
                size="lg"
                aria-labelledby="example-custom-modal-styling-title"
                show={lgShow}
                onHide={() => onsetLgShow()}
            >
                <Modal.Header closeButton>
                    <Modal.Title id="example-modal-sizes-title-lg">
                        {getFormattedMessage( "adjustments.detail.title" )}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className='mw-100 overflow-auto'>
                        <div className='mx-2'>
                            <DataTable
                                columns={[
                                    {
                                        name: getFormattedMessage( "react-data-table.date.column.label" ),
                                        selector: ( row ) => moment( row.date ).format( 'YYYY-MM-DD' ),
                                    },
                                    {
                                        name: getFormattedMessage( "globally.detail.reference" ),
                                        selector: ( row ) => row.reference_code,
                                    },
                                    {
                                        name: getFormattedMessage( "globally.detail.warehouse" ),
                                        selector: ( row ) => row.warehouse_name,
                                    },
                                ]}
                                data={adjustmentsDetails && adjustmentsDetails.attributes ? [ adjustmentsDetails.attributes ] : []}
                                noDataComponent={<EmptyComponent />}
                                pagination={false}
                            />
                        </div>
                        <div className='mx-2'>
                            <DataTable
                                columns={[
                                    {
                                        name: getFormattedMessage( "globally.detail.product" ),
                                        selector: ( row ) => row.product.name,
                                    },
                                    {
                                        name: getFormattedMessage( "product.product-details.code-product.label" ),
                                        selector: ( row ) => row.product.code,
                                    },
                                    {
                                        name: getFormattedMessage( "dashboard.stockAlert.quantity.label" ),
                                        selector: ( row ) => row.quantity,
                                    },
                                    {
                                        name: getFormattedMessage( "globally.type.label" ),
                                        selector: ( row ) => row.method_type === 1 ? 'Addition' : "Subtraction",
                                    },
                                ]}
                                data={adjustmentsDetails && adjustmentsDetails.attributes ? adjustmentsDetails.attributes.adjustment_items : []}
                                noDataComponent={<EmptyComponent />}
                                pagination={false}
                            />
                        </div>
                    </div>
                </Modal.Body>
            </Modal>
        </div>
    )
};


const mapStateToProps = ( state ) => {
    const { adjustments, adjustmentsDetails, isLoading, frontSetting } = state;
    return { adjustments, adjustmentsDetails, isLoading, frontSetting };
};

export default connect( mapStateToProps, { fetchFrontSetting, getAdjustmentDetails } )( AdjustMentDetail );

