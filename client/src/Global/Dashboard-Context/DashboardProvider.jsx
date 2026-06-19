import { createContext, useContext, useState } from "react";

const DashboardContext = createContext();

export function DashboardProvider({ children }) {
  const [dateRange, setDateRange] = useState(null);
  const [onDateRangeChange, setOnDateRangeChange] = useState(false);
  const [location, setLocation] = useState("");
  const [factory, setFactory] = useState(null);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [locationChange, setLocationChange] = useState(false);
  const [onFactoryChange, setOnFactoryChange] = useState(false);
  
  const [tableData, setTableData] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [dates, setDates] = useState([]);

  const [factories, setFactories] = useState([]); 

  const [dashboardRefetch, setDashboardRefetch] = useState(null);



  return (
    <DashboardContext.Provider
      value={{
        dateRange,
        setDateRange,
        location,
        setLocation,
        factory,
        setFactory,
        factories,
        setFactories,
        onDateRangeChange,
        setOnDateRangeChange,
        vehicleNumber,
        setVehicleNumber,
        locationChange,
        setLocationChange,
        onFactoryChange,
        setOnFactoryChange,
        tableData,
        setTableData,
        isFetching,
        setIsFetching,
        dates,
        setDates,
        dashboardRefetch,
        setDashboardRefetch
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  return useContext(DashboardContext);
}