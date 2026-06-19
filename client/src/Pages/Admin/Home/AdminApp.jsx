import { useState, useEffect } from "react";
import AdminDashboard from "../Dashboard/AdminDashboard";
import ManageUsers from "../Pages/Manage-User/ManageUsers";
import ManageFactory from "../Pages/Manage-Factories/ManageFactories";
import AdminLayout from "../../../components/Layouts/Layouts";
import ManageVehicles from "../Pages/Manage-Vehicles/ManageVehicles";
import Settings from "../Pages/Settings/Settings";
import DriverSearchPage from "../components/Cards/DriverSearchPage";
import VehiclePerformanceTable from "../components/Cards/VehiclePerformanceTable";
import { useDashboard, DashboardProvider } from "../../../Global/Dashboard-Context/DashboardProvider";


function ComingSoon({ label }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: 340, textAlign: "center",
    }}>
      <div style={{ fontSize: 44, marginBottom: 16 }}>🚧</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: "0 0 8px" }}>{label}</h2>
      <p style={{ fontSize: 14, color: "#6b7280", maxWidth: 320 }}>
        This section is under active development and will be available soon.
      </p>
    </div>
  );
}

function PageContent({ page, ...props }) {
  const { dates, setDates, tableData, setTableData, isFetching, setIsFetching } = props;
  if (page === "overview")        return <AdminDashboard activePage={page} setDates={setDates} setTableData={setTableData} setIsFetching={setIsFetching} />;
  if (page === "searchDrivers")   return <DriverSearchPage  />;
  if (page === "vehiclePerformance") return <VehiclePerformanceTable activePage={page} dates={dates} tableData={tableData} loading={isFetching} />;
  if (page === "users")           return <ManageUsers activePage="users" />;
  if (page === "factory")         return <ManageFactory activePage="factory" />;
  if (page === "vehicles")        return <ManageVehicles />;
  if (page === "settings")        return <Settings activePage="settings" />;
  return <AdminDashboard />;
}

export default function AdminApp() {
  const [page, setPage] = useState("overview");
  const [user, setUser] = useState(null);

  const [dates, setDates] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    const storedPage = localStorage.getItem("activePage");
    if (storedPage) {
      setPage(storedPage);
    }
  }, []);


  useEffect(() => {
    localStorage.setItem("activePage", page);
  }, [page]);

  return (
    <DashboardProvider>
      <AdminLayout activePage={page} onNavigate={setPage}>
        <PageContent page={page} dates={dates} setDates={setDates} tableData={tableData} setTableData={setTableData} isFetching={isFetching} setIsFetching={setIsFetching} />
      </AdminLayout>
    </DashboardProvider>
  );
}