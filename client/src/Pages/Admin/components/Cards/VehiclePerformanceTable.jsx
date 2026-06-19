import { useMemo, useEffect } from "react";
import { Table, Tag, Tooltip } from "antd";
import AdminNavbar from "../../components/../Nav/AdminNavbar.jsx";
import { useDashboard } from "../../../../Global/Dashboard-Context/DashboardProvider.jsx";
import { useQuery } from "@tanstack/react-query";
import api from "../../../../../services/API/Api/api.js";

// Color scale for daily cell heatmap
const getCellColor = (count, max) => {
  if (!count) return { bg: "transparent", text: "#94a3b8" };
  const pct = count / max;
  if (pct >= 0.75) return { bg: "#0d9488", text: "#ffffff" };
  if (pct >= 0.4)  return { bg: "#5eead4", text: "#0f172a" };
  return { bg: "#fca5a5", text: "#0f172a" };
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); // "08 Apr"
};


export default function VehiclePerformanceTable({ activePage }) {
  const {dates, setDates, dateRange, factory, tableData,  setTableData, setIsFetching,} = useDashboard();
  const user = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;

  const fetchVehiclePerformanceTable = async ({vehicleId, period, dateRange, location, factory }) => {
      try {
        setIsFetching(true);
        const response = await api.get("/analytics/vehicle-performance-table", {
          params: {
            vehicleId,
            period,
            startDate: dateRange?.[0]?.toISOString(),
            endDate: dateRange?.[1]?.toISOString(),
            location,
            factory: factory || user.factory?._id,
          }
        });
            setTableData(response.data.tableData);
            setDates(response.data.dates);
        return response.data;
      } catch (error) {
        console.error("C: request failed", error);
        throw error;
      }finally {
        setIsFetching(false);
      }
    };
  
   
  
    const { data: apiResponse, isFetching, refetch } = useQuery({
      queryKey: ["vehicle-performance",  location, dateRange, factory],
      queryFn:  () => fetchVehiclePerformanceTable({ dateRange, location, factory }),
      enabled:  !!factory && !!dateRange && !!location && activePage === "vehiclePerformance", // only fetch when these are set
      staleTime: 2 * 60 * 1000,
    });
  

    useEffect(() => {
      if (refetch ) {
        refetch();
      }
    }, [location, dateRange, factory]);

  const globalMax = useMemo(() => {
    let max = 1;
    tableData.forEach(v =>
      v.dailyTrips.forEach(d => { if (d.tripCount > max) max = d.tripCount; })
    );
    return max;
  }, [tableData]);

  // Fixed columns
  const fixedColumns = [
    {
      title: "Vehicle Number",
      dataIndex: "vehicleNumber",
      key: "vehicleNumber",
      fixed: "left",
      width: 140,
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{val}</div>
          <Tag
            style={{ marginTop: 2, fontSize: 10 }}
            color={row.type === "internal" ? "cyan" : "orange"}
          >
            {row.type?.toUpperCase()}
          </Tag>
        </div>
      ),
    },
    {
      title: "Transporter/Company",
      dataIndex: "transporterName",
      key: "transporterName",
      fixed: "left",
      width: 150,
      render: val => (
        <span style={{ fontSize: 12, color: "#64748b" }}>{val || "—"}</span>
      ),
    },
    {
      title: "Total Trips",
      dataIndex: "totalTrips",
      fixed: "left",
      key: "totalTrips",
      width: 90,
      sorter: (a, b) => a.totalTrips - b.totalTrips,
      defaultSortOrder: "descend",
      render: val => (
        <span style={{ fontWeight: 700, color: "#0d9488", fontSize: 13 }}>{val}</span>
      ),
    },
    {
      title: "Days Active",
      dataIndex: "activeDays",
      key: "activeDays",
      width: 90,
      sorter: (a, b) => a.activeDays - b.activeDays,
      render: val => <span style={{ fontSize: 12 }}>{val}</span>,
    },
    {
      title: "Avg Trips/Day",
      dataIndex: "avgTripsPerDay",
      key: "avgTripsPerDay",
      width: 105,
      sorter: (a, b) => a.avgTripsPerDay - b.avgTripsPerDay,
      render: val => <span style={{ fontSize: 12 }}>{val}</span>,
    },
    
    {
        title: "Plant-to-Plant",
        dataIndex: "p2pTotal",
        key: "p2pTotal",
        width: 110,
        sorter: (a, b) => a.p2pTotal - b.p2pTotal,
        render: val => <span style={{ color: "#6366f1", fontSize: 12 }}>{val} trips</span>,
        },
        {
        title: "Customer Delivery",
        dataIndex: "customerDeliveryTotal",
        key: "customerDeliveryTotal",
        width: 130,
        sorter: (a, b) => a.customerDeliveryTotal - b.customerDeliveryTotal,
        render: val => <span style={{ color: "#ec4899", fontSize: 12 }}>{val} trips</span>,
        },
        {
        title: "From Customer",
        dataIndex: "fromCustomerTotal",
        key: "fromCustomerTotal",
        width: 120,
        sorter: (a, b) => a.fromCustomerTotal - b.fromCustomerTotal,
        render: val => <span style={{ color: "#f97316", fontSize: 12 }}>{val} trips</span>,
        },
  ];

  // Dynamic date columns
  const dateColumns = dates.map(date => ({
    title: (
      <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>
        {formatDate(date)}
      </span>
    ),
    key: date,
    width: 72,
    render: (_, row) => {
      const day = row.dailyTrips.find(d => d.date === date);
      const count = day?.tripCount ?? 0;
      const { bg, text } = getCellColor(count, globalMax);
      return (
        <Tooltip title={`${formatDate(date)}: ${count} trips`}>
          <div
            style={{
              background:   bg,
              color:        text,
              borderRadius: 6,
              textAlign:    "center",
              padding:      "4px 0",
              fontSize:     12,
              fontWeight:   count ? 600 : 400,
              minWidth:     40,
            }}
          >
            {count || "—"}
          </div>
        </Tooltip>
      );
    },
  }));

  const columns = [...fixedColumns, ...dateColumns];



  return (
    <div
      style={{
        background:   "#ffffff",
        borderRadius: 12,
        border:       "1px solid #e2e8f0",
        padding:      "20px 24px",
        fontFamily:   "Inter, sans-serif",
      }}
    >
      <AdminNavbar /> 

      <div style={{ marginBottom: 16, marginTop: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
          Vehicle Performance Table
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
            This table shows the daily trip counts for each vehicle over the selected date range. Cells are color-coded based on the number of trips, with darker colors indicating higher activity.
        </div>
      </div>


      <div
        style={{
            height: "calc(100vh - 220px)", // 120px = navbar + any padding above table
            overflow: "auto",
        }}
        >
        <Table
            rowKey="vehicleId"
            columns={columns}
            dataSource={tableData}
            loading={isFetching}
            scroll={{ x: "max-content" }}   // ← remove y, let the wrapper handle scroll
            sticky={{ offsetHeader: 0 }}
            pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ["10","20","50"] }}
            size="small"
            style={{ fontSize: 12 }}
        />
        </div>
        
    </div>
  );
}