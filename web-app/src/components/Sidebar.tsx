import { mdiCogOutline, mdiHistory, mdiHomeOutline, mdiTextBoxSearchOutline, mdiFileChartOutline } from "@mdi/js";
import { Icon } from "@mdi/react";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/logo.svg";
import "./Sidebar.css";

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  // Get whether experimental OCR is enabled
  const [ocrEnabled, setOcrEnabled] = useState(false);

  useEffect(() => {
    // cancelled flag prevents setState from firing after the component unmounts
    let cancelled = false;
    axios.get<{ enabled: boolean }>("./api/experimental/ocr")
      .then((res) => { if (!cancelled) setOcrEnabled(res.data.enabled); })
      .catch((err) => console.error(err));
    return () => { cancelled = true; };
  }, []);

  const menuItems = [
    { name: "home", path: "./", icon: mdiHomeOutline, title: "Home" },
    { name: "adhoc-analysis", path: "./adhoc-analysis", icon: mdiFileChartOutline, title: "Ad-hoc Analysis" },
    { name: "history", path: "./history", icon: mdiHistory, title: "History" },
    { name: "settings", path: "./settings", icon: mdiCogOutline, title: "Settings" },
  ];

  // If OCR is enabled, add the OCR menu item
  if (ocrEnabled) {
    menuItems.push({
      name: "ocr",
      path: "./experimental-ocr",
      icon: mdiTextBoxSearchOutline,
      title: "OCR",
    });
  }

  return (
    <div className={`sidebar min-w-[64px] ${collapsed ? "collapsed" : ""}`}>
      <div className={`sidebar-header ${collapsed ? "collapsed" : ""}`}>
        {!collapsed && (
          <img
            src={logo}
            alt="Logo"
            className="logo w-8 h-8 object-contain flex-shrink-0"
          />
        )}
        <button className="toggle-btn" onClick={toggleSidebar}>
          &#9776;
        </button>
      </div>
      <ul className="menu-items">
        {menuItems.map((item) => {
          // Compare only the last path segment to support reverse-proxy base paths
          const currentPathParts = location.pathname.split("/");
          const itemPathParts = item.path.split("/");
          const currentPathTail = currentPathParts[currentPathParts.length - 1];
          const itemPathTail = itemPathParts[itemPathParts.length - 1];
          return (
            <li
              key={item.name}
              className={currentPathTail === itemPathTail ? "active" : ""}
            >
              <Link
                to={item.path}
                style={{ display: "flex", alignItems: "center" }}
              >
                {/* <Icon path={item.icon} size={1} />
                {!collapsed && <span>&nbsp; {item.title}</span>} */}
                <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                  <Icon path={item.icon} size={1} />
                </div>
                {!collapsed && <span className="ml-2">{item.title}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Sidebar;
