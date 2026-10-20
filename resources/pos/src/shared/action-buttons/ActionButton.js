import React from 'react';
import {FiEye, FiEdit2, FiTrash2} from 'react-icons/fi';
import {placeholderText} from '../sharedMethod';

const ActionButton = (props) => {
    const {goToEditProduct, item, onClickDeleteModel = true, isDeleteMode = true, isEditMode = true, goToDetailScreen, isViewIcon = false} = props;
    const isProtected = item.name === 'admin' || item.email === 'admin@infy-pos.com';

    return (
        <div className='action-btn-group'>
            {isViewIcon ?
                <button title={placeholderText('globally.view.tooltip.label')}
                        className='action-btn action-btn--view'
                        onClick={(e) => {
                            e.stopPropagation();
                            goToDetailScreen(item.id)
                        }}>
                    <FiEye/>
                </button> : null
            }
            {isProtected || isEditMode === false ? null :
                <button title={placeholderText('globally.edit.tooltip.label')}
                        className='action-btn action-btn--edit'
                        onClick={(e) => {
                            e.stopPropagation();
                            goToEditProduct(item);
                        }}
                >
                    <FiEdit2/>
                </button>
            }
            {isProtected || isDeleteMode === false ? null :
                <button title={placeholderText('globally.delete.tooltip.label')}
                        className='action-btn action-btn--delete'
                        onClick={(e) => {
                            e.stopPropagation();
                            onClickDeleteModel(item);
                        }}
                >
                    <FiTrash2/>
                </button>
            }
        </div>
    )
};
export default ActionButton;
