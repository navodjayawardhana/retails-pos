import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { fetchAttendanceSummary } from "../../../../store/action/hrm/attendanceActions";
import AttendanceMonthView from "../../attendance/AttendanceMonthView";
import { currentMonthString } from "../../attendance/attendanceShared";

const EmployeeAttendanceTab = ({ employee, fetchAttendanceSummary }) => {
    const [month, setMonth] = useState(currentMonthString());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!employee || !employee.id) return;
        setLoading(true);
        fetchAttendanceSummary(employee.id, month)
            .then(setData)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [employee && employee.id, month]);

    return <AttendanceMonthView data={data} month={month} onMonthChange={setMonth} loading={loading} />;
};

export default connect(null, { fetchAttendanceSummary })(EmployeeAttendanceTab);
