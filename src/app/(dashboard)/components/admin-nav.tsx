"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FaProjectDiagram, FaTools } from "react-icons/fa";
import {
  FaBuildingColumns,
  FaCartFlatbed,
  FaChevronRight,
  FaUserShield,
} from "react-icons/fa6";

type MenuItem = {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  children?: MenuItem[];
};

const menuData: MenuItem[] = [
  {
    label: "Orders",
    icon: <FaCartFlatbed />,
    children: [
      { label: "Order List", href: "/dashboard/admin/orders" },
      { label: "Add Order", href: "/dashboard/admin/orders/add-order" },
      { label: "Pending Order", href: "/dashboard/admin/orders/pending" },
      { label: "Complete Order", href: "/dashboard/admin/orders/complete" },
    ],
  },
  {
    label: "Portfolios",
    icon: <FaProjectDiagram />,
    children: [
      { label: "Portfolio List", href: "/dashboard/admin/portfolios" },
      {
        label: "Add Portfolio",
        href: "/dashboard/admin/portfolios/add-portfolio",
      },
      {
        label: "Portfolio Categories",
        children: [
          {
            label: "Categories",
            href: "/dashboard/admin/portfolios/categories",
          },
          {
            label: "Add Category",
            href: "/dashboard/admin/portfolios/categories/add-category",
          },
        ],
      },
    ],
  },
  {
    label: "Services",
    icon: <FaTools />,
    children: [
      { label: "Service List", href: "/dashboard/admin/services" },
      { label: "Add Service", href: "/dashboard/admin/services/add-service" },
      {
        label: "Service Categories",
        children: [
          { label: "Categories", href: "/dashboard/admin/services/categories" },
          {
            label: "Add Category",
            href: "/dashboard/admin/services/categories/add-category",
          },
        ],
      },
    ],
  },
  {
    label: "Users",
    icon: <FaUserShield />,
    children: [
      { label: "User List", href: "/dashboard/admin/users" },
      { label: "Add User", href: "/dashboard/admin/users/add-user" },
    ],
  },
  {
    label: "Accounting",
    icon: <FaBuildingColumns />,
    children: [
      { label: "User List", href: "/dashboard/admin/accounting" },
      { label: "Income", href: "/dashboard/admin/accounting/income" },
    ],
  },
];

function SidebarItem({
  item,
  depth = 0,
  openKeys,
  setOpenKeys,
  pathname,
}: {
  item: MenuItem;
  depth?: number;
  openKeys: string[];
  setOpenKeys: (keys: string[]) => void;
  pathname: string;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isOpen = openKeys.includes(item.label);
  const isActive = item.href && pathname.startsWith(item.href);

  const toggle = () => {
    if (isOpen) {
      setOpenKeys(openKeys.filter((key) => key !== item.label));
    } else {
      setOpenKeys([...openKeys.filter((k) => k !== item.label), item.label]);
    }
  };

  return (
    <li>
      <div
        className={`flex items-center justify-between cursor-pointer px-4 py-2 rounded hover:bg-gray-700 ${
          isActive ? "bg-ws-primary text-white" : ""
        }`}
        onClick={hasChildren ? toggle : undefined}
      >
        <div className="flex items-center gap-2 flex-1">
          {depth === 0 && item.icon}
          {item.href ? (
            <Link href={item.href} className="flex-1">
              {item.label}
            </Link>
          ) : (
            <span className="flex-1">{item.label}</span>
          )}
        </div>
        {hasChildren && (
          <FaChevronRight
            className={`transform transition-transform ${
              isOpen ? "rotate-90" : ""
            }`}
          />
        )}
      </div>
      {hasChildren && isOpen && (
        <ul className={`ml-${depth > 0 ? 4 : 2} pl-3 border-l border-gray-600`}>
          {item.children!.map((child) => (
            <SidebarItem
              key={child.label}
              item={child}
              depth={depth + 1}
              openKeys={openKeys}
              setOpenKeys={setOpenKeys}
              pathname={pathname}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function AdminDashNav() {
  const pathname = usePathname();
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  return (
    <div className="w-full text-white">
      <ul className="space-y-1">
        {menuData.map((item) => (
          <SidebarItem
            key={item.label}
            item={item}
            openKeys={openKeys}
            setOpenKeys={setOpenKeys}
            pathname={pathname}
          />
        ))}
      </ul>
    </div>
  );
}
