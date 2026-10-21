import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import Select from "react-select";
import { FiPlus, FiSlash } from "react-icons/fi";
import MasterLayout from "../../MasterLayout";
import TabTitle from "../../../shared/tab-title/TabTitle";
import TopProgressBar from "../../../shared/components/loaders/TopProgressBar";
import { getFormattedMessage, placeholderText } from "../../../shared/sharedMethod";
import { fetchMyLeave, cancelMyLeave } from "../../../store/action/hrm/leaveActions";
import ApplyLeaveModal from "./ApplyLeaveModal";
import { LeaveBalanceCards, LeaveRequestTable, yearOptions } from "./leaveShared";

const yearStyles = { container: (base) => ({ ...base, minWidth: 120 }), menuPortal: (base) => ({ ...base, zIndex: 9999 }) };

const MyLeave = ({ fetchMyLeave, cancelMyLeave }) => {
    const years = yearOptions();
    const [year, setYear] = useState(years[1]);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notLinked, setNotLinked] = useState(false);
    const [applyShow, setApplyShow] = useState(false);

    const load = () => {
        setLoading(true);
        fetchMyLeave(year.value)
            .then((result) => {
                setData(result);
                setNotLinked(false);
            })
            .catch(() => setNotLinked(true))
            .finally(() => setLoading(false));
    };

    useEffect(load, [year]);

    const cancel = (id) => cancelMyLeave(id).then(load).catch(() => {});

    return (
        <MasterLayout>
            <TopProgressBar />
            <TabTitle title={placeholderText("hrm.my-leave.title")} />
            {notLinked ? (
                <div className="card">
                    <div className="card-body">
                        <div className="empty-state">
                            <div className="empty-state__text">{getFormattedMessage("hrm.my.not-linked")}</div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="hrm-filter-bar">
                        <Select options={years} styles={yearStyles} menuPortalTarget={document.body} value={year} onChange={setYear} />
                        <div className="hrm-filter-bar__actions">
                            <button type="button" className="btn btn-primary table-toolbar__create" disabled={!data}
                                onClick={() => setApplyShow(true)}>
                                <FiPlus /> {getFormattedMessage("hrm.leave.apply.title")}
                            </button>
                        </div>
                    </div>
                    <div className="card mb-4">
                        <div className="card-body">
                            <h3 className="hrm-section-title">{getFormattedMessage("hrm.leave.balances")}</h3>
                            {loading || !data ? (
                                <div className="empty-state"><div className="empty-state__text">{getFormattedMessage("globally.loading.label")}</div></div>
                            ) : (
                                <LeaveBalanceCards balances={data.balances} />
                            )}
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-body">
                            <h3 className="hrm-section-title">{getFormattedMessage("hrm.leave.my-requests")}</h3>
                            {data && (
                                <LeaveRequestTable
                                    requests={data.requests}
                                    renderActions={(row) =>
                                        row.status === "pending" ? (
                                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => cancel(row.id)}>
                                                <FiSlash /> {getFormattedMessage("hrm.leave.cancel")}
                                            </button>
                                        ) : null
                                    }
                                />
                            )}
                        </div>
                    </div>
                    <ApplyLeaveModal
                        show={applyShow}
                        onHide={() => setApplyShow(false)}
                        onSaved={load}
                        isSelf={true}
                        leaveTypes={data ? data.leave_types.map((t) => ({ ...t })) : []}
                    />
                </>
            )}
        </MasterLayout>
    );
};

export default connect(null, { fetchMyLeave, cancelMyLeave })(MyLeave);
